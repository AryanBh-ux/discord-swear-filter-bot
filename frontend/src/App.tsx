import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import ServerSelection from '@/Components/Dashboard/ServerSelction';
import MainDashboard from '@/Components/Dashboard/MainDashboard';
import Documentation from './pages/Documentation';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  permissions: number;
}

// ✅ FIXED: Better Navigation Memory - only redirects authenticated users to servers
const NavigationMemory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only save valid dashboard paths
    const validDashboardPaths = ['/dashboard', '/servers'];
    if (validDashboardPaths.includes(location.pathname)) {
      localStorage.setItem('lastDashboardPath', location.pathname);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Only redirect authenticated users from root to their last dashboard path
    const savedPath = localStorage.getItem('lastDashboardPath');
    const validDashboardPaths = ['/dashboard', '/servers'];
    
    // ✅ FIXED: Only redirect if user is authenticated AND on root path
    if (savedPath && 
        validDashboardPaths.includes(savedPath) && 
        location.pathname === '/' &&
        localStorage.getItem('isAuthenticated') === 'true') {
      navigate(savedPath, { replace: true });
    }
  }, [navigate, location.pathname]);

  return null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('/auth/user');
      setUser(response.data.user);
      setGuilds(response.data.guilds);
      // ✅ Mark user as authenticated
      localStorage.setItem('isAuthenticated', 'true');
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.clear();
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      localStorage.clear();
      setUser(null);
      setGuilds([]);
      setSelectedGuild(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.clear();
      window.location.href = '/';
    }
  };

  const handleSelectServer = (guildId: string) => {
    setSelectedGuild(guildId);
    localStorage.setItem('selectedGuild', guildId);
  };

  const handleBackToSelection = () => {
    setSelectedGuild(null);
    localStorage.removeItem('selectedGuild');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div>
          <p className="mt-4 text-white text-xl font-medium">Loading SwearFilter Dashboard...</p>
        </div>
      </div>
    );
  };

  return (
    <Router>
      <NavigationMemory />
      <Routes>
        {/* ✅ FIXED: Landing page accessible to everyone, authenticated users redirected to servers */}
        <Route 
          path="/" 
          element={user ? <Navigate to="/servers" replace /> : <Landing />} 
        />
        
        {/* ✅ Documentation route - accessible to everyone */}
        <Route path="/docs" element={<Documentation />} />
        
        {/* ✅ Protected routes - require authentication */}
        <Route 
          path="/servers" 
          element={
            user ? (
              selectedGuild ? (
                <MainDashboard 
                  user={user} 
                  guildId={selectedGuild}
                  onLogout={handleLogout}
                  onBack={handleBackToSelection}
                />
              ) : (
                <ServerSelection 
                  guilds={guilds} 
                  onSelectServer={handleSelectServer}
                  onLogout={handleLogout}
                />
              )
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        <Route 
          path="/dashboard" 
          element={
            user && selectedGuild ? (
              <MainDashboard 
                user={user} 
                guildId={selectedGuild} 
                onBack={handleBackToSelection} 
                onLogout={handleLogout} 
              />
            ) : user ? (
              <Navigate to="/servers" replace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
