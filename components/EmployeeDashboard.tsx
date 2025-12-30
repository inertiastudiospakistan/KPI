
import React from 'react';
import { Activity, Target } from '../types';

interface EmployeeDashboardProps {
  activities: Activity[];
  targets: Target[];
  onAddActivity: (type: 'farmer' | 'dealer') => void;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ activities, targets, onAddActivity }) => {
  const today = new Date().toISOString().split('T')[0];
  const todayActivities = activities.filter(a => new Date(a.timestamp).toISOString().split('T')[0] === today);
  
  const getProgress = (activityType: 'farmer' | 'dealer') => {
    const target = targets.find(t => t.activityType === activityType);
    if (!target) return null;
    
    const count = activities.filter(a => {
      const aDate = new Date(a.timestamp).toISOString().split('T')[0];
      return a.type === activityType && (target.type === 'daily' ? aDate === today : true);
    }).length;

    const percentage = Math.min(Math.round((count / target.targetCount) * 100), 100);
    return { count, target: target.targetCount, percentage };
  };

  const farmerProgress = getProgress('farmer');
  const dealerProgress = getProgress('dealer');

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-900">My Dashboard</h2>
        <p className="text-gray-500 text-sm">Welcome back, Agent</p>
      </header>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => onAddActivity('farmer')}
          className="bg-dragon-red text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-100 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">👨‍🌾</div>
          <span className="text-sm font-bold">Farmer Visit</span>
        </button>
        <button 
          onClick={() => onAddActivity('dealer')}
          className="bg-dragon-red text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 shadow-lg shadow-red-100 active:scale-95 transition-transform"
        >
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🏪</div>
          <span className="text-sm font-bold">Dealer Call</span>
        </button>
      </div>

      {/* Daily Summary */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Today's Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-red-50 rounded-xl">
            <p className="text-xs font-semibold text-dragon-red uppercase">Farmer</p>
            <p className="text-2xl font-bold">{todayActivities.filter(a => a.type === 'farmer').length}</p>
          </div>
          <div className="p-3 bg-red-50 rounded-xl">
            <p className="text-xs font-semibold text-dragon-red uppercase">Dealer</p>
            <p className="text-2xl font-bold">{todayActivities.filter(a => a.type === 'dealer').length}</p>
          </div>
        </div>
      </div>

      {/* Target Progress */}
      <div className="space-y-4">
        <h3 className="font-bold text-gray-800 px-1">Target Progress</h3>
        
        {farmerProgress ? (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm font-bold text-gray-900">Farmer Advisory</p>
                <p className="text-xs text-gray-500">Target: {farmerProgress.target} visits</p>
              </div>
              <p className="text-lg font-black text-dragon-red">{farmerProgress.percentage}%</p>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  farmerProgress.percentage < 30 ? 'bg-red-500' : 
                  farmerProgress.percentage < 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${farmerProgress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-right mt-1 text-gray-400">{farmerProgress.count} of {farmerProgress.target} completed</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic text-center py-4">No farmer targets assigned.</p>
        )}

        {dealerProgress ? (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm font-bold text-gray-900">Dealer Calls</p>
                <p className="text-xs text-gray-500">Target: {dealerProgress.target} calls</p>
              </div>
              <p className="text-lg font-black text-dragon-red">{dealerProgress.percentage}%</p>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  dealerProgress.percentage < 30 ? 'bg-red-500' : 
                  dealerProgress.percentage < 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${dealerProgress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-right mt-1 text-gray-400">{dealerProgress.count} of {dealerProgress.target} completed</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic text-center py-4">No dealer targets assigned.</p>
        )}
      </div>

      {/* Recent History Shortcut */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Recent Activities</h3>
          <button className="text-xs font-bold text-dragon-red">View All</button>
        </div>
        <div className="divide-y">
          {activities.slice(0, 3).map((act) => (
            <div key={act.activityId} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{act.personName}</p>
                <p className="text-xs text-gray-500">{new Date(act.timestamp).toLocaleDateString()}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                act.approved === true ? 'bg-green-100 text-green-700' :
                act.approved === false ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {act.approved === true ? 'Approve' : act.approved === false ? 'Reject' : 'Pend'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
