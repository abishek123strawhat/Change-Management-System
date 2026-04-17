import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Shield, 
  User as UserIcon, 
  LogOut, 
  Settings, 
  Bell,
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  Activity,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from './api';
import { Role, User, ChangeRequest } from './types';
import { FacultyDashboard } from './components/FacultyDashboard';
import { ApproverDashboard } from './components/ApproverDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { Analytics } from './components/Analytics';
import { UserApprovals } from './components/UserApprovals';
import { ErrorAlert } from './components/ui/ErrorAlert';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('cms_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('cms_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('cms_user');
    }
  }, [currentUser]);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // New states for search and notifications
  const [globalSearch, setGlobalSearch] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<Role | ''>('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regRegNum, setRegRegNum] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editRegNum, setEditRegNum] = useState('');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'approvals' | 'user-approvals' | 'analytics'>('dashboard');
  const [allRequests, setAllRequests] = useState<ChangeRequest[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [isFetchingRequests, setIsFetchingRequests] = useState(false);
  
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close menus and clear global search when switching tabs
  useEffect(() => {
    setShowProfileMenu(false);
    setShowNotifications(false);
    setGlobalSearch('');
  }, [activeTab]);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllRequests = useCallback(async () => {
    if (!currentUser) return;
    setIsFetchingRequests(true);
    setRequestsError(null);
    try {
      let roleParam = `role=${currentUser.role}`;
      if (currentUser.role === 'FACULTY') {
        roleParam += `&facultyId=${currentUser.id}`;
      } else if (currentUser.role === 'STUDENT') {
        roleParam += `&studentRegNum=${currentUser.student_reg_num?.trim()}`;
      }
      const res = await apiFetch(`/api/requests?${roleParam}`);
      if (!res.ok) throw new Error('Failed to fetch analytics data');
      const data = await res.json();
      setAllRequests(data);
    } catch (err) {
      console.error(err);
      setRequestsError(err instanceof Error ? err.message : 'An error occurred while fetching requests');
    } finally {
      setIsFetchingRequests(false);
    }
  }, [currentUser]);

  useEffect(() => {
    document.title = "Change Management System";
    if (currentUser) {
      fetchAllRequests();
    }
  }, [currentUser, fetchAllRequests]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      const res = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });
      
      let data;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned an invalid response. If you just updated the code, please restart your terminal server.');
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      setCurrentUser(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmittingReg(true);

    try {
      const res = await apiFetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: regName, 
          email: emailInput, 
          password: passwordInput, 
          role: regRole, 
          department: regDepartment, 
          student_reg_num: regRegNum 
        })
      });
      
      let data;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch {
        throw new Error('Server returned an invalid response (Missing API Route). YOU MUST RESTART YOUR DEV SERVER (`npm run dev`) in the terminal since the backend API was updated.');
      }
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      setIsRegistering(false);
      setError('Registration successful! Please wait for your administrator to approve your account before logging in.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!currentUser) return;
    setIsUpdatingProfile(true);
    setProfileUpdateError(null);
    try {
      const res = await apiFetch(`/api/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editName, 
          department: editDepartment, 
          student_reg_num: editRegNum 
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      
      setCurrentUser(data);
      setShowAccountSettings(false);
      setShowSaveConfirmation(false);
    } catch (err) {
      console.error(err);
      setProfileUpdateError(err instanceof Error ? err.message : 'Failed to update profile');
      setShowSaveConfirmation(false);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const changedFields = [];
  if (currentUser) {
    if (editName !== currentUser.name) changedFields.push('name');
    if (editDepartment !== (currentUser.department || '')) changedFields.push('department');
    if (currentUser.role === 'STUDENT' && editRegNum !== (currentUser.student_reg_num || '')) changedFields.push('registration number');
  }
  
  const changedFieldsText = changedFields.length > 0 
    ? changedFields.join(', ').replace(/, ([^,]*)$/, ' and $1')
    : 'profile information';

  const handleLogout = () => {
    setCurrentUser(null);
    setEmailInput('');
    setPasswordInput('');
    setRegName('');
    setRegRole('');
    setRegDepartment('');
    setRegRegNum('');
    setError('');
    setGlobalSearch('');
    setIsRegistering(false);
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden"
        >
          <div className="bg-brand-600 p-8 text-white text-center border-b border-brand-700">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30 shadow-lg">
              <Shield size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">Change Management System</h1>
            <p className="text-brand-100 mt-2 font-medium">Academic Workflow Portal</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-zinc-800">{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
              <p className="text-sm text-zinc-500 mt-1">{isRegistering ? 'Register for access to the portal' : 'Sign in with your institutional email'}</p>
            </div>

            {isRegistering ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Role</label>
                  <select 
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as Role)}
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all bg-white"
                    required
                  >
                    <option value="" disabled>Select Role</option>
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty</option>
                    <option value="HOD">HOD</option>
                  </select>
                </div>
                {regRole === 'STUDENT' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Registration Number</label>
                    <input 
                      type="text" 
                      value={regRegNum}
                      onChange={(e) => setRegRegNum(e.target.value)}
                      placeholder="e.g., 20EC101"
                      className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g., mail@institute.edu"
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                  <input 
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Create password"
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    required
                  />
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-2 text-xs p-3 rounded-lg border ${error.includes('successful') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'}`}
                  >
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    {error}
                  </motion.div>
                )}

                <button 
                  type="submit"
                  disabled={isSubmittingReg}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-900 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70"
                >
                  {isSubmittingReg ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Submit Registration"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Mail size={14} />
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g., faculty@gmail.com"
                  className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Lock size={14} />
                  Password
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    className="w-full p-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}

              <button 
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md active:scale-95 disabled:opacity-70"
              >
                {isLoggingIn ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
            )}

            <div className="text-center pt-2">
              <button 
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError('');
                }}
                className="text-sm text-brand-600 hover:text-brand-700 font-bold mt-2"
              >
                {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register here'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-3 text-brand-600">
            <Shield size={24} />
            <span className="font-bold text-lg tracking-tight">CMS Portal</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'dashboard' ? 'text-brand-600 bg-brand-50' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'requests' ? 'text-brand-600 bg-brand-50' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <ClipboardList size={20} />
            Requests
          </button>
          <button 
            onClick={() => setActiveTab('approvals')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'approvals' ? 'text-brand-600 bg-brand-50' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <CheckSquare size={20} />
            Approvals
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'analytics' ? 'text-brand-600 bg-brand-50' : 'text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            <Activity size={20} />
            Analytics
          </button>
          
          {['FACULTY', 'HOD', 'ACADEMIC'].includes(currentUser.role) && (
            <button 
              onClick={() => setActiveTab('user-approvals')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'user-approvals' ? 'text-brand-600 bg-brand-50' : 'text-zinc-500 hover:bg-zinc-50'
              }`}
            >
              <UserIcon size={20} />
              User Approvals
            </button>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 lg:hidden">
            <Shield className="text-brand-600" size={24} />
            <span className="font-bold">CMS</span>
          </div>
          
          <div className="flex-1 max-w-xl hidden md:block">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search requests..." 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-full px-10 py-2 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                <ClipboardList size={16} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative" ref={notificationsRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors relative"
              >
                <Bell size={20} />
                {notificationsEnabled && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-zinc-200 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
                      <h3 className="font-bold text-zinc-800">Notifications</h3>
                      <button 
                        onClick={() => setShowProfileMenu(true)}
                        className="text-xs text-brand-600 font-bold hover:underline"
                      >
                        Settings
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-2">
                      {!notificationsEnabled ? (
                        <div className="p-8 text-center">
                          <Bell className="mx-auto text-zinc-300 mb-2" size={32} />
                          <p className="text-sm text-zinc-500">Notifications are disabled</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="p-3 hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer border-l-4 border-brand-500">
                            <p className="text-sm font-bold text-zinc-800">System Update</p>
                            <p className="text-xs text-zinc-500">Welcome to the new CMS Portal!</p>
                            <p className="text-[10px] text-zinc-400 mt-1">Just now</p>
                          </div>
                          <div className="p-3 hover:bg-zinc-50 rounded-xl transition-colors cursor-pointer">
                            <p className="text-sm font-bold text-zinc-800">New Request</p>
                            <p className="text-xs text-zinc-500">Faculty DHANUSH S submitted a new request.</p>
                            <p className="text-[10px] text-zinc-400 mt-1">2 hours ago</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1.5 pl-3 hover:bg-zinc-100 rounded-full transition-all border border-transparent hover:border-zinc-200"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-zinc-800 leading-none">{currentUser.name}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-none">{currentUser.role}</p>
                </div>
                <div className="w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                  {currentUser.name.charAt(0)}
                </div>
                <ChevronDown size={14} className={`text-zinc-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200 z-50 overflow-hidden"
                  >
                    <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Signed in as</p>
                      <p className="text-sm font-bold text-zinc-800">{currentUser.name}</p>
                      <p className="text-xs text-zinc-500">{currentUser.email}</p>
                    </div>
                    
                    <div className="p-2">
                      <div className="px-3 py-2">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Preferences</p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Bell size={16} className="text-zinc-400" />
                              <span className="text-sm text-zinc-700">Notifications</span>
                            </div>
                            <button 
                              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                              className={`w-9 h-5 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-brand-600' : 'bg-zinc-300'}`}
                            >
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${notificationsEnabled ? 'right-1' : 'left-1'}`}></div>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-zinc-100 my-2"></div>

                      <button 
                        onClick={() => {
                          setEditName(currentUser.name);
                          setEditDepartment(currentUser.department || '');
                          setEditRegNum(currentUser.student_reg_num || '');
                          setShowAccountSettings(true);
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 rounded-xl transition-colors"
                      >
                        <Settings size={18} className="text-zinc-400" />
                        Account Settings
                      </button>

                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                      >
                        <LogOut size={18} />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                currentUser.role === 'FACULTY' ? (
                  <FacultyDashboard user={currentUser} searchTerm={globalSearch} hideImplemented={true} />
                ) : currentUser.role === 'STUDENT' ? (
                  <StudentDashboard user={currentUser} searchTerm={globalSearch} />
                ) : (
                  <ApproverDashboard user={currentUser} role={currentUser.role} searchTerm={globalSearch} />
                )
              )}

              {activeTab === 'requests' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-zinc-800">Change Requests</h2>
                    <p className="text-zinc-500 text-sm">View and track all academic change requests</p>
                  </div>
                  {currentUser.role === 'STUDENT' ? (
                    <StudentDashboard user={currentUser} searchTerm={globalSearch} />
                  ) : currentUser.role === 'FACULTY' ? (
                    <FacultyDashboard user={currentUser} searchTerm={globalSearch} hideImplemented={true} />
                  ) : (
                    <ApproverDashboard user={currentUser} role={currentUser.role} searchTerm={globalSearch} />
                  )}
                </div>
              )}

              {activeTab === 'approvals' && (
                currentUser.role === 'FACULTY' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-zinc-800">Approved Changes</h2>
                      <p className="text-zinc-500 text-sm">View your requests that have been successfully implemented</p>
                    </div>
                    <FacultyDashboard user={currentUser} searchTerm={globalSearch} filterStatus="IMPLEMENTED" />
                  </div>
                ) : currentUser.role === 'STUDENT' ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-zinc-800">Approved Changes</h2>
                      <p className="text-zinc-500 text-sm">View your requests that have been successfully implemented</p>
                    </div>
                    <StudentDashboard user={currentUser} searchTerm={globalSearch} filterStatus="IMPLEMENTED" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-zinc-800">Approval Workflow</h2>
                      <p className="text-zinc-500 text-sm">Manage pending approvals and review history</p>
                    </div>
                    <ApproverDashboard user={currentUser} role={currentUser.role} searchTerm={globalSearch} filterStatus="IMPLEMENTED" />
                  </div>
                )
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-zinc-800">Analytics Insights</h2>
                    <p className="text-zinc-500 text-sm">Real-time data visualization of academic changes</p>
                  </div>
                  <ErrorAlert message={requestsError} onClose={() => setRequestsError(null)} />
                  {isFetchingRequests ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
                      <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-zinc-500">Loading analytics...</p>
                    </div>
                  ) : (
                    <Analytics requests={allRequests} />
                  )}
                </div>
              )}

              {activeTab === 'user-approvals' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-zinc-800">User Approvals</h2>
                    <p className="text-zinc-500 text-sm">Review and approve new user registrations</p>
                  </div>
                  <UserApprovals currentUser={currentUser} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Account Settings Modal */}
      <AnimatePresence>
        {showAccountSettings && currentUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccountSettings(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden"
            >
              <div className="bg-brand-600 p-8 text-white relative">
                <button 
                  onClick={() => setShowAccountSettings(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <Lock size={20} />
                </button>
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-white/30">
                  <UserIcon size={40} />
                </div>
                <h3 className="text-2xl font-bold">Account Settings</h3>
                <p className="text-brand-100 text-sm">Manage your personal information</p>
              </div>
              
              <div className="p-8 space-y-6">
                <ErrorAlert message={profileUpdateError} onClose={() => setProfileUpdateError(null)} />
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Full Name</label>
                    <div className="flex items-center gap-3 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 focus-within:ring-2 focus-within:ring-brand-500 transition-all">
                      <UserIcon size={18} className="text-zinc-400" />
                      <input 
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm font-bold text-zinc-700 w-full"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email Address</label>
                    <div className="flex items-center gap-3 p-3.5 bg-zinc-50/50 rounded-2xl border border-zinc-100 opacity-60">
                      <Mail size={18} className="text-zinc-400" />
                      <span className="text-sm font-bold text-zinc-700">{currentUser.email}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Institutional Role</label>
                    <div className="flex items-center gap-3 p-3.5 bg-zinc-50/50 rounded-2xl border border-zinc-100 opacity-60">
                      <Shield size={18} className="text-zinc-400" />
                      <span className="text-sm font-bold text-zinc-700">{currentUser.role}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Department</label>
                    <div className="flex items-center gap-3 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 focus-within:ring-2 focus-within:ring-brand-500 transition-all">
                      <LayoutDashboard size={18} className="text-zinc-400" />
                      <input 
                        type="text"
                        value={editDepartment}
                        onChange={(e) => setEditDepartment(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm font-bold text-zinc-700 w-full"
                      />
                    </div>
                  </div>

                  {currentUser.role === 'STUDENT' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Registration Number</label>
                      <div className="flex items-center gap-3 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 focus-within:ring-2 focus-within:ring-brand-500 transition-all">
                        <ClipboardList size={18} className="text-zinc-400" />
                        <input 
                          type="text"
                          value={editRegNum}
                          onChange={(e) => setEditRegNum(e.target.value)}
                          className="bg-transparent border-none outline-none text-sm font-bold text-zinc-700 w-full"
                        />
                      </div>
                    </div>
                  )}

                  {currentUser.role !== 'STUDENT' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Faculty ID</label>
                      <div className="flex items-center gap-3 p-3.5 bg-zinc-50/50 rounded-2xl border border-zinc-100 opacity-60">
                        <ClipboardList size={18} className="text-zinc-400" />
                        <span className="text-sm font-bold text-zinc-700">{currentUser.id}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setShowAccountSettings(false)}
                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setShowSaveConfirmation(true)}
                    disabled={isUpdatingProfile}
                    className="flex-[2] bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-brand-200 active:scale-[0.98] disabled:opacity-70 flex items-center justify-center"
                  >
                    {isUpdatingProfile ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Save Confirmation Dialog */}
      <AnimatePresence>
        {showSaveConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveConfirmation(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-zinc-200 p-8 text-center"
            >
              <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-zinc-800 mb-2">Save Changes?</h3>
              <p className="text-sm text-zinc-500 mb-8">Are you sure you want to save your {changedFieldsText}? This action will update your institutional record.</p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSaveConfirmation(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold py-3 rounded-xl transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowSaveConfirmation(false);
                    handleUpdateProfile();
                  }}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-200 active:scale-[0.98]"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
