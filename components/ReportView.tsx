
import React, { useState } from 'react';
import { Activity, User } from '../types';
import { getPerformanceInsights } from '../services/gemini';

interface ReportViewProps {
  activities: Activity[];
  users: User[];
}

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { COLORS } from '../constants';

const ReportView: React.FC<ReportViewProps> = ({ activities, users }) => {
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  const employees = users.filter(u => u.role === 'employee');
  const filteredActivities = selectedEmp
    ? activities.filter(a => a.employeeId === selectedEmp)
    : activities;

  const generateInsights = async () => {
    if (!selectedEmp) return;
    setLoadingInsights(true);
    const emp = employees.find(e => e.uid === selectedEmp)!;
    const result = await getPerformanceInsights(emp, filteredActivities);
    setInsights(result || "Insight generation failed.");
    setLoadingInsights(false);
  };

  const exportCSV = () => {
    const headers = ['ID', 'Employee', 'Type', 'Person', 'Address', 'Phone', 'Status', 'Date'];

    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '""';
      const stringValue = String(str);
      // Escape double quotes by doubling them, and wrap entire field in quotes
      return `"${stringValue.replace(/"/g, '""')}"`;
    };

    const rows = filteredActivities.map(a => {
      // Create a fixed format date string: YYYY-MM-DD HH:mm:ss
      const d = new Date(a.timestamp);
      const dateStr = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, '0') + "-" +
        String(d.getDate()).padStart(2, '0') + " " +
        String(d.getHours()).padStart(2, '0') + ":" +
        String(d.getMinutes()).padStart(2, '0') + ":" +
        String(d.getSeconds()).padStart(2, '0');

      return [
        escapeCsv(a.activityId),
        escapeCsv(a.employeeName),
        escapeCsv(a.type),
        escapeCsv(a.personName),
        escapeCsv(a.address),
        escapeCsv(a.phone),
        escapeCsv(a.approved === true ? 'Approved' : a.approved === false ? 'Rejected' : 'Pending'),
        escapeCsv(dateStr)
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.map(h => escapeCsv(h)).join(",") + "\n"
      + rows.join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dragon_report_${selectedEmp || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  // --- Chart Data Preparation ---
  const activitiesByDate = filteredActivities.reduce((acc, curr) => {
    const date = new Date(curr.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!acc[date]) acc[date] = { date, farmer: 0, dealer: 0 };
    if (curr.type === 'farmer') acc[date].farmer++;
    else acc[date].dealer++;
    return acc;
  }, {} as Record<string, any>);
  const lineChartData = Object.values(activitiesByDate).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7); // Last 7 days/entries

  const activitiesByEmp = employees.map(emp => {
    const acts = activities.filter(a => a.employeeId === emp.uid);
    return {
      name: emp.name.split(' ')[0],
      visits: acts.filter(a => a.type === 'farmer').length,
      calls: acts.filter(a => a.type === 'dealer').length,
      total: acts.length
    };
  }).sort((a, b) => b.total - a.total);

  // Stats
  const totalVisits = filteredActivities.filter(a => a.type === 'farmer').length;
  const totalCalls = filteredActivities.filter(a => a.type === 'dealer').length;
  const approvalRate = filteredActivities.length
    ? Math.round((filteredActivities.filter(a => a.approved).length / filteredActivities.length) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Analytics Suite</h2>
          <p className="text-sm font-medium text-gray-500">Performance Metrics & Intelligence</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedEmp('')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${!selectedEmp ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Global View
            </button>
            <select
              value={selectedEmp}
              onChange={e => setSelectedEmp(e.target.value)}
              className={`bg-transparent text-xs font-black uppercase outline-none px-4 py-2 rounded-lg cursor-pointer ${selectedEmp ? 'bg-white shadow-sm text-dragon-red' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <option value="" disabled>Specific Agent</option>
              {employees.map(e => (
                <option key={e.uid} value={e.uid}>{e.name}</option>
              ))}
            </select>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-2" />

          <button
            onClick={exportCSV}
            className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200"
            title="Export CSV"
          >
            📋
          </button>
          <button
            onClick={() => window.print()}
            className="w-10 h-10 flex items-center justify-center bg-dragon-red text-white rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
            title="Print Report"
          >
            🖨️
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-xs font-black uppercase opacity-60 tracking-widest">Total Activities</p>
            <h3 className="text-4xl font-black mt-2">{filteredActivities.length}</h3>
            <div className="mt-4 flex gap-4 text-xs font-bold opacity-80">
              <span>👨‍🌾 {totalVisits} Farmer</span>
              <span>🏪 {totalCalls} Dealer</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-black opacity-10 rounded-full mr-4 mb-4" />
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative group">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Quality Score</p>
          <h3 className={`text-4xl font-black mt-2 ${approvalRate >= 80 ? 'text-green-500' : approvalRate >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
            {approvalRate}%
          </h3>
          <p className="text-xs text-gray-400 font-bold mt-2">Approval Rate</p>
          <div className="absolute right-4 top-4">
            <div className={`w-3 h-3 rounded-full ${approvalRate >= 80 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          </div>
        </div>

        <button
          onClick={generateInsights}
          disabled={!selectedEmp || loadingInsights}
          className="bg-black text-white rounded-2xl p-6 shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-left group overflow-hidden relative"
        >
          <div className="relative z-10">
            <span className="text-2xl mb-2 block">✨</span>
            <h3 className="font-bold text-lg">{loadingInsights ? 'Analyzing Data...' : 'Generate AI Insights'}</h3>
            <p className="text-xs text-gray-400 mt-1">{selectedEmp ? 'Click to analyze agent performance' : 'Select an agent to unlock AI analysis'}</p>
          </div>
          {/* Glossy Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </button>
      </div>

      {insights && (
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500 shadow-inner">
          <h4 className="font-black text-blue-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-widest">
            <span>🤖</span> Strategic Assessment
          </h4>
          <div className="prose prose-sm max-w-none text-blue-900/80 font-medium leading-relaxed">
            {insights.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Activity Volume (7 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', paddingTop: '20px' }} />
                <Line type="monotone" dataKey="farmer" name="Farmer Visits" stroke={COLORS.dragonRed} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="dealer" name="Dealer Calls" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Employee Performance Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Field Force Output</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activitiesByEmp} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                <RechartsTooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', paddingTop: '20px' }} />
                <Bar dataKey="visits" name="Farmer" stackId="a" fill={COLORS.dragonRed} radius={[0, 4, 4, 0]} barSize={20} />
                <Bar dataKey="calls" name="Dealer" stackId="a" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Detailed Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Employee</th>
                <th className="p-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Type</th>
                <th className="p-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Entity</th>
                <th className="p-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Date</th>
                <th className="p-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredActivities.slice(0, 50).map(a => (
                <tr key={a.activityId} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-gray-900">{a.employeeName}</td>
                  <td className="p-4 capitalize text-gray-600">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${a.type === 'farmer' ? 'bg-dragon-red' : 'bg-yellow-500'}`} />
                    {a.type}
                  </td>
                  <td className="p-4 font-medium">{a.personName}</td>
                  <td className="p-4 text-gray-400 font-mono text-xs">{new Date(a.timestamp).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className={`text-[9px] px-2 py-1 rounded-md font-black uppercase tracking-wide ${a.approved === true ? 'bg-green-100 text-green-700' :
                      a.approved === false ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                      {a.approved === true ? 'Approved' : a.approved === false ? 'Rejected' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredActivities.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-400 italic">No activities found for selection.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportView;
