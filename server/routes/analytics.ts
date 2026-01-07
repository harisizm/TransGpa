import express, { Request, Response } from 'express';
import Metric from '../models/Metric.js';

const router = express.Router();

// Helper to get date boundaries
const getattr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
};

// @route   GET /api/admin/analytics/uploads
// @desc    Get paginated uploads with filtering/sorting
// @access  Public
router.get('/uploads', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = (req.query.sortBy as string) || 'timestamp';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 1 : -1;
    const search = (req.query.search as string) || '';

    const query: any = { eventType: 'UPLOAD' };

    if (search) {
      query.$or = [
        { 'metadata.fileName': { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Metric.countDocuments(query);
    const uploads = await Metric.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('userId timestamp metadata location');

    res.json({
      data: uploads,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Uploads List Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/admin/analytics/report
// @desc    Get aggregated stats for a specific date range
// @access  Public
router.get('/report', async (req: Request, res: Response) => {
  try {
    const startObj = new Date(req.query.startDate as string);
    const endObj = new Date(req.query.endDate as string);

    // Validate dates
    if (isNaN(startObj.getTime()) || isNaN(endObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    // Adjust end date to include the full day
    const endOfDay = new Date(endObj);
    endOfDay.setHours(23, 59, 59, 999);

    const rangeMatch = {
      timestamp: { $gte: startObj, $lte: endOfDay }
    };

    // 1. Summary Stats
    const totalUploads = await Metric.countDocuments({ ...rangeMatch, eventType: 'UPLOAD' });
    const uniqueUsers = (await Metric.distinct('userId', rangeMatch)).length;

    const parsingStats = await Metric.aggregate([
      { $match: { ...rangeMatch, eventType: { $in: ['PARSE_SUCCESS', 'PARSE_FAIL'] } } },
      { $group: { _id: "$eventType", count: { $sum: 1 } } }
    ]);
    const successCount = parsingStats.find(p => p._id === 'PARSE_SUCCESS')?.count || 0;
    const failCount = parsingStats.find(p => p._id === 'PARSE_FAIL')?.count || 0;
    const successRate = (successCount + failCount) > 0
      ? Math.round((successCount / (successCount + failCount)) * 100)
      : 0;

    // 2. Daily Breakdown
    const dailyStats = await Metric.aggregate([
      { $match: rangeMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          uploads: { $sum: { $cond: [{ $eq: ["$eventType", "UPLOAD"] }, 1, 0] } },
          users: { $addToSet: "$userId" },
          errors: { $sum: { $cond: [{ $eq: ["$eventType", "PARSE_FAIL"] }, 1, 0] } }
        }
      },
      {
        $project: {
          date: "$_id",
          uploads: 1,
          activeUsers: { $size: "$users" },
          errors: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    // 3. Top Locations in Range
    const topLocations = await Metric.aggregate([
      { $match: { ...rangeMatch, "location.country": { $ne: null } } },
      { $group: { _id: "$userId", country: { $first: "$location.country" } } },
      { $group: { _id: "$country", users: { $sum: 1 } } },
      { $sort: { users: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      period: { start: startObj, end: endObj },
      summary: {
        uniqueUsers,
        totalUploads,
        parseSuccessRate: successRate,
        totalErrors: failCount
      },
      daily: dailyStats,
      locations: topLocations
    });
  } catch (error) {
    console.error('Report Generation Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
// @desc    Get detailed analytics for admin dashboard
// @access  Public (should be protected)
router.get('/', async (req: Request, res: Response) => {
  try {
    const todayStart = getattr(0);
    const sevenDaysAgo = getattr(7);
    const thirtyDaysAgo = getattr(30);

    // 1. KPI: Total Users & New Users
    // Since we don't have a Users collection, we estimate 'New Users' by seeing if their first event was recently.
    // This is expensive on huge datasets, but okay for MVP.
    // A better approach for production: upsert a User document on SESSION_START.
    // For now, we'll calculate unique users from Metrics.

    const totalUsers = (await Metric.distinct('userId')).length;

    // DAU (Users active today)
    const activeToday = (await Metric.distinct('userId', { timestamp: { $gte: todayStart } })).length;

    // Uploads Last 7 Days
    const uploads7d = await Metric.countDocuments({
      eventType: 'UPLOAD',
      timestamp: { $gte: sevenDaysAgo }
    });

    // 2. Returning Users (Trusted Calculation: Active on >= 2 distinct days)
    const returningUsersAgg = await Metric.aggregate([
      {
        $group: {
          _id: {
            userId: "$userId",
            day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
          }
        }
      },
      {
        $group: {
          _id: "$_id.userId",
          daysActive: { $sum: 1 }
        }
      },
      { $match: { daysActive: { $gte: 2 } } },
      { $count: "count" }
    ]);
    const returningUsers = returningUsersAgg[0]?.count || 0;

    // 3. Time Series: DAU Trend (Last 30 Days)
    const dauTrend = await Metric.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            userId: "$userId"
          }
        }
      },
      {
        $group: {
          _id: "$_id.day",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 4. Time Series: Uploads & Parsing Health
    const parsingTrend = await Metric.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
          eventType: { $in: ['PARSE_SUCCESS', 'PARSE_FAIL'] }
        }
      },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            status: "$eventType"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.day": 1 } }
    ]);

    // 5. Session Metrics
    // Avg Duration & Uploads per Session
    const sessionAgg = await Metric.aggregate([
      { $match: { sessionId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$sessionId",
          start: { $min: "$timestamp" },
          end: { $max: "$timestamp" },
          uploadCount: {
            $sum: { $cond: [{ $eq: ["$eventType", "UPLOAD"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          duration: { $subtract: ["$end", "$start"] },
          uploadCount: 1
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: "$duration" },
          avgUploads: { $avg: "$uploadCount" }
        }
      }
    ]);

    const sessionStats = sessionAgg[0] || { avgDuration: 0, avgUploads: 0 };

    // 6. Top Locations
    const topCountries = await Metric.aggregate([
      { $match: { "location.country": { $ne: null } } },
      { $group: { _id: "$userId", country: { $first: "$location.country" } } }, // Distinct user's country (approx)
      { $group: { _id: "$country", users: { $sum: 1 } } },
      { $sort: { users: -1 } },
      { $limit: 10 }
    ]);

    // 7. Recent Uploads Table
    const recentUploads = await Metric.find({ eventType: 'UPLOAD' })
      .sort({ timestamp: -1 })
      .limit(20)
      .select('userId timestamp metadata location');

    // 8. File Type Distribution
    const fileTypes = await Metric.aggregate([
      { $match: { eventType: 'UPLOAD' } },
      { $group: { _id: "$metadata.fileType", count: { $sum: 1 } } }
    ]);

    res.json({
      kpi: {
        totalUsers,
        activeToday,
        returningUsers,
        uploads7d,
        avgSessionDurationSeconds: Math.round(sessionStats.avgDuration / 1000),
        avgUploadsPerSession: parseFloat(sessionStats.avgUploads.toFixed(2))
      },
      charts: {
        dau: dauTrend,
        parsing: parsingTrend,
        fileTypes
      },
      tables: {
        recentUploads,
        topCountries
      }
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
