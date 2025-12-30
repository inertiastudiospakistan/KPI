
import React from 'react';
import { Target, Activity } from '../types';

interface EmployeeTargetsProps {
  targets: Target[];
  activities: Activity[];
}

const EmployeeTargets: React.FC<EmployeeTargetsProps> = ({ targets, activities }) => {
  const calculateProgress = (target: Target) => {
    const relevantActivities = activities.filter(a => {
      const aDate = new Date(a.timestamp).toISOString().split('T')[0];
      const isInDateRange = aDate >= target.startDate && aDate <= target.endDate;
      return a.type === target.activityType && isInDateRange;
    });
    const count = relevantActivities.length;
    const percentage = Math.min(Math.round((count / target.targetCount) * 100), 100);
    return { count, percentage };
  };

  const getStatusColor = (percentage: number) => {
    if (percentage < 30) return 'text-red-600 bg-red-50';
    if (percentage < 80) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <header>
        <h2 className="text-2xl font-bold text-gray-900">My Targets</h2>
        <p className="text-gray-500 text-sm">Performance metrics and goal tracking</p>
      </header>

      <div className="space-y-4">
        {targets.length > 0 ? (
          targets.map((t) => {
            const { count, percentage } = calculateProgress(t);
            return (
              <div key={t.targetId} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-gray-900 capitalize text-lg">
                      {t.activityType === 'farmer' ? 'Farmer Advisory visits' : 'Dealer calls'}
                    </h4>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                      {t.type} {t.repeatInterval !== 'none' ? `(${t.repeatInterval})` : ''}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-black uppercase ${getStatusColor(percentage)}`}>
                    {percentage >= 100 ? 'Achieved' : 'In Progress'}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="text-2xl font-black text-dragon-red">
                      {count} <span className="text-sm text-gray-300 font-normal">/ {t.targetCount}</span>
                    </p>
                    <p className="text-sm font-black">{percentage}%</p>
                  </div>
                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${getProgressBarColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  <span>Start: {t.startDate}</span>
                  <span>End: {t.endDate}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 bg-white rounded-3xl border border-dashed text-center text-gray-400">
            No active targets assigned to you.
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeTargets;
