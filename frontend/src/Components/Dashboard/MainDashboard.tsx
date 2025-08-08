import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Sidebar, { TabType } from './Sidebar';
import Overview from './Overview';
import WordsManager from './WordsManager';
import LogsViewer from './LogsViewer';
import ChannelsManager from './ChannelsManager';
import RolesManager from './RolesManager';
import SettingsPanel from './SettingsPanel';
import { ArrowLeftIcon, ArrowRightOnRectangleIcon, Bars3Icon,BookOpenIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

interface MainDashboardProps {
  user: User;
  guildId: string;
  onLogout: () => void;
  onBack: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ user, guildId, onLogout, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [guildData, setGuildData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadGuildData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/guild/${guildId}/settings`);
      const data = await response.json();
      if (data.success) {
        setGuildData(data.settings);
      }
    } catch (error) {
      console.error('Error loading guild data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGuildData();
    const newSocket = io('/', { auth: { guildId } });
    newSocket.on('connect', () => {
      console.log('✅ Connected to dashboard');
    });
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, [guildId]);

  // Close mobile menu when tab changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeTab]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <Overview guildId={guildId} socket={socket} />;
      case 'words':
        return <WordsManager guildId={guildId} guildData={guildData} onUpdate={loadGuildData} />;
      case 'logs':
        return <LogsViewer guildId={guildId} />;
      case 'channels':
        return <ChannelsManager guildId={guildId} guildData={guildData} onUpdate={loadGuildData} />;
      case 'roles':
        return <RolesManager guildId={guildId} guildData={guildData} onUpdate={loadGuildData} />;
      case 'settings':
        return <SettingsPanel guildId={guildId} guildData={guildData} onUpdate={loadGuildData} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      
      {/* Main content */}
      <main className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span className="hidden sm:block">Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
              <h2 className="text-lg lg:text-xl font-semibold text-gray-800">Guild Dashboard</h2>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-2 lg:space-x-3">
                {user.avatar ? (
                  <img
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                    alt={user.username}
                    className="w-6 h-6 lg:w-8 lg:h-8 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs lg:text-sm font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium text-gray-700 text-sm lg:text-base hidden sm:block">{user.username}</span>
              </div>
              
              {/* ✅ NEW: Documentation Button */}
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl no-underline"
              >
                <BookOpenIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Documentation</span>

              </a>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 text-sm lg:text-base"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                <span className="hidden sm:block">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 p-4 lg:p-6 overflow-auto">
          {renderContent()}
        </section>
      </main>
    </div>
  );
};

export default MainDashboard;
