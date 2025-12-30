
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, User } from '../types';
import { COLORS } from '../constants';

interface AdminDashboardProps {
  activities: Activity[];
  users: User[];
  onActivityClick: (activity: Activity) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activities, users, onActivityClick }) => {
  const employees = users.filter(u => u.role === 'employee');
  const farmerActivities = activities.filter(a => a.type === 'farmer');
  const dealerActivities = activities.filter(a => a.type === 'dealer');

  const chartData = [
    { name: 'Farmer Visits', count: farmerActivities.length },
    { name: 'Dealer Calls', count: dealerActivities.length },
  ];

  const pieData = [
    { name: 'Approved', value: activities.filter(a => a.approved === true).length },
    { name: 'Pending', value: activities.filter(a => a.approved === null).length },
    { name: 'Rejected', value: activities.filter(a => a.approved === false).length },
  ];

  const PIE_COLORS = [COLORS.dragonRed, '#FFB300', '#374151'];

  return (
    <div className="p-6 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Operational Overview</h2>
          <p className="text-sm text-gray-500">Real-time KPI monitoring and field distribution</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-400 uppercase">Live Status</p>
          <div className="flex items-center gap-2 justify-end">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-gray-600 uppercase">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Field Agents', value: employees.length, color: 'bg-white text-gray-800', icon: '👥' },
          { label: 'Farmer Advisory', value: farmerActivities.length, color: 'bg-dragon-red text-white', icon: '👨‍🌾' },
          { label: 'Dealer Support', value: dealerActivities.length, color: 'bg-dragon-red text-white', icon: '🏪' },
          { label: 'Avg. Accuracy', value: activities.length ? `${Math.round(activities.reduce((acc, curr) => acc + curr.accuracy, 0) / activities.length)}m` : '0m', color: 'bg-white text-gray-800', icon: '📍' }
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl shadow-sm border ${stat.color} relative overflow-hidden group`}>
            <div className="absolute -right-2 -bottom-2 text-6xl opacity-10 transition-transform group-hover:scale-110">{stat.icon}</div>
            <p className="text-xs font-bold uppercase opacity-70 tracking-wider">{stat.label}</p>
            <p className="text-3xl font-black mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Mix Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="text-sm font-bold uppercase text-gray-400 mb-6 tracking-widest">Activity Volume</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill={COLORS.dragonRed} radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Approval Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h3 className="text-sm font-bold uppercase text-gray-400 mb-6 tracking-widest">Quality Control</h3>
          <div className="h-64 flex flex-col items-center justify-center">
            <div className="relative w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black">{activities.length}</span>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Entries</span>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold uppercase">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-gray-500">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Heatmap / Location Simulation */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold uppercase text-gray-400 tracking-widest">Live Tracker</h3>
            <span className="text-[10px] bg-red-50 text-dragon-red px-2 py-1 rounded font-black">SATELLITE LINK ACTIVE</span>
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="h-80 w-full bg-gray-900 rounded-xl relative border border-gray-800 overflow-hidden flex-grow shadow-inner group">
              {/* Grid Lines */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4b5563 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              {/* Radar Sweep Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent animate-[spin_4s_linear_infinite] w-[200%] h-[200%] -top-1/2 -left-1/2 rounded-full origin-center pointer-events-none opacity-20" />

              {/* Dynamic Dots based on Min/Max Normalization */}
              {(() => {
                const validActivities = activities.filter(a => a.gpsLat && a.gpsLng);
                if (validActivities.length === 0) return <div className="absolute inset-0 flex items-center justify-center text-gray-600 font-mono text-xs">NO GPS SIGNALS DETECTED</div>;

                const minLat = Math.min(...validActivities.map(a => a.gpsLat));
                const maxLat = Math.max(...validActivities.map(a => a.gpsLat));
                const minLng = Math.min(...validActivities.map(a => a.gpsLng));
                const maxLng = Math.max(...validActivities.map(a => a.gpsLng));

                return validActivities.map((act, i) => {
                  // Normalize to 10-90% range to avoid edge clipping
                  const latRange = maxLat - minLat || 0.001;
                  const lngRange = maxLng - minLng || 0.001;
                  const y = 90 - ((act.gpsLat - minLat) / latRange) * 80; // Invert Lat for Y axis (North is Up)
                  const x = ((act.gpsLng - minLng) / lngRange) * 80 + 10;

                  return (
                    <div
                      key={`map-${i}`}
                      title={`${act.personName} (${act.gpsLat.toFixed(5)}, ${act.gpsLng.toFixed(5)})`}
                      className="absolute w-3 h-3 -ml-1.5 -mt-1.5 cursor-crosshair group-hover:scale-125 transition-transform"
                      style={{ top: `${y}%`, left: `${x}%` }}
                    >
                      <div className={`w-full h-full rounded-full animate-ping absolute opacity-50 ${act.type === 'farmer' ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <div className={`w-full h-full rounded-full relative border border-white shadow-sm ${act.type === 'farmer' ? 'bg-green-500' : 'bg-blue-500'}`} />
                    </div>
                  );
                });
              })()}

              <div className="absolute bottom-4 left-4 text-[10px] font-mono text-green-500 bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-green-500/30">
                SIGNAL STRENGTH: 98%
              </div>
            </div>

            {/* Recent Coordinates Feed */}
            <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-2">
              <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Recent Signals</h4>
              {activities.slice(0, 5).map(act => (
                <div key={act.activityId} className="bg-gray-50 p-3 rounded-lg border flex items-center justify-between group hover:bg-white hover:shadow-md transition-all cursor-crosshair">
                  <div>
                    <p className="font-bold text-xs text-gray-900 truncate max-w-[120px]">{act.personName}</p>
                    <div className="flex items-center gap-1 font-mono text-[9px] text-gray-500 mt-1">
                      <span className="text-dragon-red">LAT</span> {act.gpsLat.toFixed(4)}
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[9px] text-gray-500">
                      <span className="text-dragon-red">LNG</span> {act.gpsLng.toFixed(4)}
                    </div>
                  </div>
                  <div className="text-[10px] text-right">
                    {act.type === 'farmer' ? '🚜' : '🏢'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase text-gray-400 tracking-widest">Live Activity Feed</h3>
            <button className="text-[10px] text-dragon-red font-black uppercase hover:underline">See Monitoring</button>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto scrollbar-hide">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.activityId}
                  className="p-4 hover:bg-gray-50 flex items-center gap-4 cursor-pointer transition-colors"
                  onClick={() => onActivityClick(activity)}
                >
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-white shadow-sm ${activity.type === 'farmer' ? 'bg-green-600' : 'bg-blue-600'}`}>
                    {activity.type === 'farmer' ? '👨‍🌾' : '🏪'}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="font-bold text-gray-900 truncate text-sm">{activity.employeeName}</p>
                    <p className="text-xs text-gray-500 truncate">Visited {activity.personName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-gray-400 font-bold mb-1">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${activity.approved === true ? 'bg-green-100 text-green-700' :
                        activity.approved === false ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                      }`}>
                      {activity.approved === true ? 'OK' : activity.approved === false ? 'REJ' : 'PEND'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-400 italic text-sm">Waiting for incoming activities...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
