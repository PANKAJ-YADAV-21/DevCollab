import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Activity, 
  Server, 
  Database, 
  ShieldCheck, 
  Terminal, 
  RefreshCw, 
  Layers, 
  Users, 
  Cpu, 
  Menu,
  X,
  Lock,
  LogOut,
  User,
  Crown,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  LayoutGrid
} from 'lucide-react';
import axios from 'axios';
import AuthModal from './components/AuthModal';
import TeamsView from './components/TeamsView';
import ProjectsView from './components/ProjectsView';
import KanbanBoard from './components/KanbanBoard';

export default function App() {
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban', 'projects', 'teams', or 'overview'
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [errorHealth, setErrorHealth] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authentication state
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Check stored auth session on initial mount
  useEffect(() => {
    const storedToken = localStorage.getItem('devcollab_token');
    const storedUser = localStorage.getItem('devcollab_user');

    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      } catch (e) {
        localStorage.removeItem('devcollab_token');
        localStorage.removeItem('devcollab_user');
      }
    }

    // Set up axios interceptor to handle token expiry (401)
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (
          error.response?.status === 401 &&
          !error.config?.url?.includes('/api/auth/login') &&
          !error.config?.url?.includes('/api/auth/register')
        ) {
          handleLogout();
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('devcollab_token');
    localStorage.removeItem('devcollab_user');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  // Quick account switch helper for testing RBAC
  const handleQuickSwitch = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { user, token } = response.data.data;
      localStorage.setItem('devcollab_token', token);
      localStorage.setItem('devcollab_user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setCurrentUser(user);
    } catch (err) {
      console.error('Quick switch failed:', err);
    }
  };

  const fetchHealthCheck = async () => {
    setLoadingHealth(true);
    setErrorHealth(null);
    try {
      const response = await axios.get('/api/health');
      setHealthData(response.data);
    } catch (err) {
      console.error('Health check failed:', err);
      setErrorHealth(
        err.response?.data?.message || 
        'Could not reach backend API at localhost:5001. Ensure the backend server is running.'
      );
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealthCheck();
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Background ambient glow effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-15%] left-[20%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] rounded-full bg-sky-500/10 blur-[140px]" />
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-navy-950/80 border-b border-navy-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-navy-950 rounded-[10px] flex items-center justify-center">
                <Code2 className="w-5 h-5 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">DevCollab</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-sky-400 border border-blue-500/20">
                  Phase 5: Kanban & Tasks
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Developer Collaboration Platform</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-navy-900/80 p-1 rounded-xl border border-navy-700/60">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'kanban'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban Board
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'projects'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              Projects
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'teams'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Teams & RBAC
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-navy-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              System Status
            </button>
          </nav>

          {/* User Auth & Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2.5">
                {/* Quick Role Switcher Pills for Testing */}
                <div className="hidden lg:flex items-center gap-1 bg-navy-900 px-2 py-1 rounded-lg border border-navy-700/80 text-[11px] text-slate-400">
                  <span className="text-[10px] uppercase font-semibold mr-1 text-slate-500">Switch:</span>
                  <button
                    onClick={() => handleQuickSwitch('alex@devcollab.io', 'Password123!')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      currentUser.email === 'alex@devcollab.io' ? 'bg-blue-600 text-white' : 'hover:text-slate-200'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('sarah@devcollab.io', 'Password123!')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      currentUser.email === 'sarah@devcollab.io' ? 'bg-sky-600 text-white' : 'hover:text-slate-200'
                    }`}
                  >
                    Leader
                  </button>
                  <button
                    onClick={() => handleQuickSwitch('david@devcollab.io', 'Password123!')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      currentUser.email === 'david@devcollab.io' ? 'bg-emerald-600 text-white' : 'hover:text-slate-200'
                    }`}
                  >
                    Dev
                  </button>
                </div>

                <div className="flex items-center gap-2 pl-2 border-l border-navy-700">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-sky-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-semibold text-white block leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {currentUser.email}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg bg-navy-900 hover:bg-navy-800 border border-navy-700 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" /> Sign In
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg bg-navy-900 border border-navy-700"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-3 pb-4 bg-navy-900 border-b border-navy-700 flex flex-col gap-3">
            <button
              onClick={() => {
                setActiveTab('kanban');
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm py-1.5 text-slate-300 hover:text-sky-400 flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" /> Kanban Board
            </button>
            <button
              onClick={() => {
                setActiveTab('projects');
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm py-1.5 text-slate-300 hover:text-sky-400 flex items-center gap-2"
            >
              <FolderGit2 className="w-4 h-4" /> Projects
            </button>
            <button
              onClick={() => {
                setActiveTab('teams');
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm py-1.5 text-slate-300 hover:text-sky-400 flex items-center gap-2"
            >
              <Users className="w-4 h-4" /> Teams & RBAC
            </button>
            <button
              onClick={() => {
                setActiveTab('overview');
                setMobileMenuOpen(false);
              }}
              className="text-left text-sm py-1.5 text-slate-300 hover:text-sky-400 flex items-center gap-2"
            >
              <Layers className="w-4 h-4" /> System Status
            </button>
            {currentUser ? (
              <div className="pt-2 border-t border-navy-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">{currentUser.name} ({currentUser.email})</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
              >
                Sign In / Register
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {activeTab === 'kanban' ? (
          <KanbanBoard
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        ) : activeTab === 'projects' ? (
          <ProjectsView
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        ) : activeTab === 'teams' ? (
          <TeamsView
            currentUser={currentUser}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        ) : (
          <div className="space-y-10">
            {/* System Status View */}
            <section className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-sky-400">
                <Terminal className="w-3.5 h-3.5" />
                DevCollab Platform Architecture
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white">
                Platform Diagnostic & Status
              </h1>
            </section>

            {/* Health Status Card */}
            <section id="health-status" className="max-w-4xl mx-auto">
              <div className="bg-navy-900 border border-navy-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-navy-700/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-sky-400 border border-blue-500/20">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Full-Stack Connectivity Test</h2>
                      <p className="text-xs text-slate-400">Verifying live communication between React (Port 5173) and Express (Port 5001)</p>
                    </div>
                  </div>

                  <button
                    onClick={fetchHealthCheck}
                    disabled={loadingHealth}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                    {loadingHealth ? 'Pinging API...' : 'Ping Health Endpoint'}
                  </button>
                </div>

                <div className="mt-6">
                  {healthData && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 font-medium">
                          Backend API is healthy and responding with status: <span className="font-bold underline">{healthData.status}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                          <span className="text-slate-400 block mb-1">Service Name</span>
                          <span className="font-mono text-slate-200 font-semibold">{healthData.service || 'devcollab-api'}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                          <span className="text-slate-400 block mb-1">Server Timestamp</span>
                          <span className="font-mono text-slate-200">{healthData.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : 'N/A'}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                          <span className="text-slate-400 block mb-1">Uptime</span>
                          <span className="font-mono text-sky-400">{healthData.uptime ? `${Math.floor(healthData.uptime)}s` : 'active'}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-navy-950 border border-navy-800">
                          <span className="text-slate-400 block mb-1">MongoDB Status</span>
                          <span className={`font-mono font-semibold flex items-center gap-1.5 ${healthData.database?.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${healthData.database?.status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                            {healthData.database?.status || 'unknown'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-lg bg-navy-950 border border-navy-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                        <div className="text-slate-400 mb-1">// API Response Payload (GET /api/health)</div>
                        <pre className="text-sky-300">{JSON.stringify(healthData, null, 2)}</pre>
                      </div>
                    </div>
                  )}

                  {errorHealth && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <div className="font-semibold text-rose-200 mb-1">API Health Check Alert</div>
                        <p className="text-xs text-rose-300/90 mb-2">{errorHealth}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-navy-800/80 bg-navy-950 py-5 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>DevCollab – Developer Collaboration Platform</span>
          </div>
          <div>React 18 • Express • MongoDB • JWT • RBAC</div>
        </div>
      </footer>
    </div>
  );
}
