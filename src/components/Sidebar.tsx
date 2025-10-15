import React from 'react';
import { 
  TrendingUp, 
  PieChart, 
  Zap, 
  BarChart3, 
  Settings, 
  LogOut, 
  User,
  Wifi,
  WifiOff 
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  user: any;
  onLogout: () => void;
  connected: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, 
  setActiveView, 
  user, 
  onLogout,
  connected 
}) => {
  const menuItems = [
    { id: 'trading', label: 'Trading', icon: TrendingUp, description: 'Live trading dashboard' },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart, description: 'Track your investments' },
    { id: 'signals', label: 'AI Signals', icon: Zap, description: 'Smart trading signals' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Performance insights' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Account & preferences' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">AI Trading</h2>
            <div className="flex items-center mt-1">
              {connected ? (
                <div className="flex items-center text-green-400">
                  <Wifi className="h-3 w-3 mr-1" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center text-red-400">
                  <WifiOff className="h-3 w-3 mr-1" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full group flex items-center px-4 py-3 text-left rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-green-400/20 to-blue-500/20 text-white border border-green-400/30'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-green-400' : 'text-gray-400 group-hover:text-white'}`} />
              <div className="flex-1">
                <div className={`font-medium ${isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                  {item.label}
                </div>
                <div className={`text-xs ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-gray-700 space-y-2">
        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-700/50">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center px-4 py-3 text-gray-300 hover:text-white hover:bg-red-500/10 rounded-xl transition-all duration-200 group"
        >
          <LogOut className="h-5 w-5 mr-3 text-gray-400 group-hover:text-red-400" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;