import React from 'react';
import {
  HomeIcon,
  DocumentTextIcon,
  HashtagIcon,
  UserGroupIcon,
  Cog6ToothIcon as CogIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

export type TabType = 'overview' | 'words' | 'logs' | 'channels' | 'roles' | 'settings';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
  mobileMenuOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed = false,
  setCollapsed,
  mobileMenuOpen = false,
  onMobileClose
}) => {
  const navItems = [
    { id: 'overview', name: 'Overview', icon: HomeIcon, color: 'blue' },
    { id: 'words', name: 'Words', icon: SparklesIcon, color: 'indigo' },
    { id: 'logs', name: 'Logs', icon: DocumentTextIcon, color: 'green' },
    { id: 'channels', name: 'Channels', icon: HashtagIcon, color: 'cyan' },
    { id: 'roles', name: 'Roles', icon: UserGroupIcon, color: 'emerald' },
    { id: 'settings', name: 'Settings', icon: CogIcon, color: 'red' },
  ];

  // Define colors for each item
  const getItemColors = (color: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; icon: string; border: string; dot: string } } = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-600' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-600', border: 'border-indigo-200', dot: 'bg-indigo-600' },
      green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-600', border: 'border-green-200', dot: 'bg-green-600' },
      cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', icon: 'text-cyan-600', border: 'border-cyan-200', dot: 'bg-cyan-600' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-600' },
      red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600', border: 'border-red-200', dot: 'bg-red-600' },
    };
    return colorMap[color];
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`
        hidden lg:flex flex-col bg-white border-r border-gray-200 
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-72'}
      `}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          {collapsed ? (
            <div className="flex justify-center">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">SwearFilter</h1>
            </div>
          )}
        </div>

        {/* Collapse Button - At the top, more visible */}
        {setCollapsed && (
          <div className="px-4 py-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`w-full flex items-center p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${
                collapsed ? 'justify-center' : 'justify-center'
              }`}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRightIcon className="h-5 w-5" />
              ) : (
                <>
                  <ChevronLeftIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">Collapse</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const colors = getItemColors(item.color);

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`
                  w-full flex items-center rounded-lg text-sm font-medium
                  transition-all duration-200 hover:bg-gray-50 focus:outline-none
                  focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${collapsed ? 'p-3 justify-center relative' : 'px-4 py-3 gap-3'}
                  ${isActive
                    ? `${colors.bg} ${colors.text} border ${colors.border}`
                    : 'text-gray-600 hover:text-gray-800'
                  }
                `}
                title={collapsed ? item.name : ''}
              >
                <Icon className={`h-5 w-5 ${isActive ? colors.icon : ''} ${collapsed ? '' : 'flex-shrink-0'}`} />
                
                {!collapsed && (
                  <>
                    <span>{item.name}</span>
                    {isActive && (
                      <div className={`ml-auto w-2 h-2 rounded-full ${colors.dot}`} />
                    )}
                  </>
                )}
                
                {/* ✅ FIXED: Properly positioned dot for collapsed state */}
                {collapsed && isActive && (
                  <div className={`absolute right-1 top-1 w-2 h-2 rounded-full ${colors.dot}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200">
          {!collapsed && (
            <div className="text-xs text-gray-500 text-center">
              Online • v2.1.0
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-200 transform
        transition-transform duration-300 ease-in-out lg:hidden
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">SwearFilter</h1>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const colors = getItemColors(item.color);

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                  transition-all duration-200 hover:bg-gray-50 focus:outline-none
                  focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  ${isActive
                    ? `${colors.bg} ${colors.text} border ${colors.border}`
                    : 'text-gray-600 hover:text-gray-800'
                  }
                `}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? colors.icon : ''}`} />
                <span>{item.name}</span>
                {isActive && (
                  <div className={`ml-auto w-2 h-2 rounded-full ${colors.dot}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            Online • v2.1.0
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
