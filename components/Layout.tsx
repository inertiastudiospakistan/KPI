import React, { useState } from 'react';
import { User } from '../types';

interface LayoutProps {
  user: User;
  onLogout: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

// Defining NavButtonProps separately to ensure type safety and avoid reserved prop name issues
interface NavButtonProps {
  tab: string;
  label: string;
  icon?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
}

// Moved NavButton outside to avoid re-creation on every render and fix prop type mismatch issues in the map function
const NavButton: React.FC<NavButtonProps> = ({ 
  tab, 
  label, 
  icon, 
  activeTab, 
  onTabChange, 
  setIsMobileMenuOpen 
}) => (
  <button 
    onClick={() => {
      onTabChange(tab);
      setIsMobileMenuOpen(false);
    }}
    className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-sm font-bold whitespace-nowrap ${
      activeTab === tab 
        ? 'bg-white text-dragon-red shadow-lg' 
        : 'text-white hover:bg-white/10'
    }`}
  >
    {icon && <span className="text-base">{icon}</span>}
    <span>{label}</span>
  </button>
);

const Layout: React.FC<LayoutProps> = ({ user, onLogout, activeTab, onTabChange, children }) => {
  const isAdmin = user.role === 'admin';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = isAdmin ? [
    { tab: 'dashboard', label: 'Dashboard', icon: '📊' },
    { tab: 'employees', label: 'Employees', icon: '👥' },
    { tab: 'activities', label: 'Monitoring', icon: '🔍' },
    { tab: 'targets', label: 'Targets', icon: '🎯' },
    { tab: 'reports', label: 'Reports', icon: '📈' },
  ] : [
    { tab: 'dashboard', label: 'Home', icon: '🏠' },
    { tab: 'history', label: 'History', icon: '📜' },
    { tab: 'targets', label: 'Targets', icon: '🎯' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <header className="sticky top-0 z-[60] bg-dragon-red text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-inner">
              <span className="text-dragon-red font-black text-lg leading-none">D</span>
            </div>
            <h1 className="text-lg font-black tracking-tighter hidden sm:block">DRAGON LTD</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 mx-4">
            {menuItems.map(item => (
              // Explicitly pass props to NavButton instead of using spread to fix type inference issues with 'key'
              <NavButton 
                key={item.tab} 
                tab={item.tab}
                label={item.label}
                icon={item.icon}
                activeTab={activeTab}
                onTabChange={onTabChange}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
              />
            ))}
          </nav>

          {/* User & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <p className="text-[10px] font-black uppercase opacity-70 tracking-widest">{user.role}</p>
              <p className="text-xs font-bold leading-none">{user.name}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={onLogout}
                className="hidden sm:block px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-black transition-colors uppercase border border-white/20"
              >
                Sign Out
              </button>
              
              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 bg-white/10 rounded-xl"
              >
                {isMobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-red-800 border-t border-red-700 animate-in slide-in-from-top duration-200">
            <div className="px-4 py-4 space-y-2">
              {menuItems.map(item => (
                <button 
                  key={item.tab}
                  onClick={() => {
                    onTabChange(item.tab);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${
                    activeTab === item.tab ? 'bg-white text-dragon-red shadow-lg' : 'text-white'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="pt-4 mt-4 border-t border-red-700 flex flex-col gap-3">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-dragon-red font-black">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold leading-none">{user.name}</p>
                    <p className="text-[10px] uppercase font-black opacity-60 tracking-widest">{user.role}</p>
                  </div>
                </div>
                <button 
                  onClick={onLogout}
                  className="w-full py-4 bg-white text-dragon-red rounded-2xl font-black shadow-lg"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto pb-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;