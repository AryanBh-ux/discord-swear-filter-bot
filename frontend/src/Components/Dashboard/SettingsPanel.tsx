import React, { useState, useEffect, useRef } from 'react';
import { Switch } from '@headlessui/react';
import {
  Cog6ToothIcon as CogIcon,
  ShieldCheckIcon,
  HashtagIcon,
  ClockIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  BeakerIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  PlayIcon,
  PauseIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

interface SettingsPanelProps {
  guildId: string;
  guildData: any;
  onUpdate: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ guildId, guildData, onUpdate }) => {
  // UPDATED STATE - New action system
  const [settings, setSettings] = useState({
    enabled: true,
    action_type: 'delete_only',
    timeout_after_swears: 3,
    timeout_minutes: 5,
    kick_after_swears: 5,
    log_channel_id: null as string | null,
  });

  const [availableChannels, setAvailableChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Dropdown states
  const [actionDropdownOpen, setActionDropdownOpen] = useState(false);
  const [channelDropdownOpen, setChannelDropdownOpen] = useState(false);
  
  // Refs for outside click detection
  const actionDropdownRef = useRef<HTMLDivElement>(null);
  const channelDropdownRef = useRef<HTMLDivElement>(null);

  // UPDATED useEffect - Load new settings structure
  useEffect(() => {
    if (guildData) {
      setSettings({
        enabled: guildData.enabled ?? true,
        action_type: guildData.action_type ?? 'delete_only',
        timeout_after_swears: guildData.timeout_after_swears ?? 3,
        timeout_minutes: guildData.timeout_minutes ?? 5,
        kick_after_swears: guildData.kick_after_swears ?? 5,
        log_channel_id: guildData.log_channel_id ? String(guildData.log_channel_id) : null,
      });
      loadAvailableChannels();
    }
  }, [guildData, guildId]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        setActionDropdownOpen(false);
      }
      if (channelDropdownRef.current && !channelDropdownRef.current.contains(event.target as Node)) {
        setChannelDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // EXACT BACKEND - Your original loadAvailableChannels
  const loadAvailableChannels = async () => {
    try {
      const response = await fetch(`/api/guild/${guildId}/channels/available`);
      const data = await response.json();
      if (data.success) {
        const textChannels = data.channels.filter((ch: any) => ch.type === 0);
        setAvailableChannels(textChannels);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  // UPDATED saveSettings - Handle new structure
  const saveSettings = async () => {
    setSaving(true);
    try {
      console.log('Submitting settings:', settings);
      
      const response = await fetch(`/api/guild/${guildId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          log_channel_id: settings.log_channel_id || null
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLastSaved(new Date());
        
        setTimeout(async () => {
          try {
            const refreshResponse = await fetch(`/api/guild/${guildId}/settings`);
            const refreshData = await refreshResponse.json();
            if (refreshData.success) {
              setSettings(prev => ({
                ...prev,
                log_channel_id: refreshData.settings.log_channel_id ? 
                  String(refreshData.settings.log_channel_id) : null
              }));
              console.log('Settings refreshed with log_channel_id:', refreshData.settings.log_channel_id);
            }
          } catch (refreshError) {
            console.error('Failed to refresh settings:', refreshError);
          }
        }, 500);
        
        onUpdate();
        console.log('Settings saved successfully');
      } else {
        alert('Failed to save settings: ' + data.error);
      }
    } catch (error) {
      alert('Error saving settings');
      console.error(error);
    }
    setSaving(false);
  };

  // EXACT BACKEND - Your original resetToDefaults
  const resetToDefaults = () => {
    const confirmed = confirm('Reset all settings to defaults? This cannot be undone.');
    if (confirmed) {
      setSettings({
        enabled: true,
        action_type: 'delete_only',
        timeout_after_swears: 3,
        timeout_minutes: 5,
        kick_after_swears: 5,
        log_channel_id: null,
      });
    }
  };

  // EXACT BACKEND - Your original testFilter
  const testFilter = async () => {
    const testMessage = prompt('Enter a message to test against the filter:');
    if (!testMessage) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/guild/${guildId}/test-filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: testMessage }),
      });

      const data = await response.json();
      if (data.success) {
        if (data.would_block) {
          alert(`❌ Message would be BLOCKED\nBlocked words: ${data.blocked_words.join(', ')}`);
        } else {
          alert('✅ Message would be ALLOWED');
        }
      }
    } catch (error) {
      alert('Error testing filter');
    }
    setLoading(false);
  };

  // Helper functions for dropdown display
  const getActionDisplay = (action: string) => {
    const actionMap = {
      delete_only: { emoji: '🗑️', text: 'Only Delete' },
      delete_timeout: { emoji: '⏰', text: 'Delete + Timeout' },
      delete_timeout_kick: { emoji: '👢', text: 'Delete + Timeout + Kick' },
    };
    return actionMap[action as keyof typeof actionMap] || { emoji: '❓', text: 'Unknown' };
  };

  const getChannelDisplay = () => {
    if (!settings.log_channel_id) return { emoji: '🚫', text: 'No logging' };
    
    if (!availableChannels || availableChannels.length === 0) {
      return { emoji: '⏳', text: 'Loading channels...' };
    }
    
    const targetId = String(settings.log_channel_id);
    
    interface Channel {
      id: string;
      name: string;
      type: number;
    }
    
    const channels = availableChannels as Channel[];
    
    let channel = channels.find(ch => String(ch.id) === targetId);
    
    if (!channel) {
      console.log('🔍 Exact match failed, trying fuzzy match...');
      
      const targetPrefix = targetId.substring(0, 15);
      channel = channels.find(ch => 
        String(ch.id).substring(0, 15) === targetPrefix
      );
      
      if (channel) {
        console.log(`✅ Fuzzy match found: ${channel.name} (${channel.id} ≈ ${targetId})`);
        
        setTimeout(() => {
          console.log('🔧 Auto-fixing channel ID...');
          setSettings(prev => ({ 
            ...prev, 
            log_channel_id: String(channel!.id)
          }));
        }, 100);
      }
    }
    
    if (channel) {
      return { emoji: '#', text: channel.name };
    }
    
    return { 
      emoji: '⚠️', 
      text: 'Channel not found' 
    };
  };

  const actionOptions = [
    { value: 'delete_only', emoji: '🗑️', text: 'Only Delete', desc: 'Just remove the message' },
    { value: 'delete_timeout', emoji: '⏰', text: 'Delete + Timeout', desc: 'Remove message and timeout repeat offenders' },
    { value: 'delete_timeout_kick', emoji: '👢', text: 'Delete + Timeout + Kick', desc: 'Full escalation for persistent violators' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Floating Header with Status */}
        <div className="relative">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl">
                    <CogIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Bot Settings
                    </h1>
                    <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Configure how SwearFilter moderates your server</p>
                  </div>
                </div>
              </div>
              
              {/* Status Pills */}
              <div className="flex flex-wrap gap-3">
                <div className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-full ${
                  settings.enabled 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                  {settings.enabled ? (
                    <PlayIcon className="h-4 w-4" />
                  ) : (
                    <PauseIcon className="h-4 w-4" />
                  )}
                  <span className="font-medium text-sm">{settings.enabled ? 'Active' : 'Inactive'}</span>
                </div>
                
                {lastSaved && (
                  <div className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 sm:px-4 py-2 rounded-full border border-blue-200">
                    <CheckCircleIcon className="h-4 w-4" />
                    <span className="font-medium text-sm">Saved {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Core Settings */}
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            {/* Master Switch */}
            <div className="group bg-white/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center space-x-3">
                  <ShieldCheckIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Core Settings</h3>
                </div>
                
                {/* Enable Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-4 lg:p-6 bg-white/50 rounded-xl sm:rounded-2xl border border-gray-100">
                  <div className="flex-1">
                    <label className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 block">Enable Filter</label>
                    <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1">Master switch for the entire filter system</p>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
                    className={`${
                      settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                    } relative inline-flex h-6 w-11 sm:h-7 sm:w-12 lg:h-8 lg:w-14 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-200 hover:scale-105`}
                  >
                    <span className="sr-only">Enable filter</span>
                    <span
                      className={`${
                        settings.enabled ? 'translate-x-6 sm:translate-x-6 lg:translate-x-7' : 'translate-x-1'
                      } inline-block h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 transform rounded-full bg-white shadow-lg transition-all duration-200`}
                    />
                  </Switch>
                </div>

                {/* ✅ FIXED ACTION DROPDOWN - OPENS UPWARD */}
                <div className="space-y-4">
                  <label className="block text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Action on Violation</label>
                  <div className="relative" ref={actionDropdownRef}>
                    <button
                      onClick={() => setActionDropdownOpen(!actionDropdownOpen)}
                      className="w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base border border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 bg-white/70 hover:bg-white transition-all duration-200 font-medium hover:scale-[1.01]"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg sm:text-xl">{getActionDisplay(settings.action_type).emoji}</span>
                        <span className="text-gray-900">{getActionDisplay(settings.action_type).text}</span>
                      </div>
                      <ChevronDownIcon className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform duration-200 ${actionDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* ✅ FIXED: DROPDOWN OPENS UPWARD WITH PROPER Z-INDEX */}
                    <div className={`absolute bottom-full left-0 right-0 mb-2 bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-200 shadow-2xl z-[9999] overflow-hidden transition-all duration-300 transform origin-bottom ${
                      actionDropdownOpen 
                        ? 'opacity-100 scale-y-100 translate-y-0' 
                        : 'opacity-0 scale-y-95 translate-y-2 pointer-events-none'
                    }`}>
                      <div className="max-h-64 overflow-y-auto">
                        {actionOptions.slice().reverse().map((option, index) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSettings(prev => ({ ...prev, action_type: option.value }));
                              setActionDropdownOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 hover:bg-blue-50 transition-all duration-200 group animate-fadeInUp ${
                              settings.action_type === option.value ? 'bg-blue-50 border-r-4 border-blue-400' : ''
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-200">{option.emoji}</span>
                            <div className="flex-1 text-left">
                              <div className="font-semibold text-gray-900 group-hover:text-blue-700 text-sm sm:text-base">{option.text}</div>
                              <div className="text-xs sm:text-sm text-gray-600">{option.desc}</div>
                            </div>
                            {settings.action_type === option.value && <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600">What happens when a violation is detected</p>
                </div>

                {/* DYNAMIC ACTION CONFIGURATION */}
                {(settings.action_type === 'delete_timeout' || settings.action_type === 'delete_timeout_kick') && (
                  <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-yellow-50/50 rounded-xl sm:rounded-2xl border border-yellow-100">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                      <span>Timeout Configuration</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Timeout after swears</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={settings.timeout_after_swears}
                          onChange={(e) => setSettings(prev => ({ ...prev, timeout_after_swears: parseInt(e.target.value) || 3 }))}
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Timeout duration (minutes)</label>
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={settings.timeout_minutes}
                          onChange={(e) => setSettings(prev => ({ ...prev, timeout_minutes: parseInt(e.target.value) || 5 }))}
                          className="w-full px-3 py-2 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {settings.action_type === 'delete_timeout_kick' && (
                  <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-red-50/50 rounded-xl sm:rounded-2xl border border-red-100">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      <span>Kick Configuration</span>
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700">Kick after swears</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={settings.kick_after_swears}
                        onChange={(e) => setSettings(prev => ({ ...prev, kick_after_swears: parseInt(e.target.value) || 5 }))}
                        className="w-full px-3 py-2 text-sm sm:text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500">Must be higher than timeout threshold</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* ✅ FIXED LOG CHANNEL DROPDOWN - OPENS UPWARD */}
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center space-x-3">
                  <DocumentTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Log Channel</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="relative" ref={channelDropdownRef}>
                    <button
                      onClick={() => setChannelDropdownOpen(!channelDropdownOpen)}
                      disabled={availableChannels.length === 0}
                      className="w-full flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base border border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-200 focus:border-green-500 bg-white/70 hover:bg-white transition-all duration-200 font-medium hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg sm:text-xl text-green-600">{getChannelDisplay().emoji}</span>
                        <span className="text-gray-900">{getChannelDisplay().text}</span>
                      </div>
                      <ChevronDownIcon className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform duration-200 ${channelDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* ✅ FIXED: CHANNEL DROPDOWN OPENS UPWARD WITH PROPER Z-INDEX */}
                    <div className={`absolute bottom-full left-0 right-0 mb-2 bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-gray-200 shadow-2xl z-[9999] overflow-hidden transition-all duration-300 transform origin-bottom ${
                      channelDropdownOpen 
                        ? 'opacity-100 scale-y-100 translate-y-0' 
                        : 'opacity-0 scale-y-95 translate-y-2 pointer-events-none'
                    }`}>
                      <div className="max-h-64 overflow-y-auto">
                        {/* No Logging Option */}
                        <button
                          onClick={() => {
                            const value = '';
                            console.log('Log channel changed to:', value);
                            setSettings(prev => ({ 
                              ...prev, 
                              log_channel_id: value === '' ? null : value 
                            }));
                            setChannelDropdownOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 hover:bg-red-50 transition-all duration-200 group animate-fadeInUp ${
                            !settings.log_channel_id ? 'bg-red-50 border-r-4 border-red-400' : ''
                          }`}
                        >
                          <span className="text-xl sm:text-2xl group-hover:scale-110 transition-transform duration-200">🚫</span>
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-gray-900 group-hover:text-red-700 text-sm sm:text-base">No logging</div>
                            <div className="text-xs sm:text-sm text-gray-600">Disable violation logging</div>
                          </div>
                          {!settings.log_channel_id && <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />}
                        </button>
                        
                        {/* Channel Options */}
                        {availableChannels.slice().reverse().map((channel: any, index) => (
                          <button
                            key={channel.id}
                            onClick={() => {
                              const value = channel.id;
                              console.log('Log channel changed to:', value);
                              setSettings(prev => ({ 
                                ...prev, 
                                log_channel_id: value === '' ? null : value 
                              }));
                              setChannelDropdownOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 hover:bg-green-50 transition-all duration-200 group animate-fadeInUp ${
                              settings.log_channel_id === channel.id ? 'bg-green-50 border-r-4 border-green-400' : ''
                            }`}
                            style={{ animationDelay: `${(index + 1) * 50}ms` }}
                          >
                            <span className="text-lg sm:text-xl text-green-600 group-hover:scale-110 transition-transform duration-200">#</span>
                            <div className="flex-1 text-left">
                              <div className="font-semibold text-gray-900 group-hover:text-green-700 text-sm sm:text-base">{channel.name}</div>
                              <div className="text-xs sm:text-sm text-gray-600">Text channel</div>
                            </div>
                            {settings.log_channel_id === channel.id && <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600">Channel where violations will be logged</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 text-sm sm:text-base lg:text-lg"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-5 w-5 sm:h-6 sm:w-6 border-3 border-white border-t-transparent rounded-full"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
              
              <button
                onClick={testFilter}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 text-sm sm:text-base lg:text-lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 sm:h-6 sm:w-6 border-3 border-white border-t-transparent rounded-full"></div>
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <BeakerIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Test Filter</span>
                  </>
                )}
              </button>
              
              <button
                onClick={resetToDefaults}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 text-sm sm:text-base lg:text-lg"
              >
                <ArrowPathIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Reset to Defaults</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SettingsPanel;
