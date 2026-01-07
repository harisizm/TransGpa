import express, { Request, Response } from 'express';
import Metric from '../models/Metric.js';
import axios from 'axios';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

const router = express.Router();

// @route   POST /api/metrics/track
// @desc    Track a new event
// @access  Public
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, eventType, metadata } = req.body;
    let ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';

    // Normalize IP
    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('::ffff:127.0.0.1')) {
      ip = '127.0.0.1';
    }

    // If localhost, try to resolve real public IP for accurate geolocation
    if (ip === '127.0.0.1' || ip === '::1') {
      try {
        const publicIpRes = await axios.get('https://api64.ipify.org?format=json');
        ip = publicIpRes.data.ip;
      } catch (err) {
        console.warn('Could not resolve public IP for localhost, defaulting to local');
      }
    }

    const geo = geoip.lookup(ip);

    const parser = new UAParser(req.headers['user-agent']);
    const uaResult = parser.getResult();

    const newMetric = new Metric({
      userId,
      sessionId,
      eventType,
      metadata,
      deviceInfo: {
        browser: uaResult.browser.name,
        os: uaResult.os.name,
        deviceType: uaResult.device.type || 'desktop',
      },
      location: {
        country: geo?.country || 'Unknown',
        city: geo?.city || 'Unknown',
        ip: ip, // storing IP might be sensitive, consider hashing or omitting if not strictly needed
      },
    });

    await newMetric.save();
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error tracking metric:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/metrics/dashboard
// @desc    Get aggregated data for dashboard
// @access  Public (should be protected in prod)
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // 1. User Metrics
    const totalUsers = (await Metric.distinct('userId')).length;

    // Returning users: Users with sessions on more than 1 distinct day
    // This is computationally expensive on large datasets, simplified here to users with > 1 session event
    const uniqueUserSessionCounts = await Metric.aggregate([
      { $match: { eventType: 'SESSION_START' } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "returningUsers" }
    ]);
    const returningUsers = uniqueUserSessionCounts[0]?.returningUsers || 0;

    const lastActivity = await Metric.findOne().sort({ timestamp: -1 }).select('timestamp');

    // 2. Upload Metrics
    const uploadEvents = await Metric.find({ eventType: 'UPLOAD' });
    const totalUploads = uploadEvents.length;

    const fileTypeStats = await Metric.aggregate([
      { $match: { eventType: 'UPLOAD' } },
      { $group: { _id: "$metadata.fileType", count: { $sum: 1 } } }
    ]);

    const avgFileSize = await Metric.aggregate([
      { $match: { eventType: 'UPLOAD' } },
      { $group: { _id: null, avg: { $avg: "$metadata.fileSize" } } }
    ]);

    const parsingStats = await Metric.aggregate([
      { $match: { eventType: { $in: ['PARSE_SUCCESS', 'PARSE_FAIL'] } } },
      { $group: { _id: "$eventType", count: { $sum: 1 } } }
    ]);

    // 3. Activity Metrics (Graph Data & Time Series)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Helper for daily grouping
    const dailyGroup = {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
      count: { $sum: 1 }
    };

    // Daily Active Users (DAU) - Users who had at least one session on a given day
    const dailyActiveUsers = await Metric.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo }, eventType: 'SESSION_START' } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            userId: "$userId"
          }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Daily Uploads
    const dailyUploads = await Metric.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo }, eventType: 'UPLOAD' } },
      { $group: dailyGroup },
      { $sort: { _id: 1 } }
    ]);

    // Daily Parsing Stats (Success vs Fail) via Facet or just separate aggregations
    // Let's do a simple group by date and status
    const dailyParsing = await Metric.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo }, eventType: { $in: ['PARSE_SUCCESS', 'PARSE_FAIL'] } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            status: "$eventType"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // General Activity (All events)
    const activityGraph = await Metric.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      { $group: dailyGroup },
      { $sort: { _id: 1 } }
    ]);

    // 4. Location Metrics
    const locationStats = await Metric.aggregate([
      { $match: { "location.country": { $ne: null } } },
      { $group: { _id: "$location.country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const deviceStats = await Metric.aggregate([
      { $group: { _id: "$deviceInfo.deviceType", count: { $sum: 1 } } }
    ]);

    res.json({
      userMetrics: {
        totalUsers,
        returningUsers,
        lastActivity: lastActivity?.timestamp,
        dailyActive: dailyActiveUsers
      },
      uploadMetrics: {
        total: totalUploads,
        byType: fileTypeStats,
        avgSize: avgFileSize[0]?.avg || 0,
        parsing: parsingStats,
        dailyUploads: dailyUploads,
        dailyParsing: dailyParsing
      },
      activityMetrics: {
        graph: activityGraph
      },
      locationMetrics: {
        countries: locationStats,
        devices: deviceStats
      }
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
