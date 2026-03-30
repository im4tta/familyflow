
import React, { useState, useMemo } from 'react';
import { Expense, MedicalRecord, Trip, User, Milestone, GrowthRecord, Caregiver, Category } from '../../types';
import { Card, Badge, Button, Modal, Input, DatePicker, RadioGroup } from '../UI';
import { Activity, Plus, DollarSign, Heart, ArrowRight, Map, Sparkles, Edit2, AlertTriangle, Cake, Droplet, RefreshCw, Loader2, Calendar as CalendarIcon, MapPin, ChevronRight, Clock, Bell, Thermometer, CheckCircle, Pill, Check, ShieldCheck, TrendingUp, User as UserIcon, FileText, ShoppingBag, Gift, Plane, Scissors, Syringe, Briefcase, ShieldAlert, Timer, Send, Bot, Layers, Landmark } from 'lucide-react';
import { saveCaregiver, saveHealthRecord, saveExpense } from '../../services/neon';
import { getKhmerLunarDate } from '../../services/khmerCalendar';
import { parseQuickAction } from '../../services/geminiService';
import { VACCINATION_SCHEDULE } from '../../constants';

interface Props {
  user: User;
  expenses: Expense[];
  healthRecords: MedicalRecord[];
  trips: Trip[];
  milestones: Milestone[];
  growthRecords: GrowthRecord[];
  caregivers: Caregiver[];
  onNavigate: (category: Category, id?: string, type?: string) => void;
  onQuickAdd: (type: 'Expense' | 'Health' | 'Trip' | 'Milestone') => void;
  onRefresh: () => void;
  t: (key: any) => string;
  monthlyBudget: number;
  loanStage?: number;
}

