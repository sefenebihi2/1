import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import Sidebar from './Sidebar';
import TradingView from './TradingView';
import Portfolio from './Portfolio';
import Signals from './Signals';
import Analytics from './Analytics';
import Settings from './Settings';
import { Menu, X, Wifi, WifiOff } from 'lucide-react';

type View = 'trading' | 'portfolio' | 'signals' | 'analytics' | 'settings';

const Dashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('trading');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { connected } = useWebSocket();

  // Close sidebar when view changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [activeView]);

  const renderContent = () => {
    switch (activeView) {
      case 'trading':
        return <TradingView />;
      case 'portfolio':
        return <Portfolio />;
      case 'signals':
        return <Signals />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <TradingView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="text-xl font-bold">AI Trading</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {connected ? (
              <div className="flex items-center text-green-400">
                <Wifi className="h-4 w-4 mr-1" />
                <span className="text-xs">Live</span>
              </div>
            ) : (
              <div className="flex items-center text-red-400">
                <WifiOff className="h-4 w-4 mr-1" />
                <span className="text-xs">Offline</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-screen lg:h-auto">
        {/* Sidebar */}
        <div className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            user={user}
            onLogout={logout}
            connected={connected}
          />
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
          {/* Desktop Header */}
          <div className="hidden lg:block bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold capitalize">
                  {activeView === 'trading' ? 'Trading Dashboard' :
                   activeView === 'portfolio' ? 'Portfolio Management' :
                   activeView === 'signals' ? 'AI Signals' :
                   activeView === 'analytics' ? 'Analytics & Reports' :
                   'Settings'}
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  Welcome back, {user?.firstName} {user?.lastName}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {connected ? (
                  <div className="flex items-center text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                    <Wifi className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Live Connection</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-400 bg-red-400/10 px-3 py-1 rounded-full">
                    <WifiOff className="h-4 w-4 mr-2" />
                    <span className="text-sm font-medium">Reconnecting...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-4 lg:p-6 overflow-auto">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;