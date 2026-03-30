
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Category, Milestone, GrowthRecord, MedicalRecord, Expense, Trip, Caregiver, User, AppSettings } from './types';
import { checkSession, logout } from './services/auth';
import { initDB, getMilestones, getHealthRecords, getExpenses, getTrips, getCaregivers, getGrowthRecords, saveMilestone, saveHealthRecord, saveExpense, saveTrip, saveGrowthRecord, seedFamilyData, getSettings, checkAndGenerateRecurringExpenses, saveCaregiver, deleteExpense, deleteCaregiver } from './services/neon';
import { DevelopmentView } from './components/views/Development';
import { HealthView } from './components/views/Health';
import { FinanceView } from './components/views/Finance';
import { PlanningView } from './components/views/Planning';
import { CaregiversView } from './components/views/Caregivers';
import { AiAdvisorView } from './components/views/AiAdvisor';
import { AnalyticsView } from './components/views/Analytics';
import { SettingsView } from './components/views/Settings';
import { CalendarView } from './components/views/Calendar';
import { LoginView } from './components/views/Login';
import { DashboardView } from './components/views/Dashboard';
import { FloatingLines, PixelSnow, DotGrid, ColorBends, Prism } from './components/Backgrounds';
import { Activity, Heart, DollarSign, Sparkles, Map, Users, Bell, Moon, Sun, PieChart, Settings, Search, Home, MoreHorizontal, X, ShoppingBag, Briefcase, Gift, Plane, Syringe, Calendar, Thermometer, Pill, Menu, LogOut, Grid, Scissors, ShieldCheck, MessageSquareText, ChevronRight } from 'lucide-react';
import { Modal, Input, Button, Select, DatePicker, RadioGroup } from './components/UI';
import { translations, Language } from './translations';
import { STANDARD_MILESTONES, VACCINATION_SCHEDULE } from './constants';

