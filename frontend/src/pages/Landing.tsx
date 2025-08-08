import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  BoltIcon,
  ChartBarIcon,
  CogIcon,
  CheckCircleIcon,
  StarIcon,
  UserGroupIcon,
  ArrowRightIcon,
  SparklesIcon,
  BookOpenIcon,
  HeartIcon,
  LockClosedIcon,
  CommandLineIcon,
  CodeBracketIcon,
  QuestionMarkCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';

const Landing: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStatsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleDiscordLogin = () => {
    setIsLoading(true);
    window.location.href = '/auth/discord';
  };

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    window.location.href = '/auth/discord';
  };

  const features = [
    {
      icon: ShieldCheckIcon,
      title: "AI-Powered Detection",
      description: "Advanced algorithms detect profanity, bypass attempts, and toxic content with 96.8% accuracy using machine learning.",
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      icon: BoltIcon,
      title: "Lightning Fast",
      description: "Sub-millisecond response times ensure your server performance remains completely unaffected during filtering.",
      color: "from-yellow-400 to-orange-500",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600"
    },
    {
      icon: ComputerDesktopIcon,
      title: "Web Dashboard",
      description: "Beautiful real-time dashboard with live analytics, violation logs, settings sync, and CSV export capabilities.",
      color: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      icon: CogIcon,
      title: "Fully Customizable",
      description: "Configure escalation rules, bypass roles, custom filters, and comprehensive admin controls for your needs.",
      color: "from-emerald-500 to-green-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600"
    }
  ];

  const stats = [
    { label: "Swears Filtered", value: "100k+", icon: ShieldCheckIcon },
    { label: "Users Protected (Help us increase this! :])", value: "1,300+", icon: UserGroupIcon },
    { label: "Detection Accuracy", value: "96.8%", icon: ShieldCheckIcon },
    { label: "Bot Uptime", value: "99.99%", icon: SparklesIcon }
  ];

  const includeFeatures = [
    "Unlimited Discord servers",
    "Advanced AI filtering technology", 
    "Real-time dashboard & analytics",
    "Custom word filters & whitelists",
    "Role & channel bypasses",
    "Escalation system (timeout/kick)",
    "Priority customer support",
    "Regular updates & improvements"
  ];

  return (
    <div className="min-h-screen bg-white font-manrope">
      {/* ✅ FIXED: Professional fonts with proper sizing */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        .font-manrope {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .font-mono {
          font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
        }

        /* Better font rendering */
        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
      `}} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
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
              <span className="text-lg font-bold text-gray-900 font-manrope">SwearFilter</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="/" className="text-gray-600 hover:text-blue-600 font-medium transition-colors text-sm font-manrope">Home</a>
              <a href="/docs" className="text-gray-600 hover:text-blue-600 font-medium transition-colors text-sm font-manrope">Docs</a>
              <button 
                onClick={handleDashboardClick}
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors text-sm font-manrope"
              >
                Dashboard
              </button>
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
          <div className={`md:hidden bg-white/95 backdrop-blur-md border-t border-gray-100 overflow-hidden transition-all duration-500 ease-out ${
            mobileMenuOpen 
              ? 'max-h-64 opacity-100' 
              : 'max-h-0 opacity-0'
          }`}>
            <div className="px-2 pt-3 pb-4 space-y-2">
              <a 
                href="/" 
                className={`block px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-all duration-300 transform text-sm font-manrope ${
                  mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: mobileMenuOpen ? '100ms' : '0ms' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </a>
              <a 
                href="/docs" 
                className={`block px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-all duration-300 transform text-sm font-manrope ${
                  mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: mobileMenuOpen ? '150ms' : '0ms' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Documentation
              </a>
              <button 
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleDashboardClick(e);
                }}
                className={`block w-full text-left px-4 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-medium transition-all duration-300 transform text-sm font-manrope ${
                  mobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: mobileMenuOpen ? '200ms' : '0ms' }}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Free Badge */}
            <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-semibold mb-8 border border-green-200 font-manrope">
              <HeartIcon className="h-4 w-4" />
              <span className="tracking-tight">100% FREE FOREVER • No Hidden Costs • No Premium Tiers</span>
            </div>

            {/* ✅ BETTER SIZED: Main Headline */}
            <h1 className="text-5xl sm:text-5xl lg:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-tight font-manrope">
              Intelligent
              <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                Discord Moderation
              </span>
            </h1>

            {/* ✅ BETTER SIZED: Subheadline */}
            <p className="text-lg sm:text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed font-manrope">
              Keep your Discord community safe with intelligent message content filtering. 
              <span className="font-semibold text-gray-800 block mt-2">
                Free forever. No strings attached. No premium tiers.
              </span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={handleDiscordLogin}
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold text-base px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 min-w-[280px] flex items-center justify-center space-x-2 font-manrope"
              >
                {isLoading ? (
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <span>Add to Discord - Free Forever</span>
                    <ArrowRightIcon className="h-5 w-5" />
                  </>
                )}
              </button>
              
              <a 
                href="/docs"
                className="bg-white text-blue-600 font-semibold text-base px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl border-2 border-blue-200 hover:border-blue-300 transition-all duration-200 hover:scale-105 min-w-[280px] flex items-center justify-center space-x-2 font-manrope"
              >
                <BookOpenIcon className="h-5 w-5" />
                <span>View Documentation</span>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-gray-600 mb-8 font-manrope text-sm">
              <div className="flex items-center space-x-2">
                <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="font-medium">4.6/5 Rating</span>
              </div>
              <div className="flex items-center space-x-2">
                <UserGroupIcon className="h-4 w-4 text-blue-500" />
                <span className="font-medium">1,300+ Users Protected</span>
              </div>
              <div className="flex items-center space-x-2">
                <LockClosedIcon className="h-4 w-4 text-green-500" />
                <span className="font-medium">Enterprise Grade</span>
              </div>
            </div>

            {/* Quick Benefits */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-green-100 rounded-full p-3">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-800 font-manrope text-sm">2-minute setup</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-blue-100 rounded-full p-3">
                    <SparklesIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-800 font-manrope text-sm">No credit card</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="bg-purple-100 rounded-full p-3">
                    <HeartIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-800 font-manrope text-sm">Always free</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4 font-manrope">
              Trusted by Discord Communities Worldwide
            </h2>
            <p className="text-base text-gray-600 font-manrope">Currently protecting 1,300+ users across 4 servers</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={stat.label}
                className={`text-center transform transition-all duration-700 ${
                  statsVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="bg-blue-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="h-7 w-7 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2 font-manrope">{stat.value}</div>
                  <div className="text-gray-600 font-medium font-manrope text-sm">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 font-manrope">
              Everything You Need for Safe Moderation
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto font-manrope">
              Professional-grade features that keep your Discord community clean and welcoming
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="group h-full">
                <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 h-full flex flex-col">
                  <div className={`${feature.bgColor} rounded-2xl p-3 w-14 h-14 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                    <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors flex-shrink-0 font-manrope">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed flex-grow font-manrope text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-3xl p-10 shadow-2xl border border-gray-100">
            <div className="mb-8">
              <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-5 py-2 rounded-full text-base font-semibold mb-6 font-manrope">
                <HeartIcon className="h-4 w-4" />
                <span>Everything Included - $0/month</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4 font-manrope">
                No Premium Tiers. No Feature Limits.
              </h2>
              <p className="text-lg text-gray-600 font-manrope">
                Access all professional features without paying a dime
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              {includeFeatures.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-800 font-medium font-manrope text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-5 bg-blue-50 rounded-2xl">
              <p className="text-base text-blue-800 font-semibold font-manrope">
                🎯 Seriously. We don't have premium versions. This IS the premium version.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6 font-manrope">
            Ready to Protect Your Community?
          </h2>
          <p className="text-lg text-blue-100 mb-12 max-w-2xl mx-auto leading-relaxed font-manrope">
            Join 1,300+ users who trust SwearFilter to keep their Discord servers safe and welcoming
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleDiscordLogin}
              disabled={isLoading}
              className="bg-white text-blue-600 text-lg font-semibold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 min-w-[280px] font-manrope"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <span>Start Protecting Now</span>
                  <ArrowRightIcon className="h-5 w-5" />
                </div>
              )}
            </button>

            <a 
              href="/docs" 
              className="bg-blue-500 hover:bg-blue-400 text-white text-lg font-semibold px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 min-w-[280px] inline-flex items-center justify-center space-x-3 font-manrope"
            >
              <BookOpenIcon className="h-5 w-5" />
              <span>View Documentation</span>
            </a>
          </div>
          
          <div className="mt-8 space-y-2 text-blue-100 font-manrope">
            <div className="text-base font-medium">⚡ 2-minute setup • 🛡️ Instant protection • 💯 Always free</div>
            <div className="text-sm opacity-90">No trials. No credit cards. No premium tiers. Just great moderation.</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center items-center gap-6 text-gray-600 font-manrope text-sm">
            <a href="/docs" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
              <BookOpenIcon className="h-4 w-4" />
              <span>Complete Guide</span>
            </a>
            <a href="/docs#commands" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
              <CommandLineIcon className="h-4 w-4" />
              <span>Commands</span>
            </a>
            <a href="/docs#api" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
              <CodeBracketIcon className="h-4 w-4" />
              <span>API Docs</span>
            </a>
            <a href="/docs#faq" className="flex items-center space-x-2 hover:text-blue-600 transition-colors">
              <QuestionMarkCircleIcon className="h-4 w-4" />
              <span>FAQ</span>
            </a>
          </div>
          
          <div className="text-center mt-8 pt-8 border-t border-gray-200">
            <p className="text-gray-500 font-manrope text-sm">© 2024 SwearFilter. Free forever, built with ❤️ for Discord communities.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
