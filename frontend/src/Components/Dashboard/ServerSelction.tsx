import React, { useState, useEffect } from 'react';
import {
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  ServerIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CogIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  permissions: number;
}

interface ServerSelectionProps {
  guilds: Guild[];
  onSelectServer: (guildId: string) => void;
  onLogout: () => void;
}

const ServerSelection: React.FC<ServerSelectionProps> = ({ guilds, onSelectServer, onLogout }) => {
  const [botStatuses, setBotStatuses] = useState<{[key: string]: boolean}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBotStatuses();
  }, [guilds]);

  const checkBotStatuses = async () => {
    const statuses: {[key: string]: boolean} = {};
    for (const guild of guilds) {
      try {
        const response = await fetch(`/api/guild/${guild.id}/bot-status`);
        const data = await response.json();
        statuses[guild.id] = data.bot_in_guild;
      } catch (error) {
        statuses[guild.id] = false;
      }
    }
    setBotStatuses(statuses);
    setLoading(false);
  };

  const getGuildIcon = (guild: Guild) => {
    if (guild.icon) {
      return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
    }
    return null;
  };

  const handleInviteBot = () => {
    const inviteUrl = "https://discord.com/oauth2/authorize?client_id=1351564896826818581&permissions=277293919312&integration_type=0&scope=bot+applications.commands";
    window.open(inviteUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-700 text-xl font-medium">Loading your servers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Custom CSS for gradient transitions */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .gradient-btn-blue {
            background-image: linear-gradient(135deg, #3b82f6, #8b5cf6);
            position: relative;
            overflow: hidden;
            transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          .gradient-btn-blue::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: linear-gradient(135deg, #2563eb, #7c3aed);
            opacity: 0;
            transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          .gradient-btn-blue:hover::before {
            opacity: 1;
          }
          .gradient-btn-blue:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          .gradient-btn-blue > * {
            position: relative;
            z-index: 1;
          }
          
          .gradient-btn-green {
            background-image: linear-gradient(135deg, #10b981, #059669);
            position: relative;
            overflow: hidden;
            transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          .gradient-btn-green::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: linear-gradient(135deg, #047857, #065f46);
            opacity: 0;
            transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          .gradient-btn-green:hover::before {
            opacity: 1;
          }
          .gradient-btn-green:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          }
          .gradient-btn-green > * {
            position: relative;
            z-index: 1;
          }
        `
      }} />

      {/* Floating Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <img 
                src="/logo.png" 
                alt="SwearFilter" 
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center" style={{display: 'none'}}>
                <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">SwearFilter</h1>
                <p className="text-gray-500 font-medium text-sm sm:text-base">Smart Moderation</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center space-x-2 sm:space-x-3 px-3 sm:px-6 py-2 sm:py-3 text-red-600 hover:text-white bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-sm hover:shadow-lg text-sm sm:text-base"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium hidden sm:inline">Sign Out</span>
              <span className="font-medium sm:hidden">Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl mb-6 sm:mb-8 shadow-xl">
            <ServerIcon className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
            Choose Your
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Discord Server
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed px-4">
            Select a server to enhance with SwearFilter's intelligent moderation system
          </p>
        </div>

        {/* Server Grid */}
        {guilds.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {guilds.map((guild) => (
              <div
                key={guild.id}
                className="group bg-white rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-gray-200 hover:scale-105"
              >
                {/* Server Avatar & Status */}
                <div className="flex items-center justify-center mb-6 sm:mb-8">
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-lg overflow-hidden">
                      {getGuildIcon(guild) ? (
                        <img
                          src={getGuildIcon(guild)!}
                          alt={guild.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                          {guild.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* Floating Status Badge */}
                    <div className={`absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-lg border-4 border-white flex items-center justify-center ${
                      botStatuses[guild.id] ? 'bg-green-500' : 'bg-orange-400'
                    }`}>
                      {botStatuses[guild.id] ? (
                        <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      ) : (
                        <ExclamationCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Server Info */}
                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-blue-600 transition-colors duration-300 truncate px-2">
                    {guild.name}
                  </h3>
                  
                  <div className={`inline-flex items-center px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                    botStatuses[guild.id] 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {botStatuses[guild.id] ? (
                      <>
                        <CheckCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Protected
                      </>
                    ) : (
                      <>
                        <ExclamationCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Needs Setup
                      </>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-center mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base px-2">
                  {botStatuses[guild.id] 
                    ? 'SwearFilter is actively keeping your community safe and friendly.'
                    : 'Add SwearFilter to protect your community from harmful content.'
                  }
                </p>

                {/* Action Button */}
                {botStatuses[guild.id] ? (
                  <button
                    onClick={() => onSelectServer(guild.id)}
                    className="w-full gradient-btn-blue text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 sm:space-x-3"
                  >
                    <CogIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="hidden sm:inline">Manage Settings</span>
                    <span className="sm:hidden">Manage</span>
                  </button>
                ) : (
                  <button
                    onClick={handleInviteBot}
                    className="w-full gradient-btn-green text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 sm:space-x-3"
                  >
                    <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="hidden sm:inline">Add SwearFilter</span>
                    <span className="sm:hidden">Add Bot</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 sm:py-20 px-4">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-100 to-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-xl">
              <ServerIcon className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">No Servers Found</h3>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-12 max-w-lg mx-auto leading-relaxed">
              You need administrator permissions in Discord servers to add SwearFilter.
            </p>
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg mx-auto shadow-xl border border-blue-100">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <SparklesIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
              <p className="text-blue-700 font-medium leading-relaxed text-sm sm:text-base">
                <strong>Getting Started:</strong> Make sure you have "Manage Server" permissions, 
                or create your own Discord server to begin using SwearFilter.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 sm:mt-24 py-8 sm:py-12 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-base sm:text-lg">
            © 2025 SwearFilter • Intelligent Discord Moderation
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ServerSelection;