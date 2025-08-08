import React, { useState, useEffect } from 'react';
import {
  HashtagIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface Channel {
  id: string;
  name: string;
  type: number;
  position: number;
}

interface ChannelsManagerProps {
  guildId: string;
  guildData?: any;
  onUpdate: () => void;
}

const ChannelsManager: React.FC<ChannelsManagerProps> = ({ guildId, guildData, onUpdate }) => {
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [bypassChannels, setBypassChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadChannels();
  }, [guildId]);

  useEffect(() => {
    if (guildData) {
      setBypassChannels(guildData.bypass_channels || []);
    }
  }, [guildData]);

  const loadChannels = async () => {
    try {
      const response = await fetch(`/api/guild/${guildId}/channels/available`);
      const data = await response.json();
      if (data.success) {
        const textChannels = data.channels.filter((ch: Channel) => ch.type === 0);
        setAvailableChannels(textChannels);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
    setLoading(false);
  };

  const toggleChannel = async (channelId: string) => {
    if (updating) return;
    setUpdating(true);

    const isCurrentlyBypassed = bypassChannels.includes(channelId);

    try {
      const response = await fetch(`/api/guild/${guildId}/channels`, {
        method: isCurrentlyBypassed ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId }),
      });

      const data = await response.json();
      if (data.success) {
        if (isCurrentlyBypassed) {
          setBypassChannels(prev => prev.filter(id => id !== channelId));
        } else {
          setBypassChannels(prev => [...prev, channelId]);
        }
        onUpdate();
      } else {
        alert('Failed to update channel: ' + data.error);
      }
    } catch (error) {
      alert('Error updating channel');
      console.error(error);
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-transparent p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
            <HashtagIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            Channel Management
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Control which channels allow filter bypass
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 shadow-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <InformationCircleIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-800">How Channel Control Works</h3>
              <div className="space-y-2 text-gray-600">
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Green toggle = Filter bypass allowed</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Gray toggle = Filter active</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Channels List */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-white">
            <h2 className="text-2xl font-bold text-gray-800">
              Server Channels 
              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {availableChannels.length}
              </span>
            </h2>
          </div>
          
          <div className="p-6 bg-white">
            <div className="space-y-3">
              {availableChannels.map((channel) => {
                const isBypassed = bypassChannels.includes(channel.id);
                return (
                  <div
                    key={channel.id}
                    onClick={() => !updating && toggleChannel(channel.id)}
                    className={`group relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg ${
                      isBypassed
                        ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-green-100'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md ${
                            isBypassed 
                              ? 'bg-green-100 text-green-600 shadow-green-200' 
                              : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                          }`}>
                            <HashtagIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                              {channel.name}
                            </h3>
                            <p className={`text-sm font-medium ${
                              isBypassed ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {isBypassed ? 'Filter bypassed' : 'Filter active'}
                            </p>
                          </div>
                        </div>

                        <div className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${
                          isBypassed 
                            ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-green-200' 
                            : 'bg-gradient-to-r from-gray-300 to-gray-400 shadow-gray-200'
                        }`}>
                          <div
                            className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${
                              isBypassed ? 'translate-x-7' : 'translate-x-0.5'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Animated background effect */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${
                      isBypassed ? 'bg-green-400' : 'bg-blue-400'
                    }`}></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {updating && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 shadow-2xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium text-gray-800">Updating channels...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelsManager;
