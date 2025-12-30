
import React, { useState } from 'react';
import { Activity } from '../types';

interface EmployeeHistoryProps {
  activities: Activity[];
}

const EmployeeHistory: React.FC<EmployeeHistoryProps> = ({ activities }) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Activity History</h2>
        <p className="text-gray-500 text-sm">Review your submitted field reports</p>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y">
          {activities.length > 0 ? (
            activities.map((act) => (
              <div 
                key={act.activityId} 
                className="p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-between"
                onClick={() => setSelectedActivity(act)}
              >
                <div className="flex gap-4 items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                    act.type === 'farmer' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {act.type === 'farmer' ? '👨‍🌾' : '🏪'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{act.personName}</p>
                    <p className="text-xs text-gray-500">{new Date(act.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    act.approved === true ? 'bg-green-100 text-green-700' :
                    act.approved === false ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {act.approved === true ? 'Approved' : act.approved === false ? 'Rejected' : 'Pending'}
                  </span>
                  <p className="text-[10px] text-gray-400 font-medium">Click to view details</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-gray-400 italic">No activities recorded yet.</div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div className="p-4 border-b flex justify-between items-center bg-dragon-red text-white">
              <h3 className="font-bold">Activity Details</h3>
              <button onClick={() => setSelectedActivity(null)} className="p-2">✕</button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-square rounded-xl bg-gray-100 overflow-hidden border">
                  {selectedActivity.imageURLs[0] ? (
                    <img src={selectedActivity.imageURLs[0]} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">No Image</div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase">Contact Name</label>
                    <p className="font-bold text-gray-900">{selectedActivity.personName}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase">Phone</label>
                    <p className="font-bold text-gray-900">{selectedActivity.phone}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase">Status</label>
                    <p className={`font-black uppercase text-xs ${
                      selectedActivity.approved === true ? 'text-green-600' :
                      selectedActivity.approved === false ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {selectedActivity.approved === true ? 'Approved' : selectedActivity.approved === false ? 'Rejected' : 'Pending Review'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase">Address</label>
                <p className="text-sm font-medium text-gray-700">{selectedActivity.address}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                <p className="text-xs font-bold text-gray-500">📍 GPS METADATA</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Coordinates</span>
                  <span className="font-mono">{selectedActivity.gpsLat.toFixed(5)}, {selectedActivity.gpsLng.toFixed(5)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Accuracy</span>
                  <span>± {Math.round(selectedActivity.accuracy)} meters</span>
                </div>
              </div>

              <button 
                onClick={() => setSelectedActivity(null)}
                className="w-full py-4 bg-dragon-red text-white rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeHistory;
