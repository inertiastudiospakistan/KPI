
import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { auth } from './services/firebase';
import { User, Activity, Target, Role, ActivityType, TargetInterval, RepeatInterval } from './types';
import { db } from './services/db';
import Layout from './components/Layout';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import ActivityForm from './components/ActivityForm';
import ReportView from './components/ReportView';
import EmployeeHistory from './components/EmployeeHistory';
import EmployeeTargets from './components/EmployeeTargets';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [showForm, setShowForm] = useState<{ type: 'farmer' | 'dealer' } | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  // Modals state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    // Handle Auth State
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await db.getUser(firebaseUser.uid);
        if (userData) {
          setCurrentUser(userData);
        } else {
          // Fallback for newly created users that haven't been linked in Firestore yet
          // or for the bootstrap admin
          if (firebaseUser.email === 'admin@dragon.com') {
            const rootAdmin: User = {
              uid: firebaseUser.uid,
              name: 'System Admin',
              email: 'admin@dragon.com',
              role: 'admin',
              active: true,
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            await db.addUser(rootAdmin);
            setCurrentUser(rootAdmin);
          }
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    // Real-time Data Listeners
    const unsubscribeActs = db.subscribeToActivities((acts) => setActivities(acts));
    const unsubscribeUsers = db.subscribeToUsers((usrs) => setUsers(usrs));
    const unsubscribeTargets = db.subscribeToTargets((trgs) => setTargets(trgs));

    setLoading(false);

    return () => {
      unsubscribeAuth();
      unsubscribeActs();
      unsubscribeUsers();
      unsubscribeTargets();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { email, password } = loginData;

    try {
      // 1. Try normal Firebase Auth first
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      // 2. If Auth fails, check for Bootstrap Admin (first time)
      if (email === 'admin@dragon.com' && password === 'aadmin') {
        try {
          const cred = await createUserWithEmailAndPassword(auth, email, password);
          // Firestore update happens in the onAuthStateChanged listener
          setLoading(false);
          return;
        } catch (createErr: any) {
          // If the admin user already exists but password was wrong, we'll fall through to final error
          console.error("Bootstrap admin creation error:", createErr);
        }
      }

      // 3. JIT Provisioning for employees (Check if credentials match Firestore record)
      const dbUser = await db.getUserByEmail(email);
      if (dbUser && dbUser.password === password) {
        try {
          // Found matching record in DB - create Auth account on the fly
          const cred = await createUserWithEmailAndPassword(auth, email, password);

          // Update DB record with the new Auth UID and clear the temp password as requested
          await db.addUser({
            ...dbUser,
            uid: cred.user.uid,
            password: '', // Mandatory: Remove database password once account is provisioned
            updatedAt: Date.now()
          });
          // createUserWithEmailAndPassword auto-triggers onAuthStateChanged
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            setError("Account exists but login failed. Please check your credentials.");
          } else {
            setError("Provisioning error: " + createErr.message);
          }
        }
      } else {
        setError("Invalid credentials. Please contact Administrator.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setActiveTab('dashboard');
  };

  const calculateProgress = (target: Target) => {
    const relevantActivities = activities.filter(a => {
      const aDate = new Date(a.timestamp).toISOString().split('T')[0];
      const isInDateRange = aDate >= target.startDate && aDate <= target.endDate;
      return a.employeeId === target.employeeId && a.type === target.activityType && isInDateRange;
    });
    const count = relevantActivities.length;
    const percentage = Math.min(Math.round((count / target.targetCount) * 100), 100);
    return { count, percentage };
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleApproveReject = async (id: string, approved: boolean) => {
    await db.updateActivityStatus(id, approved);
    if (selectedActivity?.activityId === id) {
      setSelectedActivity(prev => prev ? { ...prev, approved } : null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-dragon-red border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Connecting to Dragon LTD...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-dragon-red rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <span className="text-white font-black text-4xl">D</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tighter">DRAGON LTD</h1>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.3em]">Operational KPI Matrix</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-xl space-y-6 border border-gray-100">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-xl border border-red-100 flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Access Email</label>
              <input
                type="email"
                required
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl focus:ring-2 focus:ring-dragon-red outline-none transition-all font-medium text-sm"
                placeholder="admin@dragon.com"
                value={loginData.email}
                onChange={e => setLoginData({ ...loginData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Security Key</label>
              <input
                type="password"
                required
                className="w-full bg-gray-50 border border-gray-100 p-4 rounded-xl focus:ring-2 focus:ring-dragon-red outline-none transition-all font-medium text-sm"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-dragon-red text-white rounded-xl font-black shadow-lg shadow-red-100 hover:scale-[1.02] active:scale-95 transition-all disabled:bg-gray-400 uppercase tracking-widest text-xs"
            >
              {loading ? 'Authenticating...' : 'Establish Connection'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
            © 2024 Dragon LTD Field Intelligence
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout user={currentUser} onLogout={handleLogout} activeTab={activeTab} onTabChange={setActiveTab}>
      {currentUser.role === 'admin' ? (
        <div className="h-full flex flex-col">
          <div className="flex-grow overflow-y-auto">
            {activeTab === 'dashboard' && <AdminDashboard activities={activities} users={users} onActivityClick={setSelectedActivity} />}
            {activeTab === 'reports' && <ReportView activities={activities} users={users} />}

            {activeTab === 'employees' && (
              <div className="p-6">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">Employee Management</h3>
                    <button
                      onClick={() => { setEditingUser(null); setShowUserModal(true); }}
                      className="bg-dragon-red text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                      Add Employee
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-black">
                        <tr>
                          <th className="p-4">Name</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {users.map(u => (
                          <tr key={u.uid} className="hover:bg-gray-50 text-sm">
                            <td className="p-4 font-semibold">{u.name}</td>
                            <td className="p-4 text-gray-600">{u.email}</td>
                            <td className="p-4 capitalize">{u.role}</td>
                            <td className="p-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {u.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => { setEditingUser(u); setShowUserModal(true); }} className="text-blue-600 font-bold mr-3 text-xs uppercase tracking-widest">Edit</button>
                              <button onClick={async () => { if (confirm('Delete user?')) { await db.deleteUser(u.uid); } }} className="text-red-600 font-bold text-xs uppercase tracking-widest">Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activities' && (
              <div className="p-6">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">Activity Monitoring</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-black">
                        <tr>
                          <th className="p-4">Employee</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Entity</th>
                          <th className="p-4">Time</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activities.map(act => (
                          <tr key={act.activityId} className="hover:bg-gray-50 text-sm cursor-pointer group" onClick={() => setSelectedActivity(act)}>
                            <td className="p-4 font-semibold group-hover:text-dragon-red transition-colors">{act.employeeName}</td>
                            <td className="p-4 capitalize">{act.type}</td>
                            <td className="p-4">
                              <p className="font-bold">{act.personName}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[200px]">{act.address}</p>
                            </td>
                            <td className="p-4 text-xs text-gray-500">{new Date(act.timestamp).toLocaleString()}</td>
                            <td className="p-4">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${act.approved === true ? 'bg-green-100 text-green-700' :
                                act.approved === false ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                {act.approved === true ? 'Approved' : act.approved === false ? 'Rejected' : 'Pending'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedActivity(act); }}
                                  className="text-[10px] font-black uppercase text-gray-400 hover:text-dragon-red transition-colors"
                                >View Details</button>
                                {act.approved === null && (
                                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => handleApproveReject(act.activityId, true)}
                                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                      title="Approve"
                                    >✓</button>
                                    <button
                                      onClick={() => handleApproveReject(act.activityId, false)}
                                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                                      title="Reject"
                                    >✕</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'targets' && (
              <div className="p-6">
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">Target Management</h3>
                    <button
                      onClick={() => { setEditingTarget(null); setShowTargetModal(true); }}
                      className="bg-dragon-red text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                      Add Target
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-black">
                        <tr>
                          <th className="p-4">Employee</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Target</th>
                          <th className="p-4">Interval</th>
                          <th className="p-4">Date Range</th>
                          <th className="p-4">Progress</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {targets.map(t => {
                          const employee = users.find(u => u.uid === t.employeeId);
                          const { count, percentage } = calculateProgress(t);
                          return (
                            <tr key={t.targetId} className="hover:bg-gray-50 text-sm">
                              <td className="p-4 font-semibold">{employee?.name || 'Unknown'}</td>
                              <td className="p-4 capitalize">{t.activityType}</td>
                              <td className="p-4 font-bold">{t.targetCount}</td>
                              <td className="p-4 capitalize">{t.type}</td>
                              <td className="p-4 text-xs text-gray-500">{t.startDate} to {t.endDate}</td>
                              <td className="p-4 min-w-[150px]">
                                <div className="flex items-center gap-3">
                                  <div className="flex-grow h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${getProgressBarColor(percentage)} transition-all duration-500`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-600">{percentage}%</span>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{count} completed</p>
                              </td>
                              <td className="p-4 text-right">
                                <button onClick={() => { setEditingTarget(t); setShowTargetModal(true); }} className="text-blue-600 font-bold mr-3 text-xs uppercase tracking-widest">Edit</button>
                                <button onClick={async () => { if (confirm('Delete target?')) { await db.deleteTarget(t.targetId); } }} className="text-red-600 font-bold text-xs uppercase tracking-widest">Delete</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white min-h-screen">
          {activeTab === 'dashboard' && (
            <EmployeeDashboard
              activities={activities.filter(a => a.employeeId === currentUser.uid)}
              targets={targets.filter(t => t.employeeId === currentUser.uid)}
              onAddActivity={(type) => setShowForm({ type })}
            />
          )}
          {activeTab === 'history' && (
            <EmployeeHistory
              activities={activities.filter(a => a.employeeId === currentUser.uid)}
            />
          )}
          {activeTab === 'targets' && (
            <EmployeeTargets
              targets={targets.filter(t => t.employeeId === currentUser.uid)}
              activities={activities.filter(a => a.employeeId === currentUser.uid)}
            />
          )}

          {showForm && (
            <ActivityForm
              user={currentUser}
              type={showForm.type}
              onCancel={() => setShowForm(null)}
              onSuccess={() => {
                setShowForm(null);
              }}
            />
          )}
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6">{editingUser ? 'Update Profile' : 'Register Field Agent'}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const name = formData.get('name') as string;
              const email = formData.get('email') as string;
              const role = formData.get('role') as Role;
              const active = formData.get('active') === 'on';
              const password = formData.get('password') as string;

              try {
                if (editingUser) {
                  await db.updateUser(editingUser.uid, { name, email, role, active, password });
                } else {
                  const newUser: User = {
                    uid: `temp-${Date.now()}`,
                    name, email, role, active, password,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                  };
                  await db.addUser(newUser);
                }
                setShowUserModal(false);
              } catch (err: any) {
                alert(err.message);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Name</label>
                <input required name="name" defaultValue={editingUser?.name} className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-dragon-red" placeholder="Name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label>
                <input required name="email" type="email" defaultValue={editingUser?.email} className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-dragon-red" placeholder="email@dragon.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
                <input required name="password" type="text" defaultValue={editingUser?.password || 'aadmin'} className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-dragon-red" placeholder="Set default password" />
                <p className="text-[10px] text-gray-400 mt-1 font-bold italic">Min 6 characters. Used for first login.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Role</label>
                <select name="role" defaultValue={editingUser?.role || 'employee'} className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-dragon-red">
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input name="active" type="checkbox" defaultChecked={editingUser?.active ?? true} id="activeCheck" />
                <label htmlFor="activeCheck" className="text-sm font-bold text-gray-600">Account Active</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowUserModal(false)} className="flex-grow py-3 text-gray-500 font-bold border rounded-xl text-xs uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex-grow py-3 bg-dragon-red text-white font-bold rounded-xl text-xs uppercase tracking-widest">{editingUser ? 'Update' : 'Register'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-6">{editingTarget ? 'Edit' : 'Add'} Target</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const employeeId = formData.get('employeeId') as string;
              const activityType = formData.get('activityType') as ActivityType;
              const targetCount = parseInt(formData.get('targetCount') as string);
              const type = formData.get('type') as TargetInterval;
              const repeatInterval = formData.get('repeatInterval') as RepeatInterval;
              const startDate = formData.get('startDate') as string;
              const endDate = formData.get('endDate') as string;

              if (editingTarget) {
                await db.updateTarget(editingTarget.targetId, { employeeId, activityType, targetCount, type, repeatInterval, startDate, endDate });
              } else {
                await db.addTarget({
                  employeeId, activityType, targetCount, type, repeatInterval, startDate, endDate,
                  createdBy: currentUser.uid,
                  createdAt: Date.now()
                });
              }
              setShowTargetModal(false);
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Employee</label>
                <select required name="employeeId" defaultValue={editingTarget?.employeeId} className="w-full border p-3 rounded-xl outline-none focus:ring-2 focus:ring-dragon-red">
                  {users.filter(u => u.role === 'employee').map(u => (
                    <option key={u.uid} value={u.uid}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Activity Type</label>
                  <select name="activityType" defaultValue={editingTarget?.activityType} className="w-full border p-3 rounded-xl">
                    <option value="farmer">Farmer Visit</option>
                    <option value="dealer">Dealer Call</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Target Count</label>
                  <input required name="targetCount" type="number" defaultValue={editingTarget?.targetCount} className="w-full border p-3 rounded-xl" placeholder="10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Interval</label>
                  <select name="type" defaultValue={editingTarget?.type || 'daily'} className="w-full border p-3 rounded-xl">
                    <option value="daily">Daily</option>
                    <option value="repeating">Repeating</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Repeat</label>
                  <select name="repeatInterval" defaultValue={editingTarget?.repeatInterval || 'none'} className="w-full border p-3 rounded-xl">
                    <option value="none">None</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Start Date</label>
                  <input required name="startDate" type="date" defaultValue={editingTarget?.startDate || new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">End Date</label>
                  <input required name="endDate" type="date" defaultValue={editingTarget?.endDate || new Date().toISOString().split('T')[0]} className="w-full border p-3 rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowTargetModal(false)} className="flex-grow py-3 text-gray-500 font-bold border rounded-xl text-xs uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex-grow py-3 bg-dragon-red text-white font-bold rounded-xl text-xs uppercase tracking-widest">{editingTarget ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 flex flex-col max-h-[95vh]">
            <div className="bg-dragon-red p-6 text-white flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                  {selectedActivity.type === 'farmer' ? '👨‍🌾' : '🏪'}
                </div>
                <div>
                  <h3 className="text-xl font-black">{selectedActivity.type === 'farmer' ? 'Farmer Advisory Review' : 'Dealer Call Review'}</h3>
                  <p className="text-[10px] opacity-70 font-bold tracking-[0.2em] uppercase">Ref: {selectedActivity.activityId}</p>
                </div>
              </div>
              <button onClick={() => setSelectedActivity(null)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all">✕</button>
            </div>
            <div className="p-8 overflow-y-auto space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <section>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Employee Information</p>
                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <div className="w-10 h-10 bg-dragon-red/10 rounded-full flex items-center justify-center text-dragon-red font-black">{selectedActivity.employeeName.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-gray-900 leading-tight">{selectedActivity.employeeName}</p>
                        <p className="text-[10px] text-gray-500 font-medium">Recorded at {new Date(selectedActivity.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  </section>
                  <section>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Contact Point</p>
                    <div className="space-y-4 px-1">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Legal Name / Entity</p>
                        <p className="font-black text-gray-800 text-lg">{selectedActivity.personName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Phone</p>
                          <a href={`tel:${selectedActivity.phone}`} className="font-black text-dragon-red hover:underline">{selectedActivity.phone}</a>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Status</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${selectedActivity.approved === true ? 'bg-green-100 text-green-700' : selectedActivity.approved === false ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {selectedActivity.approved === true ? 'Verified' : selectedActivity.approved === false ? 'Rejected' : 'Under Review'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Registered Address</p>
                        <p className="text-sm font-semibold text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl italic">"{selectedActivity.address}"</p>
                      </div>
                    </div>
                  </section>
                </div>
                <div className="space-y-8">
                  <section>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Location Verification</p>
                    <div className="rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm h-48 relative bg-gray-100 group">
                      {selectedActivity.gpsLat && selectedActivity.gpsLng ? (
                        <>
                          <iframe
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            scrolling="no"
                            src={`https://maps.google.com/maps?q=${selectedActivity.gpsLat},${selectedActivity.gpsLng}&t=k&z=17&ie=UTF8&iwloc=&output=embed`}
                            className="w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                          <div className="absolute bottom-3 left-3 flex flex-col pointer-events-none">
                            <span className="text-[9px] font-black text-white/70 uppercase tracking-widest">GPS Coordinates</span>
                            <span className="text-xs font-bold text-white font-mono">{selectedActivity.gpsLat.toFixed(6)}, {selectedActivity.gpsLng.toFixed(6)}</span>
                          </div>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedActivity.gpsLat},${selectedActivity.gpsLng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-900 text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg uppercase tracking-wide transition-all scale-95 group-hover:scale-100"
                          >
                            Open Map ↗
                          </a>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <span className="text-2xl mb-2">📡</span>
                          <span className="text-xs font-bold uppercase tracking-widest">No GPS Data Available</span>
                        </div>
                      )}
                    </div>
                  </section>
                  <section>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Visual Evidence</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedActivity.imageURLs.map((url, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-[4/3] rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm cursor-zoom-in active:scale-95 transition-all"
                          onClick={() => setZoomedImage(url)}
                        >
                          <img src={url} className="w-full h-full object-cover" alt="Evidence" />
                          <div className="absolute inset-0 z-10 bg-transparent group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-gray-900 border border-gray-200 text-[10px] font-black uppercase px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm scale-75 group-hover:scale-100 transition-all">Zoom</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-100 border-t flex gap-4">
              {selectedActivity.approved === null ? (
                <>
                  <button onClick={() => handleApproveReject(selectedActivity.activityId, false)} className="flex-grow py-4 border-2 border-red-500 text-red-500 rounded-2xl font-black uppercase text-xs">Reject Entry</button>
                  <button onClick={() => handleApproveReject(selectedActivity.activityId, true)} className="flex-grow py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs">Approve Entry</button>
                </>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className={`px-8 py-3 rounded-full font-black uppercase tracking-[0.2em] text-sm ${selectedActivity.approved ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-red-100 text-red-700 border-2 border-red-500'}`}>
                    Decision: {selectedActivity.approved ? 'AUTHENTICATED' : 'DISPUTED'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Zoomed Image Overlay */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-2xl transition-all"
          >
            ✕
          </button>
          <img
            src={zoomedImage}
            alt="Full size evidence"
            className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </Layout>
  );
};

export default App;
