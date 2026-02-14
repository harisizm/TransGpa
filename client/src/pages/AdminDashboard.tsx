import { useEffect, useState } from 'react';
import { getAdminAnalytics, getPaginatedUploads, getReportData } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, Upload, Activity, Clock, FileText, Download, Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils/cn';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


interface AnalyticsData {
  kpi: {
    totalUsers: number;
    activeToday: number;
    returningUsers: number;
    uploads7d: number;
    avgSessionDurationSeconds: number;
    avgUploadsPerSession: number;
  };
  charts: {
    dau: Array<{ _id: string; count: number }>;
    parsing: Array<{ _id: { day: string; status: string }; count: number }>;
    fileTypes: Array<{ _id: string; count: number }>;
  };
  tables: {
    recentUploads: Array<{
      _id: string;
      userId: string;
      timestamp: string;
      metadata: {
        fileType: string;
        fileName?: string;
        fileSize: number;
        pageCount?: number;
        studentName?: string;
        fatherName?: string;
        studentNo?: string;
        cgpa?: string;
      };
    }>;
  };
}

export const AdminDashboard = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [uploads, setUploads] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Developer / Delete Mode State
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cascadeDelete, setCascadeDelete] = useState(false);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Report State - Moved to top level
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRange, setReportRange] = useState('7d'); // 7d, 30d, all, custom
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('transgpa_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch Uploads when table state changes - Moved hook to top level
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUploads = async () => {
      try {
        const res = await getPaginatedUploads({
          page,
          limit,
          search,
          sortBy: sortField,
          sortOrder
        });
        setUploads(res.data);
        setPagination(res.pagination);
      } catch (err) {
        console.error("Failed to load uploads table", err);
      }
    };
    // Debounce search
    const timer = setTimeout(fetchUploads, 300);
    return () => clearTimeout(timer);
  }, [page, limit, search, sortField, sortOrder, isAuthenticated]);

  // Selection Logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = uploads.map(u => u._id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {

    try {
      setLoading(true);
      const { deleteUploads } = await import('../services/api'); // Dynamic import to avoid circular dep issues if any
      await deleteUploads(Array.from(selectedIds), cascadeDelete);

      // Reset and refresh
      setSelectedIds(new Set());
      setIsDeleteMode(false);
      setCascadeDelete(false); // Reset cascade

      // Force refresh (re-fetch uploads)
      const res = await getPaginatedUploads({ page, limit, search, sortBy: sortField, sortOrder });
      setUploads(res.data);
      setPagination(res.pagination);

      // Refresh analytics too
      const analytics = await getAdminAnalytics();
      setData(analytics);

      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete records. Check console.');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupOrphans = async () => {
    if (!window.confirm("⚠️ CLEANUP ORPHANS\n\nThis will remove ALL data for users who have 0 uploads (e.g., visitors or users whose records you just deleted).\n\nThis will fix your 'Total Users' count.\n\nProceed?")) {
      return;
    }
    try {
      setLoading(true);
      const { cleanupOrphans } = await import('../services/api');
      const res = await cleanupOrphans();
      alert(res.message);
      window.location.reload(); // Hard refresh to update everything
    } catch (err) {
      console.error('Cleanup failed', err);
      alert('Failed to cleanup orphans.');
    } finally {
      setLoading(false);
    }
  };


  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authEmail === import.meta.env.VITE_ADMIN_EMAIL && authPass === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('transgpa_admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('transgpa_admin_auth');
  };

  // Only fetch data if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchData = async () => {
      try {
        const response = await getAdminAnalytics();
        setData(response);
      } catch (err) {
        console.error("Failed to load analytics", err);
        setError("Failed to load analytics data. Ensure backend is running.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Access</h1>
            <p className="text-slate-500 text-sm mt-2">Enter your secured credentials.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={authPass}
                  onChange={e => setAuthPass(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {authError && <p className="text-red-500 text-xs font-medium text-center">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-lg hover:bg-slate-800 transition-transform active:scale-95 shadow-lg shadow-slate-200"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }


  const generateReport = async () => {
    setReportLoading(true);
    try {
      // Determine dates
      const end = new Date();
      let start = new Date();

      if (reportRange === '7d') start.setDate(end.getDate() - 7);
      else if (reportRange === '30d') start.setDate(end.getDate() - 30);
      else if (reportRange === 'month') start = new Date(end.getFullYear(), end.getMonth(), 1);
      else if (reportRange === 'year') start.setFullYear(end.getFullYear() - 1);
      else if (reportRange === 'custom') {
        start = new Date(customDates.start);
        const e = new Date(customDates.end);
        if (!isNaN(e.getTime())) end.setTime(e.getTime());
      }
      // 'all' would be handled by a very old start date
      else if (reportRange === 'all') start = new Date(2020, 0, 1);

      const data = await getReportData(start.toISOString(), end.toISOString());

      // Generate PDF
      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(33, 37, 41);
      doc.text("TransGPA Analytics Report", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(108, 117, 125);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Period: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`, 14, 35);

      doc.setDrawColor(200, 200, 200);
      doc.line(14, 39, 196, 39);

      // Summary
      doc.setFontSize(14);
      doc.setTextColor(33, 37, 41);
      doc.text("Executive Summary", 14, 50);

      const summaryData = [
        ['Total Uploads', data.summary.totalUploads],
        ['Active Users', data.summary.uniqueUsers],
        ['Success Rate', `${data.summary.parseSuccessRate}%`],
        ['Errors', data.summary.totalErrors]
      ];

      autoTable(doc, {
        startY: 55,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 12 }
      });

      // Daily Breakdown
      const dailyY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Daily Activity Breakdown", 14, dailyY);

      const dailyRows = data.daily.map((d: any) => [
        d.date,
        d.uploads,
        d.activeUsers,
        d.errors
      ]);

      autoTable(doc, {
        startY: dailyY + 5,
        head: [['Date', 'Uploads', 'Active Users', 'Errors']],
        body: dailyRows,
        theme: 'striped'
      });

      doc.save(`TransGPA_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowReportModal(false);

    } catch (err) {
      console.error("Failed to generate report", err);
      alert("Failed to generate report. Please check server connection.");
    } finally {
      setReportLoading(false);
    }
  };



  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Loading Trusted Analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data || !data.charts) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-red-100 text-center max-w-md">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Analytics Unavailable</h3>
          <p className="text-slate-500 text-sm mb-6">{error || "Invalid response from server. Check API configuration."}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-sm font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { kpi, charts } = data;

  // Transform Parsing Data for Stacked Bar Chart
  const parsingChartData = charts.parsing.reduce((acc: any[], curr) => {
    const day = curr._id.day;
    const status = curr._id.status;
    const existing = acc.find(item => item.day === day);
    if (existing) {
      existing[status] = curr.count;
    } else {
      acc.push({ day, [status]: curr.count });
    }
    return acc;
  }, []).sort((a: any, b: any) => a.day.localeCompare(b.day));

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Trusted source of truth. Data aggregated from raw events.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white border border-slate-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 font-medium text-sm transition-colors shadow-sm cursor-pointer"
            >
              Logout
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Connection
            </div>
          </div>
        </div>

        {/* Developer Options Section (Red Warning Style) */}
        {isAuthenticated && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
            <div>
              <h3 className="text-red-800 font-bold text-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                Developer Zone
              </h3>
              <p className="text-red-600 text-xs mt-1">Advanced actions. Proceed with caution.</p>
            </div>
            <div className="flex items-center gap-3">
              {isDeleteMode && (
                <span className="text-xs font-bold text-red-700">
                  {selectedIds.size} Selected
                </span>
              )}
              {isDeleteMode && selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                >
                  DELETE SELECTED
                </button>
              )}
              <button
                onClick={() => {
                  setIsDeleteMode(!isDeleteMode);
                  setSelectedIds(new Set()); // Clear selection on toggle
                }}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer",
                  isDeleteMode
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-red-700 border-red-200 hover:bg-red-100"
                )}
              >
                {isDeleteMode ? 'Cancel Delete Mode' : 'Remove Test Records'}
              </button>

              <button
                onClick={handleCleanupOrphans}
                className="px-4 py-2 bg-white border border-orange-200 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors"
                title="Fix stats for deleted users"
              >
                Cleanup Orphans
              </button>
            </div>
          </div>
        )}

        {/* Report Modal */}
        {showReportModal && (
          <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Generate Analytics Report</h3>
                <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time Range</label>
                  <select
                    value={reportRange}
                    onChange={(e) => setReportRange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="month">This Month</option>
                    <option value="year">Past Year</option>
                    <option value="all">All Time</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {reportRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customDates.start}
                        onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customDates.end}
                        onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateReport}
                    disabled={reportLoading}
                    className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium flex justify-center items-center gap-2"
                  >
                    {reportLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Row (Trusted Metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard title="Total Users" value={kpi.totalUsers} icon={<Users className="w-4 h-4 text-blue-600" />} desc="All-time distinct users" />
          <KPICard title="Active Today (DAU)" value={kpi.activeToday} icon={<Activity className="w-4 h-4 text-green-600" />} desc="Users with activity > 0h ago" />
          <KPICard title="Returning Users" value={kpi.returningUsers} icon={<Users className="w-4 h-4 text-indigo-600" />} desc="Active on ≥ 2 distinct days" />
          <KPICard title="Uploads (7d)" value={kpi.uploads7d} icon={<Upload className="w-4 h-4 text-purple-600" />} desc="Last 7 days volume" />
          <KPICard
            title="Avg Sess Duration"
            value={`${Math.floor(kpi.avgSessionDurationSeconds / 60)}m ${kpi.avgSessionDurationSeconds % 60}s`}
            icon={<Clock className="w-4 h-4 text-orange-600" />}
            desc="Mean per session"
          />
          <KPICard title="Avg Uploads/Sess" value={kpi.avgUploadsPerSession} icon={<FileText className="w-4 h-4 text-teal-600" />} desc="Mean uploads per session" />
        </div>


        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* DAU Trend */}
          <ChartContainer title="Daily Active Users (30 Days)" desc="Distinct users per day">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={charts.dau} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Parsing Health */}
          <ChartContainer title="Parsing Success vs Failure (30 Days)" desc="Daily event counts">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={parsingChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="PARSE_SUCCESS" stackId="a" fill="#22c55e" name="Success" radius={[0, 0, 0, 0]} />
                <Bar dataKey="PARSE_FAIL" stackId="a" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Paginated Uploads Table - Full Width */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800">Global Uploads Database</h3>
                <p className="text-xs text-slate-500 mt-1">Searchable archive of all processing events</p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search file name or user ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Pagination Controls Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600">
              <div className="flex items-center gap-6">
                <div className="font-medium text-xs sm:text-sm">
                  Page <span className="text-slate-900 font-bold">{pagination.page}</span> of <span className="text-slate-900 font-bold">{pagination.pages}</span>
                  <span className="text-slate-400 ml-1">({pagination.total} total)</span>
                </div>
                <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-tighter sm:tracking-normal">Show:</label>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[10, 20, 50, 100].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 sm:px-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-slate-700 transition-all shadow-sm text-xs sm:text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1.5 sm:px-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-slate-700 transition-all shadow-sm text-xs sm:text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  {isDeleteMode && (
                    <th className="px-6 py-3 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        onChange={handleSelectAll}
                        checked={uploads.length > 0 && selectedIds.size === uploads.length}
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('metadata.studentName')}>
                    Student {sortField === 'metadata.studentName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('metadata.fatherName')}>
                    Father's Name {sortField === 'metadata.fatherName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('metadata.studentNo')}>
                    ID {sortField === 'metadata.studentNo' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('metadata.fileName')}>
                    File Name {sortField === 'metadata.fileName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('metadata.cgpa')}>
                    CGPA {sortField === 'metadata.cgpa' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('timestamp')}>
                    Time {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uploads.map((upload) => (
                  <tr key={upload._id} className="hover:bg-slate-50/50 transition-colors">
                    {isDeleteMode && (
                      <td className="px-6 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          checked={selectedIds.has(upload._id)}
                          onChange={() => handleSelect(upload._id)}
                        />
                      </td>
                    )}
                    <td className="px-6 py-3 font-medium text-slate-900 text-sm truncate max-w-[120px]" title={upload.metadata?.studentName}>
                      {upload.metadata?.studentName || 'Guest'}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs truncate max-w-[120px]" title={upload.metadata?.fatherName}>
                      {upload.metadata?.fatherName || '-'}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">
                      {upload.metadata?.studentNo || 'N/A'}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs truncate max-w-[150px]" title={upload.metadata?.fileName}>
                      {upload.metadata?.fileName || 'Untitled.pdf'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold",
                        (parseFloat(upload.metadata?.cgpa || '0')) < 2.0 ? "text-red-700 bg-red-50" : "text-green-700 bg-green-50"
                      )}>
                        {upload.metadata?.cgpa || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {new Date(upload.timestamp).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {uploads.length === 0 && (
              <div className="p-12 text-center text-slate-400 text-sm italic">No uploads found matching your filters.</div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 opacity-100 border border-red-100">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete {selectedIds.size} Records?</h3>
            <div className="text-slate-600 text-sm text-center mb-6 space-y-2">
              <p>This will <strong>permanently remove</strong> these records from the global database.</p>
              <p>All associated analytics, charts, and reports will be <span className="text-red-600 font-bold">recalculated immediately</span>.</p>
              <p className="text-xs text-slate-400 mt-2">This action is irreversible.</p>

              <label className="flex items-center justify-center gap-2 mt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cascadeDelete}
                  onChange={(e) => setCascadeDelete(e.target.checked)}
                  className="rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-slate-700 font-medium">Also wipe user history?</span>
              </label>
              {cascadeDelete && <p className="text-[10px] text-red-500 mt-1">This reduces 'Total Users' count.</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-200 transition-transform active:scale-95"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Component Helpers
const KPICard = ({ title, value, icon, desc }: { title: string, value: string | number, icon: any, desc: string }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      <div className="p-1.5 bg-slate-50 rounded-lg">{icon}</div>
    </div>
    <div className="text-2xl font-black text-slate-800">{value}</div>
    <p className="text-[10px] text-slate-400 mt-1 font-medium">{desc}</p>
  </div>
);

const ChartContainer = ({ title, desc, children }: { title: string, desc: string, children: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[380px]">
    <div className="mb-6">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
    <div className="flex-1 w-full relative min-h-0 flex flex-col" style={{ minHeight: 0 }}>
      {children}
    </div>
  </div>
);