export const DashboardView: React.FC<Props> = ({ user, expenses, healthRecords, trips, milestones, growthRecords, caregivers, onNavigate, onQuickAdd, onRefresh, t, monthlyBudget, loanStage }) => {
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [isChildEditModalOpen, setIsChildEditModalOpen] = useState(false);
  const [isSavingChild, setIsSavingChild] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [childFormData, setChildFormData] = useState<Partial<Caregiver>>({});
  const [activityFilter, setActivityFilter] = useState<'All' | 'Finance' | 'Health' | 'Development'>('All');
  
  // AI Command State
  const [aiCommand, setAiCommand] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  // Monthly Spending Calculation
  const totalSpent = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
    const currentMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonthPrefix));
    return currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [expenses]);

  const budgetProgress = monthlyBudget > 0 ? Math.min((totalSpent / monthlyBudget) * 100, 100) : 0;
  
  const recentExpense = expenses.length > 0 ? expenses[0] : null;
  const nextMilestone = milestones.filter(m => !m.completed).sort((a,b) => a.ageMonth - b.ageMonth)[0];
  
  const activeHealthIssues = useMemo(() => {
    return healthRecords
        .filter(r => (r.type === 'Illness' || r.type === 'Medication') && (r.status === 'Active' || r.status === 'Recovering'))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [healthRecords]);
  
  const nextAppointment = useMemo(() => {
     return healthRecords
        .filter(r => r.status === 'Scheduled' && new Date(r.date) >= new Date(new Date().setHours(0,0,0,0)))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [healthRecords]);

  const todayKhmer = useMemo(() => getKhmerLunarDate(new Date()), []);
  const childProfile = caregivers.find(c => c.role === 'Child');
  const latestGrowth = growthRecords[growthRecords.length - 1];

  // Helper for recurring dates (copied from FinanceView logic for consistency)
  const getNextBillingDate = (start: string, freq?: string) => {
    const startDate = new Date(start);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let nextDate = new Date(startDate);
    if (nextDate >= today) return nextDate;

    // Safety break
    let safety = 0;
    while (nextDate < today && safety < 1000) {
        if (freq === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (freq === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
        else {
             const expectedDay = nextDate.getDate();
             nextDate.setMonth(nextDate.getMonth() + 1);
             if (nextDate.getDate() !== expectedDay) {
                 nextDate.setDate(0); 
             }
        }
        safety++;
    }
    return nextDate;
  };

  const upcomingEvents = useMemo(() => {
    const events: { id: string, title: string, date: string, type: 'Trip' | 'Health' | 'Vaccine' | 'Expense', icon: React.ReactNode, sub: string, color: string, isOverdue?: boolean }[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    trips.filter(t => t.status === 'Upcoming' || t.status === 'Planning').forEach(t => {
       const d = new Date(t.startDate);
       if (d >= today) {
           events.push({
               id: t.id,
               title: t.title,
               date: t.startDate,
               type: 'Trip',
               icon: <Map size={14} />,
               sub: t.location,
               color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
           });
       }
    });

    // Exclude 'Active' status from upcoming list as requested
    healthRecords.filter(h => h.status === 'Scheduled' || h.status === 'Overdue').forEach(h => {
        const d = new Date(h.date);
        const isScheduledButPast = h.status === 'Scheduled' && d < today;
        
        if (d >= today || h.status === 'Overdue' || isScheduledButPast) {
            events.push({
                id: h.id,
                title: h.title,
                date: h.date,
                type: 'Health',
                icon: h.type === 'Illness' ? <Thermometer size={14}/> : <Heart size={14} />,
                sub: h.doctorName || t(h.type.toLowerCase() as any),
                color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
                isOverdue: h.status === 'Overdue' || isScheduledButPast
            });
        }
    });

    if (childProfile && childProfile.dateOfBirth) {
        const dob = new Date(childProfile.dateOfBirth);
        const completedVaccines = healthRecords
            .filter(r => r.type === 'Vaccine' && r.status === 'Completed' && r.memberId === childProfile.id)
            .map(r => r.title.toLowerCase());

        VACCINATION_SCHEDULE.forEach(item => {
            const dueDate = new Date(dob);
            dueDate.setMonth(dueDate.getMonth() + item.ageMonths);
            item.vaccines.forEach(v => {
                const isDone = completedVaccines.some(cv => cv.includes(v.toLowerCase()));
                if (!isDone) {
                    const isPastDue = dueDate < today;
                    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (isPastDue || diffDays <= 45) {
                        events.push({
                            id: `vax-due-${v}-${item.ageMonths}`,
                            title: t(v as any),
                            date: dueDate.toISOString().split('T')[0],
                            type: 'Vaccine',
                            icon: <Syringe size={14} />,
                            sub: `${item.ageMonths}m ${t('vaccine')}`,
                            color: isPastDue ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
                            isOverdue: isPastDue
                        });
                    }
                }
            });
        });
    }

    // Add Expenses (Subscriptions)
    expenses.filter(e => e.isSubscription && e.status === 'Active').forEach(e => {
        const nextDate = getNextBillingDate(e.date, e.frequency);
        const dateStr = nextDate.toISOString().split('T')[0];
        
        events.push({
            id: e.id,
            title: e.title,
            date: dateStr,
            type: 'Expense',
            icon: <DollarSign size={14} />,
            sub: `$${e.amount.toFixed(2)}`,
            color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
        });
    });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 6);
  }, [trips, healthRecords, t, childProfile, expenses]);
  
  const todaysAgenda = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      return upcomingEvents.filter(e => e.date === today)[0] || null;
  }, [upcomingEvents]);

  const allActivities = useMemo(() => {
    const activity: any[] = [];
    expenses.forEach(e => activity.push({ id: `exp-${e.id}`, rawId: e.id, date: e.date, title: e.title, type: 'Expense', amount: e.amount, icon: <DollarSign size={14}/>, category: Category.Finance }));
    healthRecords.forEach(h => activity.push({ id: `hlth-${h.id}`, rawId: h.id, date: h.date, title: h.title, type: h.type, icon: h.type === 'Illness' ? <Thermometer size={14}/> : h.type === 'Vaccine' ? <Syringe size={14}/> : <Heart size={14}/>, category: Category.Health }));
    milestones.filter(m => m.completed && m.dateCompleted).forEach(m => activity.push({ id: `mil-${m.id}`, rawId: m.id, date: m.dateCompleted!, title: m.title, type: 'Milestone', icon: <CheckCircle size={14}/>, category: Category.Development }));
    growthRecords.forEach(g => activity.push({ id: `growth-${g.id}`, rawId: g.id, date: g.date, title: `${g.heightCm}cm / ${g.weightKg}kg`, type: 'Growth', icon: <Activity size={14}/>, category: Category.Development }));
    return activity.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, healthRecords, milestones, growthRecords]);

  const displayedActivities = useMemo(() => {
    return allActivities.filter(item => {
        if (activityFilter === 'All') return true;
        if (activityFilter === 'Finance') return item.category === Category.Finance;
        if (activityFilter === 'Health') return item.category === Category.Health;
        if (activityFilter === 'Development') return item.category === Category.Development;
        return true;
    }).slice(0, 8);
  }, [allActivities, activityFilter]);

  const ageDisplay = calculateAge(childProfile?.dateOfBirth) || (latestGrowth ? `${latestGrowth.ageMonths} ${t('months')}` : `2 ${t('years')}`);

  function calculateAge(dob?: string) {
    if(!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    const diff = now.getTime() - birth.getTime();
    if (diff < 0) return t('notBorn'); 
    const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 1) return t('lessThanMonth');
    if (months < 24) return `${months} ${t('months')}`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years}${t('years').substring(0,1)} ${remainingMonths}${t('months').substring(0,1)}` : `${years} ${t('years')}`;
  }

  const getDuration = (dateStr: string) => {
      const start = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays;
  };

  const handleQuickRecover = async (record: MedicalRecord, e: React.MouseEvent) => {
      e.stopPropagation();
      if(window.confirm(t('markRecoveredConfirm'))) {
          await saveHealthRecord({
              ...record,
              status: 'Recovered',
              endDate: new Date().toISOString().split('T')[0]
          });
          onRefresh();
      }
  };

  const handleAiAction = async () => {
    if (!aiCommand.trim()) return;
    setIsAiProcessing(true);
    setAiSuccessMessage('');
    
    const result = await parseQuickAction(aiCommand);
    if (result && result.actionType && result.data) {
        const id = Date.now().toString();
        if (result.actionType === 'Expense') {
            await saveExpense({
                id,
                title: result.data.title,
                amount: result.data.amount,
                category: result.data.category || 'Toys',
                date: result.data.date || new Date().toISOString().split('T')[0],
                isSubscription: false
            });
            setAiSuccessMessage(`Recorded expense: ${result.data.title} $${result.data.amount}`);
        } else if (result.actionType === 'Health') {
            await saveHealthRecord({
                id,
                title: result.data.title,
                type: result.data.category as any || 'Illness',
                status: result.data.status as any || 'Active',
                date: result.data.date || new Date().toISOString().split('T')[0],
                memberId: childProfile?.id
            });
             setAiSuccessMessage(`Logged health event: ${result.data.title}`);
        }
        setAiCommand('');
        onRefresh();
        setTimeout(() => setAiSuccessMessage(''), 4000);
    }
    setIsAiProcessing(false);
  };

  const handleChildSave = async () => {
    if (!childFormData.name || !childFormData.id) return;
    setIsSavingChild(true);
    try {
      const caregiverToSave: Caregiver = {
          id: childFormData.id,
          name: childFormData.name,
          role: childFormData.role || 'Child',
          phone: childFormData.phone || '',
          email: childFormData.email || '',
          accessLevel: childFormData.accessLevel || 'ViewOnly',
          lastActive: childFormData.lastActive || 'Just now',
          photoUrl: childFormData.photoUrl || '',
          dateOfBirth: childFormData.dateOfBirth || '',
          bloodType: childFormData.bloodType || '',
          allergies: childFormData.allergies || '',
          doctorName: childFormData.doctorName || ''
      };
      await saveCaregiver(caregiverToSave);
      onRefresh();
      setIsChildEditModalOpen(false);
    } catch (error) {
      console.error("Error saving child profile:", error);
    } finally {
      setIsSavingChild(false);
    }
  };

  // Loan Logic Mirror for Dashboard
  const appDate = new Date('2025-12-30');
  const todayDate = new Date();
  const diffTime = Math.abs(todayDate.getTime() - appDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const daysPassed = todayDate < appDate ? 0 : diffDays;
  
  let autoStage = 0;
  if (daysPassed < 1) autoStage = 0;
  else if (daysPassed < 4) autoStage = 1;
  else if (daysPassed < 10) autoStage = 2;
  else if (daysPassed < 20) autoStage = 3;
  else if (daysPassed < 40) autoStage = 4;
  else autoStage = 5;

  const displayLoanStage = (loanStage !== undefined && loanStage !== -1) ? loanStage : autoStage;
  const loanStageNames = [t('loan_step_1'), t('loan_step_2'), t('loan_step_3'), t('loan_step_4'), t('loan_step_5'), t('loan_step_6')];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
      
      {/* AI Quick Command Bar */}
      <div className="relative z-40">
           <div className={`bg-white dark:bg-dark-card rounded-[2rem] p-2 flex items-center gap-3 border shadow-lg transition-all ${isAiProcessing ? 'border-primary ring-4 ring-primary/10' : 'border-slate-100 dark:border-slate-700'}`}>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {isAiProcessing ? <Loader2 className="animate-spin" size={24}/> : <Bot size={24}/>}
                </div>
                <input 
                    type="text" 
                    placeholder="Try 'Buy milk $3' or 'Baby has a fever'..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm md:text-base font-bold text-slate-800 dark:text-white placeholder-slate-400"
                    value={aiCommand}
                    onChange={(e) => setAiCommand(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiAction()}
                />
                <button 
                    onClick={handleAiAction}
                    disabled={isAiProcessing || !aiCommand.trim()}
                    className="p-3 bg-primary text-white rounded-2xl shadow-md hover:bg-orange-600 active:scale-90 transition-all disabled:opacity-50"
                >
                    <Send size={20}/>
                </button>
           </div>
           {aiSuccessMessage && (
               <div className="absolute top-full left-0 right-0 mt-2 px-6 py-2 bg-emerald-500 text-white text-xs font-black rounded-full shadow-lg text-center animate-in slide-in-from-top-2 fade-in">
                   {aiSuccessMessage}
               </div>
           )}
      </div>

      {/* Welcome Banner */}
      <div className="relative z-30 bg-gradient-to-br from-primary via-orange-600 to-orange-700 rounded-2xl p-6 text-white shadow-lg group border border-white/10">
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute top-[-30%] right-[-10%] w-64 h-64 bg-white opacity-[0.08] rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute bottom-[-30%] left-[-10%] w-64 h-64 bg-orange-400 opacity-[0.15] rounded-full blur-3xl animate-float"></div>
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <div className="flex items-center gap-2 mb-1 opacity-80">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm">{t('dashboard')}</span>
                </div>
                <div className="flex flex-col mb-3">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-0.5 drop-shadow-sm">{t('hello')}, {user.name}!</h2>
                    <p className="text-orange-50/90 text-xs font-medium font-['Battambang'] flex items-center gap-2">
                         <CalendarIcon size={12} className="opacity-70"/> 
                         {todayKhmer.fullDate}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-orange-50 text-xs font-medium opacity-90 max-w-sm leading-relaxed">{t('whatsHappening')}</p>
                    <button onClick={async () => {setIsSyncing(true); await onRefresh(); setIsSyncing(false);}} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full transition-all hover:scale-110 text-white/80 hover:text-white shadow-sm backdrop-blur-md">
                        <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                    </button>
                    {todaysAgenda && (
                        <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold shadow-sm border border-white/20 animate-slide-up cursor-pointer hover:bg-white/30 transition-colors" onClick={() => onNavigate(todaysAgenda.type === 'Trip' ? Category.Planning : todaysAgenda.type === 'Expense' ? Category.Finance : Category.Health, todaysAgenda.id, todaysAgenda.type)}>
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                            {t('today')}: {todaysAgenda.title}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="relative self-end md:self-auto">
                <Button variant="glass" size="sm" icon={<Plus size={14}/>} onClick={() => setShowQuickAddMenu(!showQuickAddMenu)} className="whitespace-nowrap font-bold border-2 border-white/30 hover:bg-white/20 shadow-lg backdrop-blur-xl">
                    {t('quickAdd')}
                </Button>
                {showQuickAddMenu && (
                    <div className="absolute right-0 top-12 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-1 min-w-[200px] border border-slate-100 dark:border-slate-700 z-50 animate-in fade-in slide-in-from-top-2 zoom-in-95 origin-top-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 mb-0.5">{t('create')}</div>
                        <div className="space-y-0.5">
                            {[
                                { type: 'Expense', label: t('addExpense'), icon: <DollarSign size={14}/>, color: 'text-green-600 bg-green-100' },
                                { type: 'Health', label: t('addRecord'), icon: <Heart size={14}/>, color: 'text-rose-600 bg-rose-100' },
                                { type: 'Trip', label: t('newTrip'), icon: <Map size={14}/>, color: 'text-blue-600 bg-blue-100' },
                                { type: 'Milestone', label: t('addMilestone'), icon: <Activity size={14}/>, color: 'text-orange-600 bg-orange-100' }
                            ].map((item) => (
                                <button key={item.type} onClick={() => {onQuickAdd(item.type as any); setShowQuickAddMenu(false);}} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-white transition-all group active:scale-95">
                                    <div className={`p-1.5 rounded-md group-hover:scale-110 transition-transform shadow-sm ${item.color}`}>{item.icon}</div> 
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      {/* Dashboard Content List */}
      <div className="space-y-4">
          
          {/* Active Health Issues Card */}
          {activeHealthIssues.length > 0 && (
              <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-rose-100 dark:border-rose-900/30 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer" onClick={() => onNavigate(Category.Health)}>
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="text-[10px] font-black flex items-center gap-1.5 text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                          <Activity size={12} className="animate-pulse" /> {t('healthStatus')}
                      </h3>
                      <Badge color="red" className="shadow-sm animate-pulse text-[9px]">{activeHealthIssues.length} Active</Badge>
                  </div>

                  <div className="space-y-1.5">
                      {activeHealthIssues.slice(0, 3).map(issue => (
                          <div key={issue.id} className="bg-rose-50 dark:bg-rose-900/10 p-1.5 rounded-lg border border-rose-100 dark:border-rose-900/30 flex items-center gap-2 group/item">
                              <div className="p-1.5 bg-white dark:bg-rose-900/30 text-rose-500 rounded-md shadow-sm">
                                  {issue.type === 'Medication' ? <Pill size={12} /> : <Thermometer size={12} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-800 dark:text-rose-100 truncate text-[10px]">{issue.title}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-[9px] font-bold text-rose-500 uppercase bg-white/50 dark:bg-black/20 px-1 py-0 rounded">{t(issue.status.toLowerCase() as any)}</span>
                                      <span className="text-[9px] text-slate-500 dark:text-rose-200/70 font-medium">
                                          {getDuration(issue.date)} {t('days')}
                                      </span>
                                  </div>
                              </div>
                              {issue.status === 'Active' && (
                                  <button 
                                    onClick={(e) => handleQuickRecover(issue, e)}
                                    className="p-1 bg-white dark:bg-rose-900/50 text-emerald-500 rounded-full shadow-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all opacity-0 group-hover/item:opacity-100"
                                    title={t('markRecovered')}
                                  >
                                      <Check size={10} strokeWidth={3} />
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          )}

          <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-md rounded-xl p-3 border border-white/60 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => onNavigate(Category.Development)}>
               <div className="flex flex-row items-center gap-2 relative z-10">
                   <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-br from-blue-400 to-orange-500 shadow-sm">
                       <img src={childProfile?.photoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=child"} alt={childProfile?.name || "Child"} className="w-full h-full rounded-full bg-white object-cover" />
                   </div>
                   <div className="flex-1">
                       <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-0 tracking-tight">{childProfile?.name || "Child"}</h3>
                       <div className="flex flex-wrap gap-1">
                           <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-600 dark:text-blue-300 text-[9px] font-bold flex items-center border border-blue-100">
                               <Cake size={9} className="mr-0.5" /> {ageDisplay}
                           </span>
                       </div>
                   </div>
                   <button onClick={(e) => {e.stopPropagation(); setChildFormData(childProfile || {}); setIsChildEditModalOpen(true);}} className="p-1.5 bg-slate-100 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-primary shadow-sm">
                       <Edit2 size={12} />
                   </button>
               </div>
          </div>
          
          <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-md rounded-xl p-3 border border-white/60 dark:border-slate-700 shadow-sm flex flex-col cursor-pointer group hover:shadow-md transition-all" onClick={() => onNavigate(Category.Calendar)}>
              <div className="flex justify-between items-center mb-2">
                  <h3 className="text-[10px] font-black flex items-center gap-1.5 text-slate-800 dark:text-slate-200 uppercase tracking-wider"><Timer size={12} className="text-primary"/> {t('upcoming')}</h3>
                  <ArrowRight size={10} className="text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1 space-y-1">
                  {upcomingEvents.length > 0 ? upcomingEvents.map(evt => (
                      <div key={evt.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg" onClick={(e) => {
                          e.stopPropagation(); 
                          let cat = Category.Health;
                          if (evt.type === 'Trip') cat = Category.Planning;
                          if (evt.type === 'Expense') cat = Category.Finance;
                          onNavigate(cat, evt.id, evt.type);
                      }}>
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${evt.color}`}>
                              {evt.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                               <p className="font-bold text-[10px] truncate text-slate-800 dark:text-slate-200">{evt.title}</p>
                               <div className="flex items-center gap-1">
                                   <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">{evt.date}</p>
                                   {evt.type === 'Expense' && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-1 rounded">{evt.sub}</span>}
                               </div>
                          </div>
                      </div>
                  )) : <div className="text-center py-2 text-slate-400 text-[10px] italic">{t('noEvents')}</div>}
              </div>
          </div>

          {/* Home Loan Card */}
          <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-md rounded-xl p-3 border border-white/60 dark:border-slate-700 shadow-sm flex flex-col cursor-pointer group hover:shadow-md transition-all" onClick={() => onNavigate(Category.Finance, 'loan-tracker', 'Loan')}>
              <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-black flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                      <Landmark size={14} className="text-blue-600" /> {t('homeLoan')}
                  </h3>
                  <div className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-md text-[9px] font-bold border border-blue-200 dark:border-blue-800">
                      {displayLoanStage >= 0 ? `${t('stage') || 'Stage'} ${displayLoanStage + 1}` : t('pending')}
                  </div>
              </div>
              <div className="mt-0.5">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">{t('status')}</p>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {displayLoanStage >= 0 ? 
                        loanStageNames[displayLoanStage] || t('completed')
                        : t('tapToTrack')}
                  </h3>
              </div>
          </div>
          
           <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-md rounded-xl p-3 border border-white/60 dark:border-slate-700 shadow-sm flex flex-col relative overflow-hidden cursor-pointer group hover:shadow-md transition-all" onClick={() => onNavigate(Category.Finance)}>
              <div className="flex justify-between items-start mb-1 relative z-10">
                  <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-md">
                      <DollarSign size={12} />
                  </div>
                  <Badge color="green" className="text-[9px]">{t('monthly')}</Badge>
              </div>
              <div className="mt-0.5 relative z-10">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">{t('spent')}</p>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">${totalSpent.toFixed(0)}</h3>
              </div>
          </div>
      </div>

      {/* Quick Action List */}
      <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onNavigate(Category.Development)} className="p-2 bg-white dark:bg-dark-card border border-slate-100 dark:border-slate-700 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all group">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Activity size={16} />
              </div>
              <span className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{t('growth')}</span>
          </button>
          <button onClick={() => onNavigate(Category.Planning)} className="p-2 bg-white dark:bg-dark-card border border-slate-100 dark:border-slate-700 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all group">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Map size={16} />
              </div>
              <span className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-blue-500 transition-colors">{t('planning')}</span>
          </button>
          <button onClick={() => onNavigate(Category.Caregivers)} className="p-2 bg-white dark:bg-dark-card border border-slate-100 dark:border-slate-700 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all group">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserIcon size={16} />
              </div>
              <span className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-amber-500 transition-colors">{t('family')}</span>
          </button>
          <button onClick={() => onNavigate(Category.Assistant)} className="p-2 bg-white dark:bg-dark-card border border-slate-100 dark:border-slate-700 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all group">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Sparkles size={16} />
              </div>
              <span className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-orange-500 transition-colors">{t('ai')}</span>
          </button>
      </div>

      {/* Recent Activity Feed */}
      <Card 
          title={t('recentActivity')} 
          className="!p-0 overflow-hidden" 
          noPadding
          action={
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 gap-0.5">
                   <button onClick={() => setActivityFilter('All')} className={`p-1 rounded-md transition-all ${activityFilter === 'All' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`} title={t('all')}><Layers size={12}/></button>
                   <button onClick={() => setActivityFilter('Finance')} className={`p-1 rounded-md transition-all ${activityFilter === 'Finance' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-500' : 'text-slate-400 hover:text-slate-600'}`} title={t('finance')}><DollarSign size={12}/></button>
                   <button onClick={() => setActivityFilter('Health')} className={`p-1 rounded-md transition-all ${activityFilter === 'Health' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-500' : 'text-slate-400 hover:text-slate-600'}`} title={t('health')}><Heart size={12}/></button>
                   <button onClick={() => setActivityFilter('Development')} className={`p-1 rounded-md transition-all ${activityFilter === 'Development' ? 'bg-white dark:bg-slate-700 shadow-sm text-orange-500' : 'text-slate-400 hover:text-slate-600'}`} title={t('development')}><Activity size={12}/></button>
              </div>
          }
      >
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto custom-scrollbar">
              {displayedActivities.length > 0 ? displayedActivities.map((item) => (
                  <div key={item.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => onNavigate(item.category, item.rawId, item.type)}>
                      <div className={`p-2 rounded-lg shrink-0 ${
                          item.type === 'Expense' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' :
                          item.type === 'Milestone' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20' :
                          item.type === 'Growth' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20' :
                          'bg-rose-100 text-rose-600 dark:bg-rose-900/20'
                      }`}>
                          {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-xs group-hover:text-primary transition-colors">{item.title}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                               <span className="font-medium bg-slate-100 dark:bg-slate-700/50 px-1 py-0 rounded text-[9px] uppercase tracking-wide">
                                   {t(item.type.toLowerCase() as any)}
                               </span>
                               <span>{item.date}</span>
                          </div>
                      </div>
                      {item.amount && <span className="font-bold text-slate-900 dark:text-white text-xs">-${item.amount.toFixed(0)}</span>}
                      <ArrowRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
              )) : (
                  <div className="p-6 text-center text-slate-400 text-xs">{t('noData')}</div>
              )}
              <div className="p-2 bg-slate-50 dark:bg-white/5 text-center">
                  <button onClick={() => onNavigate(Category.Analytics)} className="text-[10px] font-bold text-primary hover:underline">{t('viewAllHistory')}</button>
              </div>
          </div>
      </Card>

      {/* Edit Child Profile Modal */}
      <Modal isOpen={isChildEditModalOpen} onClose={() => setIsChildEditModalOpen(false)} title="Update Child Profile">
          <div className="space-y-6">
              <div className="flex flex-col items-center mb-4">
                  <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-slate-100 dark:ring-slate-700 mb-2">
                      <img src={childFormData.photoUrl} className="w-full h-full object-cover" alt="Child" />
                  </div>
                  <Input label="Photo URL" value={childFormData.photoUrl || ''} onChange={e => setChildFormData({...childFormData, photoUrl: e.target.value})} placeholder="https://..." />
              </div>
              <Input label={t('title')} value={childFormData.name || ''} onChange={e => setChildFormData({...childFormData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                  <DatePicker label={t('birthday')} value={childFormData.dateOfBirth || ''} onChange={e => setChildFormData({...childFormData, dateOfBirth: e.target.value})} />
                  <RadioGroup label={t('bloodType')} options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => ({value: b, label: b}))} value={childFormData.bloodType || ''} onChange={v => setChildFormData({...childFormData, bloodType: v})} gridCols={4} />
              </div>
              <Input label={t('allergies')} value={childFormData.allergies || ''} onChange={e => setChildFormData({...childFormData, allergies: e.target.value})} placeholder="e.g. Peanuts" />
              <div className="flex justify-end pt-4">
                  <Button onClick={handleChildSave} disabled={isSavingChild} icon={isSavingChild ? <Loader2 className="animate-spin" /> : undefined}>
                      {isSavingChild ? t('saving') : t('save')}
                  </Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