const App: React.FC = () => {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // App State
  const [activeCategory, setActiveCategory] = useState<Category>(Category.Dashboard);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Deep Linking State
  const [deepLink, setDeepLink] = useState<{ id: string; type: string } | null>(null);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    const savedLang = localStorage.getItem('app_language') as 'en' | 'km';
    return { 
        font: 'sans', 
        density: 'comfortable', 
        accentColor: 'orange', 
        glassIntensity: 'high',
        language: savedLang || 'km',
        monthlyBudget: 0,
        cornerRadius: 'large',
        appStyle: 'glass',
        liveBackground: 'none'
    };
  });
  
  // Notifications
  const [notifications, setNotifications] = useState<{id: string, text: string, type: 'info'|'warning'|'success', time: string}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  const t = (key: keyof typeof translations['en']) => {
    const lang = (settings.language && translations[settings.language]) ? settings.language : 'km';
    return translations[lang][key] || key;
  };

  const handleLanguageChange = (lang: 'en' | 'km') => {
      setSettings(prev => ({...prev, language: lang}));
      localStorage.setItem('app_language', lang);
  };

  const [quickAddType, setQuickAddType] = useState<'Expense' | 'Health' | 'Trip' | 'Milestone' | null>(null);
  const [quickAddData, setQuickAddData] = useState<any>({});

  // Data State
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([]);
  const [healthRecords, setHealthRecords] = useState<MedicalRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);

  // Optimized Refresh Data with Scope support
  const refreshData = async (scope: string[] = ['all']) => {
    try {
      const promises = [];
      const fetchAll = scope.includes('all');

      if (fetchAll || scope.includes('milestones')) promises.push(getMilestones().then(m => setMilestones(m || [])));
      if (fetchAll || scope.includes('growth')) promises.push(getGrowthRecords().then(g => setGrowthRecords(g || [])));
      if (fetchAll || scope.includes('health')) promises.push(getHealthRecords().then(h => setHealthRecords(h || [])));
      if (fetchAll || scope.includes('expenses')) promises.push(getExpenses().then(e => setExpenses(e || [])));
      if (fetchAll || scope.includes('trips')) promises.push(getTrips().then(t => setTrips(t || [])));
      if (fetchAll || scope.includes('caregivers')) promises.push(getCaregivers().then(c => setCaregivers(c || [])));

      await Promise.all(promises);

      // Run expense generation in background after load if expenses were refreshed
      if ((fetchAll || scope.includes('expenses'))) {
          checkAndGenerateRecurringExpenses().then((updated) => {
              if (updated) {
                  getExpenses().then(newExpenses => setExpenses(newExpenses || []));
              }
          });
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    const checkNotifications = () => {
        const today = new Date().toISOString().split('T')[0];
        const newNotifs: typeof notifications = [];
        
        // Persistent sent ID tracking (survives app reopen)
        const sentIdsRaw = localStorage.getItem('sent_notifications');
        const sentIds = sentIdsRaw ? JSON.parse(sentIdsRaw) : [];
        let hasNewPush = false;
        console.log("Checking notifications. Existing sentIds:", sentIds);
        
        healthRecords.forEach(r => {
            if (r.date === today && r.status === 'Scheduled') {
                const id = `h-${r.id}`;
                const text = `${t('visitDue')}: ${r.title}`;
                newNotifs.push({ id, text, type: 'warning', time: 'Today' });
                
                if (!sentIds.includes(id)) { 
                    console.log("Pushing new health notification:", id);
                    sentIds.push(id); 
                    hasNewPush = true; 
                    if (Notification.permission === "granted") new Notification(t('appName'), { body: text }); 
                }
            }
        });

        // Improved Vaccine Notification Logic
        const children = caregivers.filter(c => c.role === 'Child');
        children.forEach(child => {
            if (!child.dateOfBirth) return;
            const dob = new Date(child.dateOfBirth);
            const now = new Date();
            const ageMonths = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
            
            // Get all done vaccines for this specific child
            const doneVaccines = healthRecords
                .filter(r => r.type === 'Vaccine' && r.status === 'Completed' && (r.memberId === child.id || (!r.memberId && children.length === 1)))
                .map(r => r.title.toLowerCase().trim());

            VACCINATION_SCHEDULE.forEach(item => {
                // Only notify if milestone age is reached
                if (item.ageMonths <= ageMonths) {
                    item.vaccines.forEach(v => {
                        const vKey = v.toLowerCase();
                        // Strictly check if not done already in DB
                        const isDone = doneVaccines.some(doneTitle => doneTitle.includes(vKey));
                        
                        if (!isDone) {
                            const id = `vax-${child.id}-${v}-${item.ageMonths}`;
                            const text = `${t('vaccinesDueNow')}: ${t(v as any)} (${item.ageMonths}m)`;
                            newNotifs.push({ id, text, type: 'warning', time: 'Urgent' });
                            
                            if (!sentIds.includes(id)) { 
                                console.log("Pushing new vaccine notification:", id);
                                sentIds.push(id); 
                                hasNewPush = true; 
                                if (Notification.permission === "granted") new Notification(t('vaccination_nav'), { body: text }); 
                            }
                        }
                    });
                }
            });
        });

        trips.forEach(trip => {
            if (trip.startDate === today && trip.status === 'Upcoming') {
                 const id = `t-${trip.id}`;
                 const text = `${t('upcoming')}: ${trip.title}`;
                 newNotifs.push({ id, text, type: 'success', time: 'Today' });
                 
                 if (!sentIds.includes(id)) { 
                    console.log("Pushing new trip notification:", id);
                    sentIds.push(id); 
                    hasNewPush = true; 
                    if (Notification.permission === "granted") new Notification(t('appName'), { body: text }); 
                }
            }
        });
        
        if (hasNewPush) {
            console.log("Updating sent_notifications in localStorage:", sentIds);
            localStorage.setItem('sent_notifications', JSON.stringify(sentIds));
        }
        
        if (newNotifs.length > 0) {
            const currentIds = notifications.map(n => n.id).join(',');
            const newIds = newNotifs.map(n => n.id).join(',');
            if (currentIds !== newIds) {
                setNotifications(newNotifs);
                setHasUnread(true);
                if ('setAppBadge' in navigator) { (navigator as any).setAppBadge(newNotifs.length).catch(() => {}); }
            }
        } else { 
            setNotifications([]);
            if ('clearAppBadge' in navigator) { (navigator as any).clearAppBadge().catch(() => {}); } 
        }
    };
    
    const interval = setInterval(checkNotifications, 30000);
    checkNotifications(); 
    return () => clearInterval(interval);
  }, [healthRecords, trips, expenses, settings.monthlyBudget, user, settings.language, caregivers]);

  useEffect(() => {
    if (user?.username) {
      getSettings(user.username).then(s => {
        if (s) { setSettings(prev => ({ ...s, language: prev.language })); }
      });
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      try {
        const session = checkSession();
        if (session) setUser(session);
        await initDB();
        if (session) { await seedFamilyData(); await refreshData(); }
      } catch (e) { console.error("Initialization Error:", e); } finally { setLoading(false); }
    };
    init();
  }, []);

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); }
  }, [darkMode]);

  useEffect(() => {
      const root = document.documentElement;
      let fontFamily = 'Outfit, sans-serif';
      if (settings.language === 'km') fontFamily = '"Battambang", "Outfit", sans-serif';
      else if (settings.font === 'serif') fontFamily = 'Georgia, serif';
      else if (settings.font === 'mono') fontFamily = 'Menlo, monospace';
      else if (settings.font === 'quicksand') fontFamily = '"Quicksand", sans-serif';
      else if (settings.font === 'inter') fontFamily = '"Inter", sans-serif';
      root.style.setProperty('--font-family', fontFamily);
      const colors: Record<string, string> = { indigo: '#4F46E5', rose: '#E11D48', blue: '#2563EB', emerald: '#059669', orange: '#F97316', violet: '#8B5CF6', cyan: '#06b6d4', fuchsia: '#d946ef', lime: '#84cc16', christmas: '#D42426' };
      const selectedHex = colors[settings.accentColor] || colors.orange;
      const r = parseInt(selectedHex.slice(1, 3), 16), g = parseInt(selectedHex.slice(3, 5), 16), b = parseInt(selectedHex.slice(5, 7), 16);
      root.style.setProperty('--color-primary', `${r} ${g} ${b}`);
      const radii: Record<string, string> = { small: '0.5rem', medium: '0.75rem', large: '1.5rem', full: '2.5rem' };
      const radius = radii[settings.cornerRadius || 'large'];
      root.style.setProperty('--radius-md', radius === '2.5rem' ? '1.5rem' : radius); 
      root.style.setProperty('--radius-lg', radius);
      root.style.setProperty('--radius-xl', radius === '0.5rem' ? '0.75rem' : '2.5rem');
      if (settings.appStyle === 'neumorphic') root.style.setProperty('--shadow-glass', '20px 20px 60px #d1d5db, -20px -20px 60px #ffffff');
      else root.style.setProperty('--shadow-glass', '0 8px 32px 0 rgba(31, 38, 135, 0.15)');
  }, [settings]);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) { localStorage.theme = 'dark'; } else { localStorage.theme = 'light'; }
  };

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('user_session', JSON.stringify(loggedInUser));
    await refreshData();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  };
  
  const handleQuickAddSubmit = async () => {
      if (!quickAddType) return;
      const id = Date.now().toString();
      // Close modal first for speed
      setQuickAddType(null); 
      
      if (quickAddType === 'Expense') {
          await saveExpense({ id, title: quickAddData.title, amount: parseFloat(quickAddData.amount), category: quickAddData.category || 'Toys', date: quickAddData.date || new Date().toISOString().split('T')[0], isSubscription: false });
          refreshData(['expenses']);
      }
      else if (quickAddType === 'Health') {
          await saveHealthRecord({ id, title: quickAddData.title, type: quickAddData.type || 'Visit', date: quickAddData.date || new Date().toISOString().split('T')[0], status: quickAddData.type === 'Medication' || quickAddData.type === 'Illness' ? 'Active' : 'Scheduled', notes: quickAddData.notes, time: quickAddData.time || '' });
          refreshData(['health']);
      }
      else if (quickAddType === 'Trip') {
          await saveTrip({ id, title: quickAddData.title, location: quickAddData.location, startDate: quickAddData.startDate, endDate: quickAddData.endDate, status: 'Planning', todos: [] });
          refreshData(['trips']);
      }
      else if (quickAddType === 'Milestone') {
          await saveMilestone({ id, title: quickAddData.title, category: quickAddData.category || 'Physical', ageMonth: parseInt(quickAddData.ageMonth || '0'), completed: true, dateCompleted: new Date().toISOString().split('T')[0] });
          refreshData(['milestones']);
      }
      setQuickAddData({});
  };

  const handleQuickAdd = (type: 'Expense' | 'Health' | 'Trip' | 'Milestone', data?: any) => {
    setQuickAddType(type);
    setQuickAddData(data || {});
  };
  
  const handleNavigate = (category: Category, id?: string, type?: string) => {
    if (id && type) setDeepLink({ id, type });
    setActiveCategory(category);
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { id: Category.Dashboard, icon: <Home size={20} /> },
    { id: Category.Calendar, icon: <Calendar size={20} /> },
    { id: Category.Development, icon: <Activity size={20} /> },
    { id: Category.Health, icon: <Heart size={20} /> },
    { id: Category.Finance, icon: <DollarSign size={20} /> },
    { id: Category.Planning, icon: <Map size={20} /> },
    { id: Category.Caregivers, icon: <Users size={20} /> },
    { id: Category.Analytics, icon: <PieChart size={20} /> },
    { id: Category.Assistant, icon: <Sparkles size={20} /> },
    { id: Category.Settings, icon: <Settings size={20} /> },
  ];

  const renderContent = () => {
    const commonProps = { isDark: darkMode, onRefresh: refreshData, t, lang: settings.language };
    const childProfile = caregivers.find(c => c.role === 'Child');
    const childDob = childProfile?.dateOfBirth;
    if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
    if (!user) return <LoginView onLogin={handleLogin} t={t} currentLang={settings.language} onLanguageChange={handleLanguageChange} />;
    switch (activeCategory) {
      case Category.Dashboard: return <DashboardView user={user} expenses={expenses} healthRecords={healthRecords} trips={trips} milestones={milestones} growthRecords={growthRecords} caregivers={caregivers} onNavigate={handleNavigate} onQuickAdd={handleQuickAdd} t={t} monthlyBudget={settings.monthlyBudget} loanStage={settings.loanStage} onRefresh={refreshData} />;
      case Category.Development: return <DevelopmentView milestones={milestones} onToggleMilestone={async (id) => { const m = milestones.find(x => x.id === id); if(m) { await saveMilestone({...m, completed: !m.completed, dateCompleted: !m.completed ? new Date().toISOString().split('T')[0] : undefined}); refreshData(['milestones']); } }} growthRecords={growthRecords} onAddGrowth={() => {}} onAddMilestone={() => { setQuickAddType('Milestone'); setQuickAddData({}); }} childDob={childDob} deepLink={deepLink} onConsumeDeepLink={() => setDeepLink(null)} {...commonProps} />;
      case Category.Health: return <HealthView records={healthRecords} caregivers={caregivers} deepLink={deepLink} onConsumeDeepLink={() => setDeepLink(null)} {...commonProps} />;
      case Category.Finance: return <FinanceView 
          expenses={expenses} 
          monthlyBudget={settings.monthlyBudget} 
          onUpdateSettings={setSettings} 
          settings={settings} 
          deepLink={deepLink} 
          onConsumeDeepLink={() => setDeepLink(null)} 
          onAddExpense={async (e) => { await saveExpense(e); refreshData(['expenses']); }}
          onDeleteExpense={async (id) => { await deleteExpense(id); refreshData(['expenses']); }}
          {...commonProps} 
      />;
      case Category.Planning: return <PlanningView trips={trips} {...commonProps} />;
      case Category.Caregivers: return <CaregiversView 
          caregivers={caregivers} 
          user={user} 
          onNavigate={handleNavigate} 
          onAddCaregiver={async (c) => { await saveCaregiver(c); refreshData(['caregivers']); }}
          onDeleteCaregiver={async (id) => { await deleteCaregiver(id); refreshData(['caregivers']); }}
          {...commonProps} 
      />;
      case Category.Analytics: return <AnalyticsView expenses={expenses} healthRecords={healthRecords} growthRecords={growthRecords} milestones={milestones} trips={trips} {...commonProps} />;
      case Category.Assistant: return <AiAdvisorView contextSummary={JSON.stringify({})} isDark={darkMode} lang={settings.language} />;
      case Category.Settings: return <SettingsView user={user} isDark={darkMode} onSettingsChange={(s) => { setSettings(s); localStorage.setItem('app_language', s.language); }} t={t} />;
      case Category.Calendar: return <CalendarView trips={trips} healthRecords={healthRecords} onQuickAdd={handleQuickAdd} {...commonProps} />;
      default: return null;
    }
  };

  const renderBackground = () => {
    switch (settings.liveBackground) {
        case 'floating-lines': return <FloatingLines />;
        case 'pixel-snow': return <PixelSnow />;
        case 'dot-grid': return <DotGrid />;
        case 'color-bends': return <ColorBends />;
        case 'prism': return <Prism />;
        default: return null;
    }
  }

  const isBackgroundActive = settings.liveBackground !== 'none';
  const containerBgClass = isBackgroundActive ? "bg-transparent" : "bg-slate-50 dark:bg-slate-900";

  return (
    <div className={`min-h-screen ${containerBgClass} transition-colors duration-300 font-${settings.font} overflow-x-hidden`}>
      {/* Hide mobile nav when keyboard is open (height small) */}
      <style>{`
        @media (max-height: 600px) {
          #mobile-bottom-nav { display: none !important; }
        }
      `}</style>
      
      {renderBackground()}
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[110] bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-300 p-8 pt-20">
              <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-8 right-8 p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200"><X size={24}/></button>
              <div className="grid grid-cols-2 gap-4">
                  {navItems.map(item => (
                      <button 
                        key={item.id} 
                        onClick={() => handleNavigate(item.id)}
                        className={`flex flex-col items-center justify-center p-6 rounded-[2rem] gap-3 font-black text-xs uppercase tracking-widest transition-all ${activeCategory === item.id ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-105' : 'bg-slate-50 dark:bg-white/5 text-slate-500'}`}
                      >
                          <div className={activeCategory === item.id ? 'text-white' : 'text-primary'}>{item.icon}</div>
                          {t(item.id.toLowerCase() as any)}
                      </button>
                  ))}
                  <button 
                    onClick={() => { logout(); window.location.reload(); }}
                    className="flex flex-col items-center justify-center p-6 rounded-[2rem] gap-3 font-black text-xs uppercase tracking-widest bg-red-50 dark:bg-red-900/10 text-red-500 col-span-2 mt-4"
                  >
                      <LogOut size={20}/> {t('signOut')}
                  </button>
              </div>
          </div>
      )}

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[60] px-6 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center text-white shadow-md"><Sparkles size={16} fill="currentColor" /></div><span className="text-lg font-bold tracking-tight">{t('appName')}</span></div>
          <div className="relative flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-50">
                  {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
              </button>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
                  <Bell size={24} className="text-slate-600 dark:text-slate-300" />
                  {hasUnread && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>}
              </button>
              {showNotifications && (
                  <div className="absolute right-0 top-12 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in slide-in-from-top-2 z-50">
                      <div className="p-3 border-b flex justify-between items-center bg-slate-50 dark:bg-white/5"><span className="font-bold text-sm">{t('notifications')}</span><button onClick={() => { setHasUnread(false); setNotifications([]); if('clearAppBadge' in navigator) (navigator as any).clearAppBadge(); }} className="text-xs text-primary font-bold">{t('markAllRead')}</button></div>
                      <div className="max-h-64 overflow-y-auto">
                          {notifications.length > 0 ? notifications.map(n => (<div key={n.id} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-slate-800 flex gap-3"><div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${n.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div><div><p className="text-sm font-medium leading-snug">{n.text}</p><p className="text-xs text-slate-400 mt-1">{n.time}</p></div></div>)) : (<div className="p-6 text-center text-slate-400 text-sm">{t('noNotifications')}</div>)}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`fixed left-0 top-0 bottom-0 w-64 ${isBackgroundActive ? 'bg-white/40 dark:bg-slate-900/40' : 'bg-white/90 dark:bg-slate-900/90'} backdrop-blur-xl border-r border-slate-100 dark:border-slate-800 hidden md:flex flex-col z-[60]`}>
          <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Sparkles size={20} fill="currentColor" /></div><span className="text-xl font-extrabold tracking-tight">{t('appName')}</span></div>
          </div>
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
              {navItems.map(item => (
                  <button key={item.id} onClick={() => setActiveCategory(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeCategory === item.id ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                      <span className={activeCategory === item.id ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                      <span className="truncate">{t(item.id.toLowerCase() as any)}</span>
                  </button>
              ))}
          </nav>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                  {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-slate-600" />}
                  <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              <button onClick={() => { logout(); window.location.reload(); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-all">
                  <LogOut size={20} />
                  <span>{t('signOut')}</span>
              </button>
          </div>
      </aside>

      {/* Main Content */}
      <main className="md:pl-64 min-h-screen transition-all pb-24 md:pb-8 pt-[calc(env(safe-area-inset-top)+80px)] md:pt-0 relative z-10">
          <div className="p-2 md:p-8 max-w-7xl mx-auto">{renderContent()}</div>
      </main>

      {/* Mobile Tab Bar - FIXED GRID LAYOUT */}
      <div id="mobile-bottom-nav" className={`md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-[420px] h-[72px] ${isBackgroundActive ? 'bg-white/60 dark:bg-slate-900/60' : 'bg-white/80 dark:bg-slate-900/80'} backdrop-blur-xl rounded-full shadow-2xl border border-white/40 dark:border-slate-700/50 z-[70] grid grid-cols-6 px-2 pb-1 transition-transform duration-300`}>
           {[Category.Dashboard, Category.Calendar, Category.Development, Category.Health, Category.Finance].map(id => (
               <button key={id} onClick={() => handleNavigate(id)} className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${activeCategory === id ? 'text-white scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                   {activeCategory === id && <div className="absolute inset-1.5 bg-primary rounded-full shadow-lg shadow-primary/40 -z-10 animate-in zoom-in duration-200"></div>}
                   {id === Category.Dashboard ? <Home size={22} /> : id === Category.Calendar ? <Calendar size={22} /> : id === Category.Development ? <Activity size={22} /> : id === Category.Health ? <Heart size={22} /> : <DollarSign size={22} />}
               </button>
           ))}
           <button onClick={() => setIsMobileMenuOpen(true)} className="flex items-center justify-center text-slate-400 hover:text-slate-600">
               <Grid size={22} />
           </button>
      </div>

      {/* Global Quick Add Modal */}
      {quickAddType && (
          <Modal isOpen={true} onClose={() => setQuickAddType(null)} title={`${t('quickAdd')} ${t(quickAddType.toLowerCase() as any)}`}>
              <div className="space-y-4">
                  <Input label={t('title')} value={quickAddData.title || ''} onChange={e => setQuickAddData({...quickAddData, title: e.target.value})} autoFocus />
                  {quickAddType === 'Expense' && (
                      <Input label={t('amount')} type="number" value={quickAddData.amount || ''} onChange={e => setQuickAddData({...quickAddData, amount: e.target.value})} />
                  )}
                  {quickAddType === 'Health' && (
                       <Select label={t('category')} options={['Visit', 'Vaccine', 'Medication', 'Illness', 'Grooming'].map(v => ({value: v, label: t(v.toLowerCase() as any) || v}))} value={quickAddData.type || 'Visit'} onChange={e => setQuickAddData({...quickAddData, type: e.target.value})} />
                  )}
                  <DatePicker label={t('date')} value={quickAddData.date || new Date().toISOString().split('T')[0]} onChange={e => setQuickAddData({...quickAddData, date: e.target.value})} />
                  <div className="flex justify-end pt-4">
                      <Button onClick={handleQuickAddSubmit}>{t('save')}</Button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};

export default App;
