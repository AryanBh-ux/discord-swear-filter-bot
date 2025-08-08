declare global {
  interface Window {
    socket: any;
  }
}

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  ClockIcon, 
  UserIcon, 
  HashtagIcon, 
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface ViolationLog {
  id: string;
  user_id: string;
  username: string;
  user_avatar?: string;
  channel_name: string;
  blocked_words: string[];
  timestamp: string;
  action_taken: string;
}

interface LogsViewerProps {
  guildId: string;
}

const LogsViewer: React.FC<LogsViewerProps> = ({ guildId }) => {
  const [logs, setLogs] = useState<ViolationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const logsPerPage = 25;

  const loadLogs = async (page: number = 1) => {
    try {
      setLoading(page === 1);
      setError(null);
      
      const response = await fetch(`/api/guild/${guildId}/logs?page=${page}&limit=${logsPerPage}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs || []);
        setCurrentPage(data.page || 1);
        setHasMore(data.has_more || false);
        setTotalPages(Math.ceil((data.total || 0) / logsPerPage));
      } else {
        setError(data.error || 'Failed to load logs');
      }
    } catch (err) {
      setError('Network error loading logs');
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshLogs = async () => {
    setRefreshing(true);
    await loadLogs(currentPage);
  };

  // ✅ EXPORT CSV FUNCTION - RESTORED AND IMPROVED
  const exportCSV = async () => {
    setExporting(true);
    try {
      // Get all logs for export (not just current page)
      const response = await fetch(`/api/guild/${guildId}/logs?page=1&limit=1000`);
      const data = await response.json();
      
      if (data.success && data.logs.length > 0) {
        const csvHeaders = ['Timestamp', 'Username', 'User ID', 'Channel', 'Blocked Words', 'Action Taken'];
        const csvRows = data.logs.map((log: ViolationLog) => [
          formatTimestamp(log.timestamp),
          log.username,
          log.user_id,
          log.channel_name,
          log.blocked_words.join('; '),
          log.action_taken
        ]);

        const csvContent = [
          csvHeaders.join(','),
          ...csvRows.map((row: any[]) => row.map((field: any) => `"${field}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `violation-logs-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('No logs available to export');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (guildId) {
      loadLogs(1);
      
      // ✅ Socket listeners for real-time updates
      if (window.socket) {
        window.socket.emit('join_guild_room', { guild_id: guildId });
        
        window.socket.on('filter_action_logged', (data: any) => {
          if (currentPage === 1) {
            const newLog: ViolationLog = {
              id: data.id || Date.now().toString(),
              user_id: data.user_id || '',
              username: data.user_name || 'Unknown User',
              user_avatar: data.user_avatar,
              channel_name: data.channel_name || 'Unknown Channel',
              blocked_words: data.blocked_words || [],
              timestamp: data.timestamp || new Date().toISOString(),
              action_taken: data.action_taken || 'delete'
            };
            
            setLogs(prev => [newLog, ...prev.slice(0, logsPerPage - 1)]);
          }
        });
      }
    }
    
    return () => {
      if (window.socket) {
        window.socket.off('filter_action_logged');
      }
    };
  }, [guildId, currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      loadLogs(newPage);
    }
  };

  const getActionColor = (action: string): string => {
    const actionLower = action.toLowerCase();
    switch (actionLower) {
      case 'delete':
      case 'delete_only':
      case 'only delete':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'delete + timeout':
      case 'delete_timeout':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'delete + timeout + kick':
      case 'delete_timeout_kick':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'timeout':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'kick':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'ban':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getActionIcon = (action: string): string => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('kick')) return '👢';
    if (actionLower.includes('timeout')) return '⏰';
    if (actionLower.includes('ban')) return '🔨';
    return '🗑️';
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      return format(new Date(timestamp), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return 'Invalid date';
    }
  };

  const getUserAvatar = (log: ViolationLog): string => {
    if (log.user_avatar && log.user_avatar !== 'None') {
      return log.user_avatar;
    }
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(log.user_id) % 5}.png`;
  };

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-8">
            <div className="flex items-center justify-center space-x-3 py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-600 font-medium text-sm sm:text-base">Loading violation logs...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-8">
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="h-12 sm:h-16 w-12 sm:w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Error Loading Logs</h3>
              <p className="text-gray-600 mb-6 text-sm sm:text-base">{error}</p>
              <button
                onClick={() => loadLogs(1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-xl font-medium transition-colors text-sm sm:text-base"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* ✅ RESPONSIVE Header */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 sm:p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl sm:rounded-2xl">
                <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Violation Logs</h1>
                <p className="text-gray-600 text-sm sm:text-base">Recent filter actions and violations</p>
              </div>
            </div>
            
            {/* ✅ RESPONSIVE Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={exportCSV}
                disabled={exporting || logs.length === 0}
                className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all hover:scale-105 text-sm sm:text-base"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
              </button>
              
              <button
                onClick={refreshLogs}
                disabled={refreshing}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 sm:px-4 py-2 rounded-xl font-medium transition-all hover:scale-105 text-sm sm:text-base"
              >
                <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ✅ RESPONSIVE Logs Table */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <ExclamationTriangleIcon className="h-12 sm:h-16 w-12 sm:w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2">No Violations Found</h3>
              <p className="text-gray-500 text-sm sm:text-base">There are no filter violations to display yet.</p>
            </div>
          ) : (
            <>
              {/* ✅ MOBILE-FIRST Table Design */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Words
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log, index) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <img
                              src={getUserAvatar(log)}
                              alt={log.username}
                              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full ring-2 ring-gray-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://cdn.discordapp.com/embed/avatars/${parseInt(log.user_id) % 5}.png`;
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {log.username}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {log.user_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <HashtagIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-900 truncate">
                              {log.channel_name}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex flex-wrap gap-1">
                            {log.blocked_words.slice(0, 3).map((word, wordIndex) => (
                              <span
                                key={wordIndex}
                                className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full border border-red-200"
                              >
                                {word}
                              </span>
                            ))}
                            {log.blocked_words.length > 3 && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                +{log.blocked_words.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <span className={`inline-flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-full text-xs font-medium border ${getActionColor(log.action_taken)}`}>
                            <span>{getActionIcon(log.action_taken)}</span>
                            <span className="hidden sm:inline">{log.action_taken}</span>
                            <span className="sm:hidden">{getActionIcon(log.action_taken)}</span>
                          </span>
                        </td>
                        
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-600">
                              <span className="hidden sm:inline">{formatTimestamp(log.timestamp)}</span>
                              <span className="sm:hidden">{format(new Date(log.timestamp), 'MMM dd')}</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ✅ RESPONSIVE Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
                  <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                      Page {currentPage} of {totalPages}
                    </div>
                    
                    <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeftIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Previous</span>
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage <= 2) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 1) {
                            pageNum = totalPages - 2 + i;
                          } else {
                            pageNum = currentPage - 1 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              disabled={loading}
                              className={`px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50'
                              } disabled:opacity-50`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsViewer;
