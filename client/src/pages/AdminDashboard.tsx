import { useEffect, useState } from 'react';
import { getAdminAnalytics, getPaginatedUploads, getReportData } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Users, Upload, Activity, MapPin, Clock, FileText, Download, Eye, EyeOff } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
      metadata: { fileType: string; fileName?: string; fileSize: number; pageCount?: number };
      location?: { country?: string };
    }>;
    topCountries: Array<{ _id: string; users: number }>;
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
  const [sortField, setSortField] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
          limit: 10,
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
  }, [page, search, sortField, sortOrder, isAuthenticated]);


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

      // Locations
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.text("Top User Locations", 14, finalY);

      const locData = data.locations.map((l: any) => [l._id, l.users]);
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Country', 'Users']],
        body: locData,
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129] }
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

  const { kpi, charts, tables } = data;

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
            <ResponsiveContainer width="100%" height="100%">
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
            <ResponsiveContainer width="100%" height="100%">
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

        {/* Data Tables & Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Paginated Uploads Table */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('userId')}>
                      User ID {sortField === 'userId' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('metadata.fileName')}>
                      File Name {sortField === 'metadata.fileName' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('metadata.fileSize')}>
                      Size/Type {sortField === 'metadata.fileSize' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('timestamp')}>
                      Time {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uploads.map((upload) => (
                    <tr key={upload._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-slate-600 truncate max-w-[100px]" title={upload.userId}>
                        {upload.userId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-800 text-sm truncate max-w-[150px]" title={upload.metadata?.fileName}>
                        {upload.metadata?.fileName || 'Untitled.pdf'}
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-xs text-slate-500">{upload.metadata?.fileType || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">{(upload.metadata?.fileSize / 1024).toFixed(1)} KB</div>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {upload.location?.country || 'Unknown'}
                      </td>
                      {new Date(upload.timestamp).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: true
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {uploads.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">No uploads match your search.</div>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
              <span>Page {pagination.page} of {pagination.pages} ({pagination.total} total)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-3 py-1 border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Top Locations & File Types */}
          <div className="space-y-8">

            {/* Top Countries */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" /> Top Countries
              </h3>
              <div className="space-y-3">
                {tables.topCountries.map((country, idx) => (
                  <div key={country._id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono text-xs w-4">{idx + 1}</span>
                      <span className="font-medium text-slate-700">{country._id || 'Unknown'}</span>
                    </div>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs">{country.users} users</span>
                  </div>
                ))}
                {tables.topCountries.length === 0 && <p className="text-slate-400 text-xs">No location data available.</p>}
              </div>
            </div>

            {/* File Type Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" /> File Distribution
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.fileTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="_id"
                    >
                      {charts.fileTypes.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>

      </div>
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
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-80">
    <div className="mb-6">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
    <div className="flex-1 w-full min-h-0">
      {children}
    </div>
  </div>
);
