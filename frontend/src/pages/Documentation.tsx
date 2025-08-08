import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheckIcon,
  BoltIcon,
  ChartBarIcon,
  CogIcon,
  CommandLineIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  HashtagIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  HomeIcon,
  PlayIcon,
  BeakerIcon,
  AdjustmentsHorizontalIcon,
  ChatBubbleLeftRightIcon,
  BookOpenIcon,
  SparklesIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  KeyIcon,
  EyeIcon,
  FireIcon,
  Bars3Icon
} from '@heroicons/react/24/outline';

// Types
interface DocSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
  subsections?: DocSubsection[];
}

interface DocSubsection {
  id: string;
  title: string;
  anchor: string;
}

interface Command {
  name: string;
  description: string;
  usage: string;
  parameters?: { name: string; description: string; required: boolean }[];
  examples?: string[];
  permissions?: string;
  category: string;
}

const Documentation: React.FC = () => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Documentation sections
  const sections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: PlayIcon,
      description: 'Learn how to add SwearFilter to your Discord server and get up and running in 2 minutes.',
      subsections: [
        { id: 'introduction', title: 'What is SwearFilter?', anchor: '#introduction' },
        { id: 'installation', title: 'Adding to Your Server', anchor: '#installation' },
        { id: 'permissions', title: 'Required Permissions', anchor: '#permissions' },
        { id: 'first-setup', title: 'Initial Configuration', anchor: '#first-setup' }
      ]
    },
    {
      id: 'how-it-works',
      title: 'How Detection Works',
      icon: SparklesIcon,
      description: 'Understand the intelligent algorithms that power SwearFilter\'s detection system.',
      subsections: [
        { id: 'detection-engine', title: 'Algorithm Overview', anchor: '#detection-engine' },
        { id: 'detection-steps', title: 'Step-by-Step Process', anchor: '#detection-steps' },
        { id: 'safe-words', title: 'Safe Words Protection', anchor: '#safe-words' },
        { id: 'performance', title: 'Performance & Speed', anchor: '#performance' }
      ]
    },
    {
      id: 'moderation-system',
      title: 'Moderation & Escalation',
      icon: ShieldCheckIcon,
      description: 'Configure escalation rules and moderation actions for your community.',
      subsections: [
        { id: 'action-types', title: 'Action Types', anchor: '#action-types' },
        { id: 'escalation-system', title: 'Escalation System', anchor: '#escalation-system' },
        { id: 'thresholds', title: 'Configuring Thresholds', anchor: '#thresholds' },
        { id: 'logging', title: 'Violation Logging', anchor: '#logging' }
      ]
    },
    {
      id: 'commands',
      title: 'Bot Commands',
      icon: CommandLineIcon,
      description: 'Complete reference for all available slash commands and their usage.',
      subsections: [
        { id: 'admin-commands', title: 'Admin Commands', anchor: '#admin-commands' },
        { id: 'word-management', title: 'Word Management', anchor: '#word-management' },
        { id: 'bypass-commands', title: 'Bypass & Roles', anchor: '#bypass-commands' },
        { id: 'monitoring-commands', title: 'Monitoring & Debug', anchor: '#monitoring-commands' }
      ]
    },
    {
      id: 'dashboard',
      title: 'Web Dashboard',
      icon: ComputerDesktopIcon,
      description: 'Master the real-time dashboard with analytics, logs, and configuration sync.',
      subsections: [
        { id: 'dashboard-overview', title: 'Dashboard Overview', anchor: '#dashboard-overview' },
        { id: 'viewing-logs', title: 'Viewing Violation Logs', anchor: '#viewing-logs' },
        { id: 'analytics', title: 'Analytics & Charts', anchor: '#analytics' },
        { id: 'csv-export', title: 'CSV Export', anchor: '#csv-export' }
      ]
    },
    {
      id: 'bypass-system',
      title: 'Bypass & Exemptions',
      icon: KeyIcon,
      description: 'Configure role-based and channel-based bypasses for trusted users.',
      subsections: [
        { id: 'role-bypasses', title: 'Role-Based Bypasses', anchor: '#role-bypasses' },
        { id: 'channel-exemptions', title: 'Channel Exemptions', anchor: '#channel-exemptions' },
        { id: 'best-practices', title: 'Best Practices', anchor: '#best-practices' }
      ]
    },
    {
      id: 'security-privacy',
      title: 'Security & Privacy',
      icon: LockClosedIcon,
      description: 'Learn about data handling, privacy, and security measures.',
      subsections: [
        { id: 'data-storage', title: 'What Data We Store', anchor: '#data-storage' },
        { id: 'data-retention', title: 'Data Retention', anchor: '#data-retention' },
        { id: 'security-measures', title: 'Security Measures', anchor: '#security-measures' },
        { id: 'bot-removal', title: 'When Bot is Removed', anchor: '#bot-removal' }
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: QuestionMarkCircleIcon,
      description: 'Common questions, troubleshooting tips, and solutions to known issues.',
      subsections: [
        { id: 'common-issues', title: 'Common Issues', anchor: '#common-issues' },
        { id: 'permission-problems', title: 'Permission Problems', anchor: '#permission-problems' },
        { id: 'dashboard-issues', title: 'Dashboard Issues', anchor: '#dashboard-issues' },
        { id: 'getting-help', title: 'Getting Help', anchor: '#getting-help' }
      ]
    }
  ];

  // Commands data organized by category
  const commands: { [key: string]: Command[] } = {
    'admin-commands': [
      {
        name: '/swearaction',
        description: 'Configure what happens when users violate the filter',
        usage: '/swearaction',
        permissions: 'Manage Server',
        category: 'admin',
        examples: [
          '/swearaction - Opens the action configuration menu',
          'Select "Delete + Timeout" and configure thresholds'
        ]
      },
      {
        name: '/toggle',
        description: 'Enable or disable the swear filter for your server',
        usage: '/toggle <on|off>',
        permissions: 'Manage Server',
        category: 'admin',
        parameters: [
          { name: 'state', description: 'Turn filter on or off', required: true }
        ],
        examples: [
          '/toggle on - Enable the filter',
          '/toggle off - Disable the filter'
        ]
      },
      {
        name: '/setlogchannel',
        description: 'Set the channel where violations will be logged',
        usage: '/setlogchannel [channel]',
        permissions: 'Manage Server',
        category: 'admin',
        parameters: [
          { name: 'channel', description: 'Channel for logging violations', required: false }
        ],
        examples: [
          '/setlogchannel #mod-logs - Set logging channel',
          '/setlogchannel - Disable logging'
        ]
      }
    ],
    'word-management': [
      {
        name: '/addword',
        description: 'Add custom words to the blocked list',
        usage: '/addword <words>',
        permissions: 'Manage Server',
        category: 'words',
        parameters: [
          { name: 'words', description: 'Comma-separated list of words to block', required: true }
        ],
        examples: [
          '/addword badword - Add single word',
          '/addword word1,word2,word3 - Add multiple words'
        ]
      },
      {
        name: '/removeword',
        description: 'Remove words from the blocked list',
        usage: '/removeword <words>',
        permissions: 'Manage Server',
        category: 'words',
        parameters: [
          { name: 'words', description: 'Comma-separated list of words to unblock', required: true }
        ],
        examples: [
          '/removeword badword - Remove single word',
          '/removeword word1,word2 - Remove multiple words'
        ]
      },
      {
        name: '/listwords',
        description: 'View all custom blocked words (paginated)',
        usage: '/listwords [page]',
        permissions: 'Manage Server',
        category: 'words',
        parameters: [
          { name: 'page', description: 'Page number to view', required: false }
        ],
        examples: [
          '/listwords - View first page',
          '/listwords 2 - View page 2'
        ]
      },
      {
        name: '/clearwords',
        description: 'Remove ALL custom words (requires confirmation)',
        usage: '/clearwords',
        permissions: 'Manage Server',
        category: 'words',
        examples: [
          '/clearwords - Clear all custom words with confirmation'
        ]
      }
    ],
    'bypass-commands': [
      {
        name: '/addallowedrole',
        description: 'Add roles that can bypass the filter',
        usage: '/addallowedrole <role>',
        permissions: 'Manage Server',
        category: 'bypass',
        parameters: [
          { name: 'role', description: 'Role to allow bypassing', required: true }
        ],
        examples: [
          '/addallowedrole @Moderators - Allow mods to bypass',
          '/addallowedrole @VIP - Allow VIP members to bypass'
        ]
      },
      {
        name: '/removeallowedrole',
        description: 'Remove roles from bypass list',
        usage: '/removeallowedrole <role>',
        permissions: 'Manage Server',
        category: 'bypass',
        parameters: [
          { name: 'role', description: 'Role to remove from bypass', required: true }
        ],
        examples: [
          '/removeallowedrole @VIP - Remove VIP bypass'
        ]
      },
      {
        name: '/listroles',
        description: 'List all roles with bypass permissions',
        usage: '/listroles',
        permissions: 'Manage Server',
        category: 'bypass',
        examples: [
          '/listroles - View all bypass roles'
        ]
      },
      {
        name: '/addchannel',
        description: 'Allow swearing in specific channels',
        usage: '/addchannel <channel>',
        permissions: 'Manage Server',
        category: 'bypass',
        parameters: [
          { name: 'channel', description: 'Channel to exempt from filtering', required: true }
        ],
        examples: [
          '/addchannel #off-topic - Allow swearing in off-topic'
        ]
      },
      {
        name: '/removechannel',
        description: 'Remove channels from exemption list',
        usage: '/removechannel <channel>',
        permissions: 'Manage Server',
        category: 'bypass',
        parameters: [
          { name: 'channel', description: 'Channel to remove exemption', required: true }
        ],
        examples: [
          '/removechannel #off-topic - Re-enable filtering'
        ]
      },
      {
        name: '/listchannels',
        description: 'View all exempt channels',
        usage: '/listchannels',
        permissions: 'Manage Server',
        category: 'bypass',
        examples: [
          '/listchannels - View all exempt channels'
        ]
      }
    ],
    'monitoring-commands': [
      {
        name: '/stats',
        description: 'View comprehensive server statistics',
        usage: '/stats',
        permissions: 'Manage Server',
        category: 'monitoring',
        examples: [
          '/stats - View detailed server statistics'
        ]
      },
      {
        name: '/health',
        description: 'Check system health and performance',
        usage: '/health',
        permissions: 'Manage Server',
        category: 'monitoring',
        examples: [
          '/health - View system health status'
        ]
      },
      {
        name: '/debugperms',
        description: 'Check user permissions for troubleshooting',
        usage: '/debugperms [user]',
        permissions: 'Manage Server',
        category: 'monitoring',
        parameters: [
          { name: 'user', description: 'User to check permissions for', required: false }
        ],
        examples: [
          '/debugperms - Check your own permissions',
          '/debugperms @user - Check another user\'s permissions'
        ]
      },
      {
        name: '/testswear',
        description: 'Test a message against the filter',
        usage: '/testswear <message>',
        permissions: 'Manage Server',
        category: 'monitoring',
        parameters: [
          { name: 'message', description: 'Message to test', required: true }
        ],
        examples: [
          '/testswear hello world - Test if message would be blocked'
        ]
      },
      {
        name: '/resetwarnings',
        description: 'Reset warning count for a user',
        usage: '/resetwarnings <user>',
        permissions: 'Manage Server',
        category: 'monitoring',
        parameters: [
          { name: 'user', description: 'User to reset warnings for', required: true }
        ],
        examples: [
          '/resetwarnings @user - Reset warning count to 0'
        ]
      },
      {
        name: '/debug_timeout',
        description: 'Test timeout functionality',
        usage: '/debug_timeout [user]',
        permissions: 'Administrator',
        category: 'monitoring',
        parameters: [
          { name: 'user', description: 'User to test timeout on', required: false }
        ],
        examples: [
          '/debug_timeout - Test timeout on yourself',
          '/debug_timeout @user - Test timeout on specified user'
        ]
      },
      {
        name: '/help',
        description: 'Interactive help system with command guide',
        usage: '/help [command]',
        permissions: 'Use Application Commands',
        category: 'monitoring',
        parameters: [
          { name: 'command', description: 'Specific command to get help for', required: false }
        ],
        examples: [
          '/help - Show main help menu',
          '/help swearaction - Get help for specific command'
        ]
      }
    ]
  };

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = sections.flatMap(section => 
        section.subsections?.filter(sub => 
          sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          section.title.toLowerCase().includes(searchQuery.toLowerCase())
        ).map(sub => ({ ...sub, sectionTitle: section.title, sectionId: section.id })) || []
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const navigateToSection = (sectionId: string, anchor?: string) => {
    setActiveSection(sectionId);
    setIsSearchOpen(false);
    setSearchQuery('');
    setMobileMenuOpen(false);
    if (anchor) {
      setTimeout(() => {
        const element = document.querySelector(anchor);
        element?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'getting-started':
        return <GettingStartedContent />;
      case 'how-it-works':
        return <HowItWorksContent />;
      case 'moderation-system':
        return <ModerationSystemContent />;
      case 'commands':
        return <CommandsContent commands={commands} />;
      case 'dashboard':
        return <DashboardContent />;
      case 'bypass-system':
        return <BypassSystemContent />;
      case 'security-privacy':
        return <SecurityPrivacyContent />;
      case 'troubleshooting':
        return <TroubleshootingContent />;
      default:
        return <GettingStartedContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-manrope">
      {/* Custom Fonts */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        .font-manrope {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .font-mono {
          font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
        }

        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}} />

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <a href="/" className="flex items-center space-x-3">
                <img 
                  src="/logo.png" 
                  alt="SwearFilter" 
                  className="h-8 w-8"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                  <ShieldCheckIcon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">SwearFilter</div>
                  <div className="text-xs text-gray-500">Documentation</div>
                </div>
              </a>
            </div>

            {/* Desktop Search */}
            {/* ✅ UPDATED: Desktop Search - Shows both ⌘K and Ctrl+K */}
            <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <button
                onClick={() => setIsSearchOpen(true)}
                className="w-full flex items-center space-x-3 bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-2 text-gray-600 transition-colors"
            >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span className="text-sm">Search documentation...</span>
                <div className="ml-auto flex items-center space-x-2">
                {/* ✅ Show different shortcuts based on platform */}
                <div className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 bg-white rounded text-xs font-medium">⌘</kbd>
                    <kbd className="px-2 py-1 bg-white rounded text-xs font-medium">K</kbd>
                </div>
                <span className="text-xs text-gray-400">or</span>
                <div className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 bg-white rounded text-xs font-medium">Ctrl</kbd>
                    <kbd className="px-2 py-1 bg-white rounded text-xs font-medium">K</kbd>
                </div>
                </div>
            </button>
            </div>


            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <a 
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-2"
              >
                <HomeIcon className="h-5 w-5" />
                <span>Home</span>
              </a>
              <a
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
              >
                Dashboard
              </a>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900 transition-all duration-200 p-2"
              >
                <div className="relative w-6 h-6">
                  <Bars3Icon className={`absolute h-6 w-6 transition-all duration-300 transform ${
                    mobileMenuOpen ? 'rotate-90 opacity-0 scale-75' : 'rotate-0 opacity-100 scale-100'
                  }`} />
                  <XMarkIcon className={`absolute h-6 w-6 transition-all duration-300 transform ${
                    mobileMenuOpen ? 'rotate-0 opacity-100 scale-100' : 'rotate-90 opacity-0 scale-75'
                  }`} />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className={`md:hidden bg-white border-t border-gray-100 overflow-hidden transition-all duration-500 ease-out ${
            mobileMenuOpen 
              ? 'max-h-96 opacity-100' 
              : 'max-h-0 opacity-0'
          }`}>
            <div className="px-2 pt-3 pb-4 space-y-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`w-full flex items-center space-x-3 bg-gray-100 hover:bg-gray-200 rounded-xl px-4 py-3 text-gray-600 transition-all duration-300 transform ${
                  mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: mobileMenuOpen ? '100ms' : '0ms' }}
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span className="text-sm">Search documentation...</span>
              </button>
              
              <a 
                href="/"
                className={`block px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-all duration-300 transform ${
                  mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: mobileMenuOpen ? '150ms' : '0ms' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </a>
              <a 
                href="/dashboard"
                className={`block px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-all duration-300 transform ${
                  mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: mobileMenuOpen ? '200ms' : '0ms' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setIsSearchOpen(false)}>
          <div className="max-w-2xl mx-auto mt-20 bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center border-b border-gray-200 px-6 py-4">
              <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 ml-4 text-lg outline-none"
              />
              <button onClick={() => setIsSearchOpen(false)}>
                <XMarkIcon className="h-6 w-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="max-h-96 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => navigateToSection(result.sectionId, result.anchor)}
                    className="w-full flex items-center space-x-4 px-6 py-3 hover:bg-gray-50 text-left"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{result.title}</div>
                      <div className="text-sm text-gray-500">{result.sectionTitle}</div>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 hidden lg:block">
          <nav className="space-y-2 sticky top-24">
            {sections.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => {
                    navigateToSection(section.id);
                    toggleSection(section.id);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    activeSection === section.id 
                      ? 'bg-blue-100 text-blue-700 shadow-sm' 
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <section.icon className="h-5 w-5" />
                    <span className="font-medium text-sm">{section.title}</span>
                  </div>
                  <ChevronDownIcon 
                    className={`h-4 w-4 transition-transform ${
                      expandedSections.includes(section.id) ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                
                {expandedSections.includes(section.id) && section.subsections && (
                  <div className="ml-8 mt-2 space-y-1">
                    {section.subsections.map((subsection) => (
                      <button
                        key={subsection.id}
                        onClick={() => navigateToSection(section.id, subsection.anchor)}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {subsection.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            {renderContent()}
          </div>
        </div>

        {/* Right Sidebar - Table of Contents */}
        <div className="w-64 flex-shrink-0 hidden xl:block">
          <div className="sticky top-24">
            <div className="text-sm font-semibold text-gray-900 mb-4">On this page</div>
            <nav className="space-y-2">
              {sections.find(s => s.id === activeSection)?.subsections?.map((subsection) => (
                <a
                  key={subsection.id}
                  href={subsection.anchor}
                  className="block text-sm text-gray-600 hover:text-blue-600 py-1 border-l-2 border-gray-200 hover:border-blue-600 pl-3 transition-colors"
                >
                  {subsection.title}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

// Getting Started Content Component
const GettingStartedContent: React.FC = () => (
  <div className="prose max-w-none">
    <div className="not-prose mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 font-manrope">Getting Started with SwearFilter</h1>
      <p className="text-xl text-gray-600 font-manrope">
        Welcome to SwearFilter - the most advanced Discord moderation bot that keeps your community safe using intelligent algorithms.
      </p>
    </div>

    <div id="introduction" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">What is SwearFilter?</h2>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
        <p className="text-lg text-gray-700 font-manrope">
          SwearFilter is a professional Discord moderation bot that uses intelligent algorithms (not AI) to detect and filter inappropriate content in real-time. With 96.8% accuracy and sub-10ms response times, it's the perfect solution for maintaining a clean, family-friendly Discord community.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border-2 border-gray-100 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <SparklesIcon className="h-8 w-8 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Intelligent Detection</h3>
          </div>
          <p className="text-gray-600 font-manrope">Advanced algorithms detect profanity, bypass attempts, and toxic behavior without false positives.</p>
        </div>
        
        <div className="bg-white border-2 border-gray-100 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BoltIcon className="h-8 w-8 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Lightning Fast</h3>
          </div>
          <p className="text-gray-600 font-manrope">Sub-10ms response times with intelligent caching ensure zero impact on server performance.</p>
        </div>
      </div>
    </div>

    <div id="installation" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Adding SwearFilter to Your Server</h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-blue-900 font-manrope">Requirements</span>
        </div>
        <ul className="text-blue-800 space-y-1 font-manrope">
          <li>• You must have "Manage Server" permission</li>
          <li>• Discord server must allow bots</li>
          <li>• Server must have at least one text channel</li>
        </ul>
      </div>

      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 font-manrope">Click the Invite Link</h3>
            <p className="text-gray-600 mb-3 font-manrope">Use our secure invite link to add SwearFilter to your Discord server.</p>
            <a href="https://discord.com/oauth2/authorize?client_id=1351564896826818581&permissions=1101927623762&integration_type=0&scope=bot+applications.commands" target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center space-x-2 font-manrope no-underline" >
              <span>Add to Discord</span>
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
        
        <div className="flex items-start space-x-4">
          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 font-manrope">Select Your Server</h3>
            <p className="text-gray-600 font-manrope">Choose the Discord server where you want to install SwearFilter from the dropdown menu.</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-4">
          <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2 font-manrope">Authorize Permissions</h3>
            <p className="text-gray-600 font-manrope">Review and approve the permissions SwearFilter needs to protect your server effectively.</p>
          </div>
        </div>
      </div>
    </div>

    <div id="permissions" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Required Permissions</h2>
      <p className="text-gray-600 mb-6 font-manrope">SwearFilter needs specific permissions to function effectively:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { name: 'Read Messages', description: 'To scan messages for inappropriate content' },
          { name: 'Send Messages', description: 'To send moderation notifications and responses' },
          { name: 'Manage Messages', description: 'To delete inappropriate messages' },
          { name: 'Moderate Members', description: 'To timeout users when configured' },
          { name: 'Kick Members', description: 'To kick persistent violators when configured' },
          { name: 'Embed Links', description: 'For rich notification messages and dashboard links' }
        ].map((permission, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-900 font-manrope">{permission.name}</span>
            </div>
            <p className="text-sm text-gray-600 font-manrope">{permission.description}</p>
          </div>
        ))}
      </div>
    </div>

    <div id="first-setup" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Initial Configuration</h2>
      <p className="text-gray-600 mb-6 font-manrope">After adding SwearFilter to your server, complete these essential setup steps:</p>
      
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3 font-manrope">1. Configure Moderation Actions</h3>
          <p className="text-gray-600 mb-3 font-manrope">Use the <code className="bg-gray-100 px-2 py-1 rounded font-mono">/swearaction</code> command to set up what happens when inappropriate content is detected.</p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            /swearaction
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3 font-manrope">2. Set Up Logging (Recommended)</h3>
          <p className="text-gray-600 mb-3 font-manrope">Create a dedicated channel for violation logs and configure it.</p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            /setlogchannel #mod-logs
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3 font-manrope">3. Test the Filter</h3>
          <p className="text-gray-600 mb-3 font-manrope">Use the test command to ensure everything is working correctly.</p>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            /testswear hello world
          </div>
        </div>
      </div>
      
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-8">
        <div className="flex items-center space-x-3 mb-3">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <span className="font-semibold text-green-900 font-manrope">You're All Set!</span>
        </div>
        <p className="text-green-800 font-manrope">
          SwearFilter is now protecting your server. Visit the <a href="/dashboard" className="underline">dashboard</a> to view real-time statistics and fine-tune your settings.
        </p>
      </div>
    </div>
  </div>
);

// How It Works Content Component
const HowItWorksContent: React.FC = () => (
  <div className="prose max-w-none">
    <div className="not-prose mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 font-manrope">How Detection Works</h1>
      <p className="text-xl text-gray-600 font-manrope">
        Understand the intelligent algorithms that power SwearFilter's detection system.
      </p>
    </div>

    <div id="detection-engine" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Algorithm Overview</h2>
      
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <SparklesIcon className="h-8 w-8 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900 font-manrope">Intelligent Algorithms (Not AI)</h3>
        </div>
        <p className="text-gray-700 text-lg font-manrope">
          Our proprietary detection system uses deterministic algorithms that analyze over 369,588 safe words and countless profanity patterns to achieve 96.8% accuracy in content detection while ensuring zero false positives.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center">
          <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-blue-600">96.8%</span>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2 font-manrope">Detection Accuracy</h4>
          <p className="text-gray-600 text-sm font-manrope">Industry-leading precision with zero false positives</p>
        </div>
        
        <div className="text-center">
          <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-green-600">&lt;10ms</span>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2 font-manrope">Response Time</h4>
          <p className="text-gray-600 text-sm font-manrope">Lightning-fast processing with zero server impact</p>
        </div>
        
        <div className="text-center">
          <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-purple-600">369K+</span>
          </div>
          <h4 className="font-semibold text-gray-900 mb-2 font-manrope">Safe Words</h4>
          <p className="text-gray-600 text-sm font-manrope">Comprehensive database preventing false positives</p>
        </div>
      </div>
    </div>

    <div id="detection-steps" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Step-by-Step Detection Process</h2>
      
      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="bg-blue-100 rounded-full p-3 flex-shrink-0">
            <span className="text-blue-600 font-bold">1</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 font-manrope">Unicode Normalization</h3>
            <p className="text-gray-600 mb-3 font-manrope">
              Normalize Unicode characters (NFKC), remove hidden separators, and convert homoglyphs (Cyrillic to Latin).
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono">
              Input: "f\u200Buck" → Output: "fuck"
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-4">
          <div className="bg-blue-100 rounded-full p-3 flex-shrink-0">
            <span className="text-blue-600 font-bold">2</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 font-manrope">Repetition & Spacing</h3>
            <p className="text-gray-600 mb-3 font-manrope">
              Smart repetition reduction with swear-awareness and collapse spaced letters.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono">
              "f u c k" → "fuck"<br />
              "shhhiiit" → "shit"
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-4">
          <div className="bg-green-100 rounded-full p-3 flex-shrink-0">
            <span className="text-green-600 font-bold">3</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 font-manrope">Safe Words Check</h3>
            <p className="text-gray-600 mb-3 font-manrope">
              Check against 369,588+ safe words database (highest priority).
            </p>
            <div className="bg-green-50 rounded-lg p-3 text-sm">
              ✅ Words like "class", "bass", "assassin" are protected
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-4">
          <div className="bg-red-100 rounded-full p-3 flex-shrink-0">
            <span className="text-red-600 font-bold">4</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 font-manrope">Multi-Layer Detection</h3>
            <p className="text-gray-600 mb-3 font-manrope">
              Apply multiple detection layers: direct matches, Levenshtein distance, character variants, and transpositions.
            </p>
            <div className="bg-red-50 rounded-lg p-3 text-sm">
              🔍 Detects: "f*ck", "fvck", "fuk", "phuck", "hsit"
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="safe-words" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Safe Words Protection</h2>
      
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h3 className="font-semibold text-green-900 mb-3 font-manrope">Zero False Positives</h3>
        <p className="text-green-800 mb-4 font-manrope">
          Our system uses a massive database of 369,588+ safe words to ensure legitimate messages are never blocked:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-green-800">
          <div>• class</div>
          <div>• bass</div>
          <div>• assassin</div>
          <div>• scrap</div>
          <div>• grass</div>
          <div>• mass</div>
          <div>• pass</div>
          <div>• glass</div>
        </div>
      </div>
    </div>

    <div id="performance" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Performance & Speed</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BoltIcon className="h-6 w-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Lightning Fast</h3>
          </div>
          <ul className="text-gray-600 space-y-2 font-manrope">
            <li>• Sub-10ms response times</li>
            <li>• Intelligent caching (5min TTL)</li>
            <li>• Minimal memory footprint</li>
            <li>• Asynchronous processing</li>
          </ul>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Optimized Processing</h3>
          </div>
          <ul className="text-gray-600 space-y-2 font-manrope">
            <li>• Smart cache management</li>
            <li>• 95% database call reduction</li>
            <li>• Automatic cache cleanup</li>
            <li>• Error recovery system</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

// Moderation System Content Component
const ModerationSystemContent: React.FC = () => (
  <div className="prose max-w-none">
    <div className="not-prose mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 font-manrope">Moderation & Escalation</h1>
      <p className="text-xl text-gray-600 font-manrope">
        Configure escalation rules and moderation actions for your community.
      </p>
    </div>

    <div id="action-types" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Action Types</h2>
      <p className="text-gray-600 mb-6 font-manrope">
        Choose from three escalation levels, each with customizable thresholds and behaviors.
      </p>

      <div className="space-y-6">
        <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 rounded-full p-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Delete Only</h3>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">RECOMMENDED FOR NEW SERVERS</span>
          </div>
          
          <p className="text-gray-600 mb-4 font-manrope">
            The gentlest option - simply removes inappropriate content. Perfect for establishing community standards without being overly punitive.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2 font-manrope">What Happens:</h4>
            <ul className="text-gray-600 space-y-1 font-manrope">
              <li>1. Message is instantly deleted</li>
              <li>2. Violation is logged for tracking</li>
              <li>3. No further action taken</li>
            </ul>
          </div>
        </div>

        <div className="bg-white border-2 border-yellow-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-yellow-100 rounded-full p-2">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Delete + Timeout</h3>
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">MOST POPULAR</span>
          </div>
          
          <p className="text-gray-600 mb-4 font-manrope">
            Balanced moderation that escalates consequences for repeat offenders. Deletes messages immediately and applies timeouts after a configurable number of violations.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 font-manrope">Immediate Action:</h4>
              <ul className="text-gray-600 space-y-1 font-manrope">
                <li>• Delete message instantly</li>
                <li>• Increment warning counter</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 font-manrope">After Threshold:</h4>
              <ul className="text-gray-600 space-y-1 font-manrope">
                <li>• Apply timeout duration</li>
                <li>• Log timeout action</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <p className="text-yellow-800 text-sm font-manrope">
              <strong>Configurable:</strong> Set violation count (1-50) and timeout duration (1-1440 minutes)
            </p>
          </div>
        </div>

        <div className="bg-white border-2 border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-red-100 rounded-full p-2">
              <UserGroupIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Delete + Timeout + Kick</h3>
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">MAXIMUM ENFORCEMENT</span>
          </div>
          
          <p className="text-gray-600 mb-4 font-manrope">
            Full escalation system for zero-tolerance communities. Progresses from deletion to timeout to permanent removal based on violation patterns.
          </p>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2 font-manrope">Escalation Flow:</h4>
              <div className="flex items-center space-x-2 text-sm text-gray-600 font-manrope">
                <span className="bg-gray-200 px-2 py-1 rounded">1st Violation</span>
                <ChevronRightIcon className="h-4 w-4" />
                <span className="bg-yellow-200 px-2 py-1 rounded">Timeout Threshold</span>
                <ChevronRightIcon className="h-4 w-4" />
                <span className="bg-red-200 px-2 py-1 rounded">Kick Threshold</span>
              </div>
            </div>
            
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-red-800 text-sm font-manrope">
                <strong>Important:</strong> Kick threshold must be higher than timeout threshold to ensure proper escalation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Commands Content Component  
// Commands Content Component with proper typing
const CommandsContent: React.FC<{ commands: { [key: string]: Command[] } }> = ({ commands }) => (
  <div className="prose max-w-none">
    <div className="not-prose mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 font-manrope">Bot Commands</h1>
      <p className="text-xl text-gray-600 font-manrope">
        Complete reference for all available slash commands and their usage.
      </p>
    </div>

    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
      <div className="flex items-center space-x-3 mb-3">
        <CommandLineIcon className="h-5 w-5 text-blue-600" />
        <span className="font-semibold text-blue-900 font-manrope">Command Usage Guide</span>
      </div>
      <div className="text-blue-800 space-y-2 font-manrope">
        <p>• <code>&lt;parameter&gt;</code> = Required parameter</p>
        <p>• <code>[parameter]</code> = Optional parameter</p>
        <p>• All commands are slash commands (start with <code>/</code>)</p>
        <p>• Some commands require specific permissions</p>
      </div>
    </div>

    {/* ✅ FIX: Properly type the entries destructuring */}
    {(Object.entries(commands) as [string, Command[]][]).map(([category, commandList]) => (
      <div key={category} id={category} className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">
          {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </h2>
        
        <div className="space-y-6">
          {commandList.map((command: Command, index: number) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gray-900 text-white px-3 py-1 rounded-lg font-mono text-sm">
                  {command.name}
                </div>
                {command.permissions && (
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg text-xs font-medium">
                    {command.permissions}
                  </div>
                )}
              </div>
              
              <p className="text-gray-700 mb-4 font-manrope">{command.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 font-manrope">Usage</h4>
                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
                    {command.usage}
                  </div>
                </div>
                
                {command.examples && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 font-manrope">Examples</h4>
                    <div className="space-y-2">
                      {command.examples.map((example, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {command.parameters && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-900 mb-2 font-manrope">Parameters</h4>
                  <div className="space-y-2">
                    {command.parameters.map((param, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">{param.name}</code>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 font-manrope">{param.description}</p>
                          {param.required && (
                            <span className="text-xs text-red-600 font-medium">Required</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);


// Dashboard Content Component
const DashboardContent: React.FC = () => (
  <div className="prose max-w-none">
    <div className="not-prose mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 font-manrope">Web Dashboard</h1>
      <p className="text-xl text-gray-600 font-manrope">
        Master the real-time dashboard with comprehensive analytics, violation logs, and seamless settings management.
      </p>
    </div>

    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 mb-8">
      <div className="flex items-center space-x-3 mb-4">
        <ComputerDesktopIcon className="h-8 w-8 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900 font-manrope">Real-time Monitoring</h2>
      </div>
      <p className="text-gray-700 text-lg font-manrope">
        Access your personalized dashboard with live statistics, violation tracking, and instant settings synchronization between Discord and the web interface.
      </p>
      <a href="/dashboard" className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors mt-4 font-manrope no-underline">
        <span>Open Dashboard</span>
        <ArrowRightIcon className="h-4 w-4" />
      </a>
    </div>

    <div id="dashboard-overview" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 font-manrope">Live Statistics</h3>
          <p className="text-gray-600 text-sm font-manrope">Real-time violation counts, detection accuracy, and server health metrics</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <DocumentTextIcon className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 font-manrope">Violation Logs</h3>
          <p className="text-gray-600 text-sm font-manrope">Detailed logs with user info, timestamps, actions taken, and export options</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <CogIcon className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2 font-manrope">Settings Sync</h3>
          <p className="text-gray-600 text-sm font-manrope">Instant synchronization between Discord commands and web configuration</p>
        </div>
      </div>
    </div>

    <div id="viewing-logs" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Viewing Violation Logs</h2>
      <p className="text-gray-600 mb-6 font-manrope">
        The logs section provides comprehensive tracking of all filter actions with powerful filtering and export capabilities.
      </p>

      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 font-manrope">Log Information</h3>
          <p className="text-gray-600 mb-4 font-manrope">Each log entry includes the following information:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'User avatar and username',
              'Channel where violation occurred',
              'Detected inappropriate words',
              'Action taken (delete, timeout, kick)',
              'Precise timestamp (with timezone)',
              'User ID for moderation tracking'
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="bg-blue-100 rounded-full w-2 h-2"></div>
                <span className="text-gray-700 font-manrope">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 font-manrope">Filtering & Search</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2 font-manrope">Available Filters</h4>
              <div className="flex flex-wrap gap-2">
                {['By User', 'By Channel', 'By Action Type', 'By Date Range', 'By Blocked Words'].map((filter, index) => (
                  <span key={index} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-manrope">{filter}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="analytics" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Analytics & Charts</h2>
      <p className="text-gray-600 mb-6 font-manrope">
        Gain valuable insights into your server's moderation patterns with interactive charts and statistical analysis.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 font-manrope">Violation Trends</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-manrope">Total Violations</span>
              <span className="font-bold text-gray-900 font-manrope">1,234</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-manrope">Today's Violations</span>
              <span className="font-bold text-green-600 font-manrope">23</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-manrope">Detection Rate</span>
              <span className="font-bold text-blue-600 font-manrope">96.8%</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 font-manrope">Action Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-gray-600 font-manrope">Deletions</span>
              </div>
              <span className="font-bold font-manrope">87%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-gray-600 font-manrope">Timeouts</span>
              </div>
              <span className="font-bold font-manrope">11%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                <span className="text-gray-600 font-manrope">Kicks</span>
              </div>
              <span className="font-bold font-manrope">2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="csv-export" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">CSV Export</h2>
      <p className="text-gray-600 mb-6 font-manrope">
        Export your violation data for external analysis, reporting, or backup purposes.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 mb-4 font-manrope">Export Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 font-manrope">What's Included</h4>
            <ul className="text-gray-600 space-y-1 font-manrope">
              <li>• User ID and username</li>
              <li>• Channel name and ID</li>
              <li>• Blocked words detected</li>
              <li>• Action taken</li>
              <li>• Timestamp (ISO format)</li>
              <li>• Violation count</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2 font-manrope">Limitations</h4>
            <ul className="text-gray-600 space-y-1 font-manrope">
              <li>• Maximum 1,000 entries per export</li>
              <li>• Data from last 30 days only</li>
              <li>• UTF-8 encoding</li>
              <li>• Comma-separated format</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800 font-manrope">
            💡 <strong>Pro Tip:</strong> Use date filters to export specific time periods and stay within the 1,000 entry limit.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Bypass System Content Component
const BypassSystemContent: React.FC = () => (
  <div className="prose max-w-none">
    <div className="not-prose mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 font-manrope">Bypass & Exemptions</h1>
      <p className="text-xl text-gray-600 font-manrope">
        Configure role-based and channel-based bypasses for trusted users and specific areas of your server.
      </p>
    </div>

    <div id="role-bypasses" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Role-Based Bypasses</h2>
      <p className="text-gray-600 mb-6 font-manrope">
        Grant selective immunity to trusted members and staff without compromising overall protection.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <UserGroupIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 font-manrope">How Role Bypasses Work</h3>
        </div>
        <p className="text-gray-600 mb-4 font-manrope">
          Users with bypass roles can send messages that would normally be filtered. This is perfect for moderators, VIPs, or trusted community members.
        </p>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700 font-manrope">Multiple role support</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700 font-manrope">Automatic role hierarchy respect</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700 font-manrope">Real-time role change detection</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 font-manrope">Adding Bypass Roles</h4>
          <div className="bg-white rounded-lg p-3 font-mono text-sm border">
            /addallowedrole @Moderators
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 font-manrope">Viewing Current Roles</h4>
          <div className="bg-white rounded-lg p-3 font-mono text-sm border">
            /listroles
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 font-manrope">Removing Roles</h4>
          <div className="bg-white rounded-lg p-3 font-mono text-sm border">
            /removeallowedrole @VIP
          </div>
        </div>
      </div>
    </div>

    <div id="channel-exemptions" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Channel Exemptions</h2>
      <p className="text-gray-600 mb-6 font-manrope">
        Exclude specific channels from filtering for unrestricted discussion areas or staff channels.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <HashtagIcon className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 font-manrope">Channel Exemptions</h3>
        </div>
        <p className="text-gray-600 mb-4 font-manrope">
          Channels in the exemption list will not have their messages filtered. Perfect for adult channels or staff areas.
        </p>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700 font-manrope">Per-channel configuration</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700 font-manrope">Category-wide exemptions possible</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700 font-manrope">Thread support included</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 font-manrope">Adding Channel Exemptions</h4>
          <div className="bg-white rounded-lg p-3 font-mono text-sm border">
            /addchannel #off-topic
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 font-manrope">Viewing Exempt Channels</h4>
          <div className="bg-white rounded-lg p-3 font-mono text-sm border">
            /listchannels
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2 font-manrope">Removing Exemptions</h4>
          <div className="bg-white rounded-lg p-3 font-mono text-sm border">
            /removechannel #off-topic
          </div>
        </div>
      </div>
    </div>

    <div id="best-practices" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Best Practices</h2>
      
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-3">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-900 font-manrope">Recommended Practices</span>
          </div>
          <ul className="text-green-800 space-y-2 font-manrope">
            <li>• Start with minimal bypasses and expand as needed</li>
            <li>• Use role-based bypasses for staff members</li>
            <li>• Consider creating specific channels for unrestricted content</li>
            <li>• Regularly review bypass permissions as roles change</li>
            <li>• Document bypass reasons for team transparency</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold text-yellow-900 font-manrope">Important Notes</span>
          </div>
          <ul className="text-yellow-800 space-y-2 font-manrope">
            <li>• Administrator role automatically bypasses all filtering</li>
            <li>• Bot messages are never filtered</li>
            <li>• Bypasses apply to all action types</li>
            <li>• Changes take effect immediately</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

// Security & Privacy Content Component
const SecurityPrivacyContent: React.FC = () => (
  <div className="prose max-w-none">
    <div className="not-prose mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 font-manrope">Security & Privacy</h1>
      <p className="text-xl text-gray-600 font-manrope">
        Learn about data handling, privacy measures, and security protocols that protect your community.
      </p>
    </div>

    <div id="data-storage" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">What Data We Store</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <CogIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Server Settings</h3>
          </div>
          <ul className="text-gray-600 space-y-2 font-manrope">
            <li>• Action type configuration</li>
            <li>• Escalation thresholds</li>
            <li>• Bypass roles and channels</li>
            <li>• Custom word lists</li>
            <li>• Logging channel preferences</li>
          </ul>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <DocumentTextIcon className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Violation Logs</h3>
          </div>
          <ul className="text-gray-600 space-y-2 font-manrope">
            <li>• User ID and username</li>
            <li>• Channel name (not ID)</li>
            <li>• Blocked words detected</li>
            <li>• Action taken</li>
            <li>• Timestamp</li>
            <li>• User warning counts</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3 font-manrope">What We DON'T Store</h3>
        <ul className="text-blue-800 space-y-1 font-manrope">
          <li>• Full message content (only detected words)</li>
          <li>• Private/DM messages</li>
          <li>• User passwords or tokens</li>
          <li>• Personal information beyond Discord data</li>
          <li>• Message attachments or files</li>
        </ul>
      </div>
    </div>

    <div id="data-retention" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Data Retention</h2>
      
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 font-manrope">Automatic Cleanup</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2 font-manrope">Violation Logs</h4>
              <p className="text-gray-600 text-sm font-manrope">Automatically deleted after 30 days</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2 font-manrope">Cache Data</h4>
              <p className="text-gray-600 text-sm font-manrope">Cleared every 5 minutes</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2 font-manrope">Server Settings</h4>
              <p className="text-gray-600 text-sm font-manrope">Kept until bot removal</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2 font-manrope">User Warnings</h4>
              <p className="text-gray-600 text-sm font-manrope">Reset via command or monthly</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="security-measures" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Security Measures</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <LockClosedIcon className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Data Encryption</h3>
          </div>
          <ul className="text-gray-600 space-y-2 font-manrope">
            <li>• All data encrypted in Supabase</li>
            <li>• TLS 1.3 for data transmission</li>
            <li>• Encrypted database connections</li>
            <li>• Secure API endpoints</li>
          </ul>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <KeyIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 font-manrope">Access Control</h3>
          </div>
          <ul className="text-gray-600 space-y-2 font-manrope">
            <li>• OAuth2 authentication required</li>
            <li>• "Manage Server" permission check</li>
            <li>• Rate limiting (100 req/min)</li>
            <li>• No external data sharing</li>
          </ul>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
        <h3 className="font-semibold text-green-900 mb-3 font-manrope">Privacy Commitments</h3>
        <ul className="text-green-800 space-y-2 font-manrope">
          <li>• No AI/external services for detection</li>
          <li>• All processing done locally</li>
          <li>• No data sold to third parties</li>
          <li>• Minimal data collection principle</li>
          <li>• Full GDPR compliance</li>
        </ul>
      </div>
    </div>

    <div id="bot-removal" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">When Bot is Removed</h2>
      
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 font-manrope">What Happens to Your Data</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="bg-yellow-100 rounded-full p-1 mt-1">
                <ClockIcon className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1 font-manrope">Immediate Effect</h4>
                <p className="text-gray-600 text-sm font-manrope">Server marked as "inactive" but data remains intact</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 rounded-full p-1 mt-1">
                <EyeIcon className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1 font-manrope">Data Access</h4>
                <p className="text-gray-600 text-sm font-manrope">Dashboard becomes inaccessible, no new logs recorded</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 rounded-full p-1 mt-1">
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1 font-manrope">Re-invite Option</h4>
                <p className="text-gray-600 text-sm font-manrope">Re-adding bot restores all previous settings and recent logs</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-3">
            <FireIcon className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-900 font-manrope">Data Deletion</span>
          </div>
          <p className="text-red-800 mb-4 font-manrope">
            If you want your data completely removed after bot removal, contact our support team. We will permanently delete all associated data within 7 days.
          </p>
          <div className="bg-white rounded-lg p-3">
            <p className="text-sm text-gray-600 font-manrope">
              <strong>Note:</strong> Regular 30-day log cleanup continues even after bot removal.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Troubleshooting Content Component
const TroubleshootingContent: React.FC = () => (
  <div className="prose max-w-none">
    <div className="not-prose mb-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4 font-manrope">Troubleshooting</h1>
      <p className="text-xl text-gray-600 font-manrope">
        Common questions, troubleshooting tips, and solutions to known issues.
      </p>
    </div>

    <div id="common-issues" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Common Issues</h2>
      
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            <h3 className="font-semibold text-red-900 font-manrope">Bot is not responding to messages</h3>
          </div>
          
          <div className="text-red-800 space-y-3">
            <p className="font-manrope"><strong>Most common causes and solutions:</strong></p>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="font-bold">1.</span>
                <div>
                  <p className="font-manrope"><strong>Check bot permissions:</strong> Ensure SwearFilter has "Read Messages", "Send Messages", and "Manage Messages" permissions.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-bold">2.</span>
                <div>
                  <p className="font-manrope"><strong>Verify bot is online:</strong> Look for the green "online" indicator next to SwearFilter in your member list.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-bold">3.</span>
                <div>
                  <p className="font-manrope"><strong>Check filter status:</strong> Use <code className="bg-red-100 px-2 py-1 rounded font-mono">/toggle</code> to verify the filter is enabled.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-bold">4.</span>
                <div>
                  <p className="font-manrope"><strong>Channel bypasses:</strong> Check if the channel is in the bypass list using <code className="bg-red-100 px-2 py-1 rounded font-mono">/listchannels</code>.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ClockIcon className="h-6 w-6 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900 font-manrope">Timeout feature not working</h3>
          </div>
          
          <div className="text-yellow-800 space-y-3">
            <p className="font-manrope"><strong>Timeout issues are usually permission-related:</strong></p>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="font-bold">1.</span>
                <div>
                  <p className="font-manrope"><strong>Required permission:</strong> Bot needs "Moderate Members" permission to apply timeouts.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-bold">2.</span>
                <div>
                  <p className="font-manrope"><strong>Role hierarchy:</strong> Bot's role must be higher than the user being timed out.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-bold">3.</span>
                <div>
                  <p className="font-manrope"><strong>Configuration check:</strong> Ensure you've selected "Delete + Timeout" or "Delete + Timeout + Kick" action type.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-bold">4.</span>
                <div>
                  <p className="font-manrope"><strong>Test command:</strong> Use <code className="bg-yellow-100 px-2 py-1 rounded font-mono">/debug_timeout</code> to test timeout functionality.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ComputerDesktopIcon className="h-6 w-6 text-blue-600" />
            <h3 className="font-semibold text-blue-900 font-manrope">Dashboard not updating in real-time</h3>
          </div>
          
          <div className="text-blue-800 space-y-3">
            <p className="font-manrope"><strong>Real-time update issues:</strong></p>
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <span className="font-bold">1.</span>
                <div>
                  <p className="font-manrope"><strong>Browser compatibility:</strong> Ensure your browser supports WebSockets (all modern browsers do).</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-bold">2.</span>
                <div>
                  <p className="font-manrope"><strong>Network/firewall:</strong> Some corporate networks block WebSocket connections.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-bold">3.</span>
                <div>
                  <p className="font-manrope"><strong>Refresh the page:</strong> Sometimes a simple page refresh re-establishes the connection.</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="font-bold">4.</span>
                <div>
                  <p className="font-manrope"><strong>Check console:</strong> Open browser developer tools to check for connection errors.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="permission-problems" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Permission Problems</h2>
      
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4 font-manrope">Permission Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { permission: 'Read Messages', purpose: 'Scan messages for content' },
            { permission: 'Send Messages', purpose: 'Send notifications' },
            { permission: 'Manage Messages', purpose: 'Delete inappropriate messages' },
            { permission: 'Moderate Members', purpose: 'Apply timeouts' },
            { permission: 'Kick Members', purpose: 'Kick persistent offenders' },
            { permission: 'Embed Links', purpose: 'Rich message formatting' }
          ].map((item, index) => (
            <div key={index} className="flex items-start space-x-3">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <span className="font-medium text-gray-900 font-manrope">{item.permission}</span>
                <p className="text-sm text-gray-600 font-manrope">{item.purpose}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
        <h3 className="font-semibold text-orange-900 mb-3 font-manrope">Role Hierarchy Issues</h3>
        <p className="text-orange-800 mb-4 font-manrope">
          If timeouts or kicks aren't working, the bot's role might be too low in the hierarchy:
        </p>
        <ol className="text-orange-800 space-y-2 font-manrope">
          <li>1. Go to Server Settings → Roles</li>
          <li>2. Drag SwearFilter's role higher than user roles</li>
          <li>3. Ensure it's below admin roles but above member roles</li>
          <li>4. Test with <code className="bg-orange-100 px-2 py-1 rounded font-mono">/debug_timeout</code></li>
        </ol>
      </div>
    </div>

    <div id="dashboard-issues" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Dashboard Issues</h2>
      
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 font-manrope">Authentication Problems</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">!</span>
              <div>
                <p className="font-medium text-gray-900 font-manrope">Can't access dashboard</p>
                <p className="text-gray-600 text-sm font-manrope">Ensure you have "Manage Server" permission</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-red-100 text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">!</span>
              <div>
                <p className="font-medium text-gray-900 font-manrope">Server not appearing</p>
                <p className="text-gray-600 text-sm font-manrope">Bot must be added to server first</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-4 font-manrope">Data Loading Issues</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="bg-yellow-100 text-yellow-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">?</span>
              <div>
                <p className="font-medium text-gray-900 font-manrope">No logs showing</p>
                <p className="text-gray-600 text-sm font-manrope">May take up to 30 days of activity to populate</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-yellow-100 text-yellow-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">?</span>
              <div>
                <p className="font-medium text-gray-900 font-manrope">CSV export empty</p>
                <p className="text-gray-600 text-sm font-manrope">Check date filters and ensure data exists in range</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="getting-help" className="mb-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 font-manrope">Getting Help</h2>
      <p className="text-gray-600 mb-6 font-manrope">
        Need help that wasn't covered in our documentation? We're here to assist!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600" />
            <h3 className="font-semibold text-gray-900 font-manrope">Discord Support Server</h3>
          </div>
          <p className="text-gray-600 mb-4 font-manrope">
            Join our official Discord server for live support, community discussions, and feature announcements.
          </p>
          <a href="https://discord.gg/swearfilter" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center space-x-2 font-manrope no-underline">
            <span>Join Support Server</span>
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BeakerIcon className="h-6 w-6 text-green-600" />
            <h3 className="font-semibold text-gray-900 font-manrope">Debug Commands</h3>
          </div>
          <p className="text-gray-600 mb-4 font-manrope">
            Use built-in diagnostic commands to troubleshoot issues yourself.
          </p>
          <div className="space-y-2">
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
              /health - System status
            </div>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
              /debugperms - Check permissions
            </div>
            <div className="bg-gray-50 rounded-lg p-3 font-mono text-sm">
              /testswear hello - Test filter
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 mt-8">
        <div className="flex items-center space-x-3 mb-4">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-gray-900 font-manrope">Response Time Commitment</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600 mb-1">&lt; 1hr</div>
            <div className="text-sm text-gray-600 font-manrope">Critical Issues</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 mb-1">&lt; 4hrs</div>
            <div className="text-sm text-gray-600 font-manrope">General Support</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 mb-1">&lt; 24hrs</div>
            <div className="text-sm text-gray-600 font-manrope">Feature Requests</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Documentation