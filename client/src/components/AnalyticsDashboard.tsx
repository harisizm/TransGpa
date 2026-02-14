
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Bar,
  BarChart,
  Cell
} from 'recharts';
import type { Semester } from '../lib/pdf-parser';
import { GRADES_ORDER } from '../lib/pdf-parser';
import { calculateSemesterProgressions } from '../lib/gpa-engine';

interface AnalyticsDashboardProps {
  semesters: Semester[];
}

export function AnalyticsDashboard({ semesters }: AnalyticsDashboardProps) {
  const progressions = calculateSemesterProgressions(semesters);

  // Data for Trend Chart & Credit Load
  const trendData = semesters.map((sem, index) => {
    const prog = progressions.find(p => p.semesterId === sem.id);
    // User requested "S1, S2, S3..." to avoid overlapping
    const shortName = `S${index + 1}`;
    return {
      name: shortName,
      fullName: sem.name, // Keep full name for tooltip if needed
      sgpa: sem.sgpa,
      cgpa: prog?.cumulativeCGPA ? parseFloat(prog.cumulativeCGPA) : 0,
      credits: sem.totalCredits
    };
  });

  // Data for Grade Distribution (Bar Chart F -> A)
  const gradeCounts: Record<string, number> = {};
  semesters.forEach(sem => {
    sem.courses.forEach(c => {
      if (c.grade && !['W', 'I'].includes(c.grade)) {
        gradeCounts[c.grade] = (gradeCounts[c.grade] || 0) + 1;
      }
    });
  });

  // Use canonical order, reversed to show Low (F) -> High (A)
  const chartOrder = [...GRADES_ORDER].reverse();
  const gradeDistDataBar = chartOrder
    .map(grade => ({
      name: grade,
      value: gradeCounts[grade] || 0
    }));

  // 3. Seasonal Performance Logic
  const seasons = {
    Spring: { total: 0, count: 0 },
    Fall: { total: 0, count: 0 },
    Summer: { total: 0, count: 0 }
  };

  semesters.forEach(sem => {
    if (sem.name.includes('Spring')) { seasons.Spring.total += sem.sgpa; seasons.Spring.count++; }
    else if (sem.name.includes('Fall')) { seasons.Fall.total += sem.sgpa; seasons.Fall.count++; }
    else if (sem.name.includes('Summer')) { seasons.Summer.total += sem.sgpa; seasons.Summer.count++; }
  });

  const seasonalData = [
    { name: 'Spring', avg: seasons.Spring.count ? parseFloat((seasons.Spring.total / seasons.Spring.count).toFixed(2)) : 0, fill: '#14b8a6' }, // Teal
    { name: 'Fall', avg: seasons.Fall.count ? parseFloat((seasons.Fall.total / seasons.Fall.count).toFixed(2)) : 0, fill: '#f97316' },   // Orange
    { name: 'Summer', avg: seasons.Summer.count ? parseFloat((seasons.Summer.total / seasons.Summer.count).toFixed(2)) : 0, fill: '#eab308' } // Yellow
  ].filter(s => s.avg > 0);

  return (
    <div id="analytics" className="w-full max-w-6xl mx-auto p-4 mt-8 animate-in fade-in duration-700 font-serif">
      <h2 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-200 pb-2 uppercase tracking-wide">
        Performance Analytics
      </h2>

      <div className="flex flex-col gap-8">
        {/* 1. GPA Trend Chart */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">GPA Trend ({semesters.length} Semesters)</h3>
          <div className="h-64 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorCgpa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  interval={0}
                  height={40}
                />
                <YAxis
                  domain={[0, 4]}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 1, 2, 3, 4]}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="cgpa"
                  name="CGPA"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCgpa)"
                />
                <Line
                  type="monotone"
                  dataKey="sgpa"
                  name="SGPA"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#94a3b8' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Grade Distribution Bar Chart (F -> A) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Grade Distribution (F to A)</h3>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={gradeDistDataBar} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="value" name="Count" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={30}>
                  {gradeDistDataBar.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'F' ? '#ef4444' : entry.name.startsWith('A') ? '#22c55e' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Seasonal Performance Analysis */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Seasonal Performance (Avg SGPA)</h3>
          <p className="text-[10px] text-slate-400 mb-2">Compare your performance across Fall, Spring, and Summer sessions</p>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={seasonalData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 4]}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 1, 2, 3, 4]}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar dataKey="avg" name="Avg SGPA" radius={[4, 4, 0, 0]} barSize={40}>
                  {seasonalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Semester Credit Load */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Semester Credit Load</h3>
          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ fontSize: '12px' }} />
                <Bar dataKey="credits" name="Credits" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
