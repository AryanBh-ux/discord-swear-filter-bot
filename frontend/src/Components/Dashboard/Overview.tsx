import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import {
  ShieldExclamationIcon,
  UsersIcon,
  ClockIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
  Filler
);

interface OverviewProps {
  guildId: string;
  socket: Socket | null;
}

interface ViolationLog {
  id: string;
  user_id: string;
  username: string;
  user_avatar: string | null;
  channel_name: string;
  blocked_words: string[];
  timestamp: string;
  action_taken: string;
}

interface GuildStats {
  total_violations: number;
  active_users: number;
  violations_today: number;
  cache_hit_rate: string;
  avg_response_time: number;
  top_words: { word: string; count: number }[];
}

const Overview: React.FC<OverviewProps> = ({ guildId, socket }) => {
  const [recentViolations, setRecentViolations] = useState<ViolationLog[]>([]);
  const [guildStats, setGuildStats] = useState<GuildStats>({
    total_violations: 0,
    active_users: 0,
    violations_today: 0,
    cache_hit_rate: '0%',
    avg_response_time: 0,
    top_words: [],
  });
  const [chartSeries, setChartSeries] = useState<{ hour: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
    setupSocketListeners();
  }, [guildId, socket]);

  const loadInitialData = async () => {
    try {
      // Load recent violations
      const violationsResponse = await fetch(`/api/guild/${guildId}/logs?limit=10`);
      const violationsData = await violationsResponse.json();
      if (violationsData.success) {
        setRecentViolations(violationsData.logs);
      }

      // Load guild statistics
      const statsResponse = await fetch(`/api/guild/${guildId}/stats`);
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setGuildStats(statsData.stats);
        if (statsData.series) {
          setChartSeries(statsData.series);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading overview data:', error);
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    socket.emit('join_guild_room', { guild_id: guildId });

    // ✅ FIXED: Listen for the correct event name
    socket.on('filter_action_logged', (data: any) => {
      console.log('New violation received:', data); // Debug log
      
      setRecentViolations(prev => {
        const newViolation: ViolationLog = {
          id: data.id || Date.now().toString(),
          user_id: data.user_id || '',
          username: data.user_name || data.username || 'Unknown User', // ✅ FIXED
          user_avatar: data.user_avatar,
          channel_name: data.channel_name || 'Unknown Channel',
          blocked_words: data.blocked_words || [],
          timestamp: data.timestamp || new Date().toISOString(), // ✅ FIXED
          action_taken: data.action_taken || 'delete'
        };

        return [newViolation, ...prev.slice(0, 9)];
      });

      // Update stats
      setGuildStats(prev => ({
        ...prev,
        total_violations: prev.total_violations + 1,
        violations_today: prev.violations_today + 1,
      }));

      // Update chart
      setChartSeries(prev => {
        const now = new Date();
        const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).toISOString();
        const updatedSeries = [...prev];
        const currentHourIndex = updatedSeries.findIndex(point => point.hour === currentHour);
        
        if (currentHourIndex >= 0) {
          updatedSeries[currentHourIndex].count += 1;
        } else {
          updatedSeries.push({ hour: currentHour, count: 1 });
        }

        return updatedSeries.slice(-24);
      });
    });

    // ✅ NEW: Also listen for settings updates
    socket.on('settings_updated', (data: any) => {
      console.log('Settings updated:', data);
      loadInitialData(); // Refresh all data when settings change
    });
  };

  // Chart configurations
  const violationsChartData = {
    labels: chartSeries.map(point => new Date(point.hour)),
    datasets: [
      {
        label: 'Violations',
        data: chartSeries.map(point => point.count),
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const topWordsChartData = {
    labels: guildStats.top_words.slice(0, 5).map(w => w.word),
    datasets: [
      {
        data: guildStats.top_words.slice(0, 5).map(w => w.count),
        backgroundColor: [
          'rgb(239, 68, 68)',
          'rgb(245, 101, 101)',
          'rgb(251, 146, 60)',
          'rgb(168, 85, 247)',
          'rgb(59, 130, 246)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'hour' as const,
          displayFormats: {
            hour: 'HH:mm'
          }
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin animation-delay-150"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 sm:p-8 border border-blue-100">
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Monitor your server's moderation activity and statistics
          </p>
        </div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-20 blur-xl"></div>
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-br from-indigo-200 to-pink-200 rounded-full opacity-20 blur-lg"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Total Violations"
          value={guildStats.total_violations.toLocaleString()}
          icon={<ShieldExclamationIcon className="h-6 w-6" />}
          color="red"
        />
        <StatCard
          title="Today's Violations"
          value={guildStats.violations_today.toLocaleString()}
          icon={<ExclamationTriangleIcon className="h-6 w-6" />}
          color="yellow"
        />
        <StatCard
          title="Active Users"
          value={guildStats.active_users.toLocaleString()}
          icon={<UsersIcon className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Cache Hit Rate"
          value={guildStats.cache_hit_rate}
          icon={<ChartBarIcon className="h-6 w-6" />}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Violations Chart */}
        <div className="xl:col-span-2 group">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.01] h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Violations Over Time</h3>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <div className="h-64 sm:h-80">
              <Line data={violationsChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Top Words */}
        <div className="group">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.01] h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Top Blocked Words</h3>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div className="h-64 sm:h-80">
              {guildStats.top_words && guildStats.top_words.length > 0 ? (
                <Doughnut data={topWordsChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Violations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900">Recent Violations</h3>
              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>Live</span>
              </span>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {recentViolations.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentViolations.map((violation, index) => (
                <ViolationRow key={violation.id} violation={violation} index={index} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 bg-gray-50/50">
              <ShieldExclamationIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No recent violations</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => {
  const colorClasses = {
    red: 'text-red-600 bg-red-50 border-red-100 shadow-red-100',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-100 shadow-yellow-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100 shadow-blue-100',
    green: 'text-green-600 bg-green-50 border-green-100 shadow-green-100',
  };

  return (
    <div className={`group relative overflow-hidden bg-white rounded-2xl p-6 border shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] ${colorClasses[color as keyof typeof colorClasses].split(' ').slice(2).join(' ')}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${colorClasses[color as keyof typeof colorClasses].split(' ').slice(0, 2).join(' ')}`}>
          {icon}
        </div>
      </div>
      <div className={`absolute -bottom-2 -right-2 w-16 h-16 rounded-full opacity-10 transition-all duration-300 group-hover:scale-125 ${colorClasses[color as keyof typeof colorClasses].split(' ')[1].replace('bg-', 'bg-')}`}></div>
    </div>
  );
};

const ViolationRow: React.FC<{ violation: ViolationLog; index: number }> = ({ violation, index }) => (
  <div className={`p-4 hover:bg-gray-50 transition-all duration-200 group ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
    <div className="flex items-center space-x-4">
      {/* User Avatar */}
      <div className="flex-shrink-0">
        {violation.user_avatar ? (
          <img
            src={violation.user_avatar}
            alt={violation.username}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {violation.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-gray-900 truncate">{violation.username}</span>
          <span className="text-gray-500 text-sm">in</span>
          <span className="text-blue-600 font-medium text-sm">#{violation.channel_name}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {violation.blocked_words.slice(0, 3).map((word, index) => (
            <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-md">
              {word}
            </span>
          ))}
          {violation.blocked_words.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md">
              +{violation.blocked_words.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <div className="flex-shrink-0 text-right">
        <span className="text-sm text-gray-500">
          {new Date(violation.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  </div>
);


export default Overview;
