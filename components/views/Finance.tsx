
import React, { useState, useEffect, useMemo } from 'react';
import { Expense, AppSettings } from '../../types';
import { Card, Badge, Button, Modal, Input, DatePicker, Switch, RadioGroup, Select } from '../UI';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { DollarSign, ShoppingBag, Repeat, Calendar, Plus, Trash2, Edit2, AlertCircle, Heart, Briefcase, Plane, Gift, Music, Tv, Zap, ShieldCheck, Smartphone, Wifi, CalendarClock, TrendingUp, ArrowUpRight, Clock, CheckCircle2, XCircle, PauseCircle, PieChart as PieChartIcon, Landmark, FileCheck, Building, Unlock, ArrowRight, Table, Search, Sparkles, Map, Check, ChevronRight, Calculator, Sliders, Receipt, CreditCard, Percent, Banknote } from 'lucide-react';
import { saveExpense, deleteExpense, saveSettings } from '../../services/neon';

interface Props {
  expenses: Expense[];
  isDark: boolean;
  onAddExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onRefresh: (scope?: string[]) => void;
  monthlyBudget: number;
  t: (key: any) => string;
  onUpdateSettings: (s: AppSettings) => void;
  settings: AppSettings;
  deepLink?: { id: string; type: string } | null;
  onConsumeDeepLink?: () => void;
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#6366F1', '#8B5CF6'];

export const FinanceView: React.FC<Props> = ({ expenses, isDark, onAddExpense, onDeleteExpense, onRefresh, monthlyBudget, t, onUpdateSettings, settings, deepLink, onConsumeDeepLink }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'loan'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState(monthlyBudget);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<Partial<Expense>>({
      category: 'Toys',
      date: new Date().toISOString().split('T')[0],
      isSubscription: false,
      frequency: 'Monthly',
      status: 'Active'
  });

  // Loan State - Derived from Settings (Database)
  const loanStage = settings.loanStage ?? -1;
  const [extraPayment, setExtraPayment] = useState<number>(50);
  const [amortizationYear, setAmortizationYear] = useState<number>(2026);
  const [editingFees, setEditingFees] = useState<any[]>([]);
  const [amortizationView, setAmortizationView] = useState<'chart' | 'table'>('chart');

  const DEFAULT_FEES = [
      { id: 'f1', name: 'Processing Fee (1%)', amount: 646, paid: false },
      { id: 'f2', name: 'Property Valuation', amount: 150, paid: false },
      { id: 'f3', name: 'CBC Credit Check', amount: 50, paid: false },
      { id: 'f4', name: 'Cadastral/Legal Fee', amount: 250, paid: false },
      { id: 'f5', name: 'Fire Insurance (Yr 1)', amount: 100, paid: false },
  ];

  // Parse fees from settings or fall back to default
  const fees = useMemo(() => {
      if (settings.loanFees) {
          try {
              return JSON.parse(settings.loanFees);
          } catch (e) {
              console.error("Error parsing loan fees", e);
              return DEFAULT_FEES;
          }
      }
      return DEFAULT_FEES;
  }, [settings.loanFees]);

  // Handle Deep Linking
  useEffect(() => {
    if (deepLink && onConsumeDeepLink) {
        if (deepLink.type === 'Expense') {
            const expense = expenses.find(e => e.id === deepLink.id);
            if (expense) {
                handleView(expense);
                onConsumeDeepLink();
            }
        } else if (deepLink.type === 'Loan') {
            setActiveTab('loan');
            onConsumeDeepLink();
        }
    }
  }, [deepLink, expenses]);

  const handleEdit = (e: Expense) => {
      setEditingId(e.id);
      setFormData(e);
      setIsModalOpen(true);
  }

  const handleView = (e: Expense) => {
      setViewingExpense(e);
      setIsViewModalOpen(true);
  }

  const handleSave = async () => {
      if (!formData.title || !formData.amount) return;
      
      // Close modal first for instant feedback
      setIsModalOpen(false);
      setEditingId(null);
      
      const expense: Expense = {
          id: editingId || Date.now().toString(),
          title: formData.title,
          amount: parseFloat(formData.amount as any),
          category: formData.category as any,
          date: formData.date as string || new Date().toISOString().split('T')[0],
          isSubscription: formData.isSubscription || false,
          frequency: formData.isSubscription ? (formData.frequency || 'Monthly') : undefined,
          renewalDate: formData.renewalDate,
          status: formData.isSubscription ? (formData.status || 'Active') : undefined
      };
      
      await saveExpense(expense);
      onRefresh(['expenses']);
      
      setFormData({ category: 'Toys', date: new Date().toISOString().split('T')[0], isSubscription: false, frequency: 'Monthly', status: 'Active' });
  };

  const handleDelete = async (id: string) => {
      if(confirm(t('confirmDelete'))) {
          setIsViewModalOpen(false);
          await deleteExpense(id);
          onRefresh(['expenses']);
      }
  }

  const getUser = () => JSON.parse(localStorage.getItem('user_session') || '{}');

  const handleSaveBudget = async () => {
    const user = getUser();
    const updatedSettings = { ...settings, monthlyBudget: newBudget };
    onUpdateSettings(updatedSettings);
    if(user.username) {
        await saveSettings(user.username, updatedSettings);
    }
    setIsBudgetModalOpen(false);
  }

  // --- LOAN SETTINGS SAVE LOGIC ---
  const saveLoanSettings = async (updates: Partial<AppSettings>) => {
      const user = getUser();
      const updatedSettings = { ...settings, ...updates };
      // Optimistic update
      onUpdateSettings(updatedSettings);
      // DB Save
      if(user.username) {
          await saveSettings(user.username, updatedSettings);
      }
  };

  const handleMarkStepDone = (stepIndex: number) => {
      const nextStage = stepIndex + 1;
      saveLoanSettings({ loanStage: nextStage });
  };

  const handleResetTracker = () => {
      // Force set to 0 to restart tracking, ignoring auto-date logic
      saveLoanSettings({ loanStage: 0 });
  };

  const handleToggleFee = (id: string) => {
      const newFees = fees.map((f: any) => f.id === id ? { ...f, paid: !f.paid } : f);
      saveLoanSettings({ loanFees: JSON.stringify(newFees) });
  };

  // Fee Management Handlers
  const openFeeModal = () => {
      setEditingFees(JSON.parse(JSON.stringify(fees)));
      setIsFeeModalOpen(true);
  };

  const handleFeeChange = (index: number, field: string, value: any) => {
      const updated = [...editingFees];
      updated[index] = { ...updated[index], [field]: value };
      setEditingFees(updated);
  };

  const handleAddFee = () => {
      setEditingFees([...editingFees, { id: Date.now().toString(), name: 'New Fee', amount: 0, paid: false }]);
  };

  const handleDeleteFee = (index: number) => {
      const updated = [...editingFees];
      updated.splice(index, 1);
      setEditingFees(updated);
  };

  const saveFees = () => {
      saveLoanSettings({ loanFees: JSON.stringify(editingFees) });
      setIsFeeModalOpen(false);
  };

  // Helper for currency format
  const formatCurrency = (amount: number, digits: number = 2) => {
      return amount.toLocaleString(undefined, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits
      });
  };

  // Filter expenses for current month only
  const currentMonthExpenses = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
    return expenses.filter(e => e.date.startsWith(currentMonthPrefix));
  }, [expenses]);

  // Overview Calculations (Current Month Only)
  const categoryData = useMemo(() => {
    return currentMonthExpenses.reduce((acc, curr) => {
        const existing = acc.find(item => item.name === curr.category);
        if (existing) {
          existing.value += curr.amount;
        } else {
          acc.push({ name: curr.category, value: curr.amount });
        }
        return acc;
      }, [] as { name: string; value: number }[]);
  }, [currentMonthExpenses]);

  const totalSpent = currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const budgetLeft = monthlyBudget - totalSpent;
  
  // Subscriptions Calculation
  const subscriptions = useMemo(() => expenses.filter(e => e.isSubscription), [expenses]);
  
  const subCategoryData = useMemo(() => {
      return subscriptions.filter(s => s.status === 'Active').reduce((acc, curr) => {
          const catName = t(curr.category.toLowerCase() as any);
          const existing = acc.find(item => item.name === catName);
          if (existing) {
              existing.value += curr.amount;
          } else {
              acc.push({ name: catName, value: curr.amount });
          }
          return acc;
      }, [] as { name: string; value: number }[]);
  }, [subscriptions, t]);

  const subscriptionMetrics = useMemo(() => {
      const activeSubs = subscriptions.filter(s => s.status === 'Active');
      
      const monthlyTotal = activeSubs
        .filter(s => s.frequency === 'Monthly')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
      const yearlyTotal = activeSubs
        .filter(s => s.frequency === 'Yearly')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
      const weeklyTotal = activeSubs
        .filter(s => s.frequency === 'Weekly')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
      const projectedMonthly = monthlyTotal + (yearlyTotal / 12) + (weeklyTotal * 4.34);
      const projectedDaily = projectedMonthly / 30.44;
      
      return { 
          monthlyTotal, 
          yearlyTotal, 
          projectedMonthly, 
          projectedDaily,
          count: activeSubs.length 
      };
  }, [subscriptions]);

  // --- LOAN DASHBOARD CALCULATIONS ---
  const loanMetrics = useMemo(() => {
      // Adjusted principal to exactly yield 428.07 EMI at 6.30%
      const loanAmount = 64600; 
      const annualRate = 0.063; // 6.30%
      const tenureYears = 25;
      const tenureMonths = tenureYears * 12; // 300 months
      const monthlyRate = annualRate / 12;
      
      // EMI Formula: P * r * (1+r)^n / ((1+r)^n - 1)
      const emiRaw = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
      const emi = 428.07; // User specified fixed target
      
      const totalRepayment = emi * tenureMonths;
      const totalInterest = totalRepayment - loanAmount;
      
      // Generate Schedule
      let balance = loanAmount;
      const schedule = [];
      const startDate = new Date('2026-03-01');
      
      let cumulativePayment = 0;
      let doubleUpDate = null;

      // Smart Strategy (User interactive extra payment)
      let smartBalance = loanAmount;
      let smartMonths = 0;
      let smartTotalInterest = 0;
      
      for (let i = 1; i <= tenureMonths; i++) {
          // Standard Schedule
          const interest = balance * monthlyRate;
          const principal = emi - interest;
          balance -= principal;
          
          cumulativePayment += emi;
          
          if (!doubleUpDate && cumulativePayment >= loanAmount) {
              const d = new Date(startDate);
              d.setMonth(d.getMonth() + i);
              doubleUpDate = d;
          }

          // Push ALL months to schedule
          schedule.push({
              month: i,
              date: new Date(startDate.getFullYear(), startDate.getMonth() + i - 1, 1),
              emi: emi,
              interest: interest,
              principal: principal,
              balance: balance > 0 ? balance : 0
          });

          // Smart Calculation
          const smartInterest = smartBalance * monthlyRate;
          let smartPayment = emi;
          if (i > 36 && smartBalance > 0) smartPayment += extraPayment; 
          
          const smartPrincipal = smartPayment - smartInterest;
          
          if (smartBalance > 0) {
              const finalPayment = Math.min(smartBalance + smartInterest, smartPayment);
              const finalPrincipal = finalPayment - smartInterest;
              smartBalance -= finalPrincipal;
              smartTotalInterest += smartInterest;
              smartMonths++;
          }
      }

      const interestSaved = totalInterest - smartTotalInterest;
      const monthsSaved = tenureMonths - smartMonths;

      // Timeline Logic
      const appDate = new Date('2025-12-30');
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - appDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysPassed = today < appDate ? 0 : diffDays; 

      let autoStage = 0;
      if (daysPassed < 1) autoStage = 0;
      else if (daysPassed < 4) autoStage = 1;
      else if (daysPassed < 10) autoStage = 2;
      else if (daysPassed < 20) autoStage = 3;
      else if (daysPassed < 40) autoStage = 4;
      else autoStage = 5;

      const activeStage = loanStage !== -1 ? loanStage : autoStage;

      const steps = [
          { title: t('loan_step_1'), date: 'Dec 30', icon: <FileCheck size={16}/>, action: t('loan_action_1') },
          { title: t('loan_step_2'), date: '+3 Days', icon: <Search size={16}/>, action: t('loan_action_2') },
          { title: t('loan_step_3'), date: '+1 Week', icon: <Building size={16}/>, action: t('loan_action_3') },
          { title: t('loan_step_4'), date: '+2 Weeks', icon: <Landmark size={16}/>, action: t('loan_action_4') },
          { title: t('loan_step_5'), date: '+3 Weeks', icon: <Map size={16}/>, action: t('loan_action_5') },
          { title: t('loan_step_6'), date: '+1 Month', icon: <DollarSign size={16}/>, action: t('loan_action_6') }
      ];

      return {
          emi,
          totalInterest,
          schedule,
          doubleUpDate,
          smart: { interestSaved, monthsSaved },
          timeline: { stage: activeStage, steps }
      };
  }, [loanStage, extraPayment, t]);

  const visibleSchedule = useMemo(() => {
      return loanMetrics.schedule.filter(r => r.date.getFullYear() === amortizationYear);
  }, [loanMetrics.schedule, amortizationYear]);

  // Fees Stats
  const feesStats = useMemo(() => {
      const total = fees.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
      const paid = fees.filter((f: any) => f.paid).reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
      return { total, paid, remaining: total - paid, percent: total > 0 ? Math.round((paid / total) * 100) : 0 };
  }, [fees]);

  const getNextBillingDateObj = (start: string, freq?: string) => {
    const startDate = new Date(start);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let nextDate = new Date(startDate);
    if (nextDate >= today) return nextDate;

    while (nextDate < today) {
        if (freq === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (freq === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
        else nextDate.setMonth(nextDate.getMonth() + 1);
    }
    return nextDate;
  };

  const getServiceBranding = (title: string, category: string) => {
    const tLower = title.toLowerCase();
    if (tLower.includes('netflix')) return { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-900', progress: 'bg-red-500', icon: <Tv size={20} /> };
    if (tLower.includes('hulu') || tLower.includes('disney') || tLower.includes('prime') || tLower.includes('hbo') || tLower.includes('youtube')) return { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-900', progress: 'bg-blue-500', icon: <Tv size={20} /> };
    if (tLower.includes('spotify')) return { color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-900', progress: 'bg-green-500', icon: <Music size={20} /> };
    if (tLower.includes('apple') || tLower.includes('music')) return { color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-900', progress: 'bg-pink-500', icon: <Music size={20} /> };
    if (tLower.includes('internet') || tLower.includes('wifi')) return { color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-900', progress: 'bg-cyan-500', icon: <Wifi size={20} /> };
    if (tLower.includes('phone') || tLower.includes('mobile')) return { color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-900', progress: 'bg-indigo-500', icon: <Smartphone size={20} /> };
    if (tLower.includes('electric') || tLower.includes('power') || tLower.includes('water')) return { color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-900', progress: 'bg-yellow-500', icon: <Zap size={20} /> };
    if (tLower.includes('insurance')) return { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-900', progress: 'bg-emerald-500', icon: <ShieldCheck size={20} /> };
    
    switch(category) {
        case 'Medical': return { color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-900', progress: 'bg-rose-500', icon: <Heart size={20}/> };
        case 'Travel': return { color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20', border: 'border-sky-200 dark:border-sky-900', progress: 'bg-sky-500', icon: <Plane size={20}/> };
        case 'Childcare': return { color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-900', progress: 'bg-orange-500', icon: <Briefcase size={20}/> };
        default: return { color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800', border: 'border-slate-200 dark:border-slate-700', progress: 'bg-slate-500', icon: <Repeat size={20}/> };
    }
  };

  const processedSubscriptions = useMemo(() => {
    return subscriptions.map(sub => {
        const branding = getServiceBranding(sub.title, sub.category);
        const nextDate = getNextBillingDateObj(sub.date, sub.frequency);
        const today = new Date();
        today.setHours(0,0,0,0);
        const diffTime = nextDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let cycleDays = 30;
        if (sub.frequency === 'Yearly') cycleDays = 365;
        if (sub.frequency === 'Weekly') cycleDays = 7;
        
        const daysPassed = cycleDays - daysRemaining;
        const progress = Math.min(100, Math.max(0, (daysPassed / cycleDays) * 100));
        
        return {
            ...sub,
            branding,
            nextDate,
            daysRemaining,
            progress,
            cycleDays
        };
    }).sort((a, b) => {
        if (a.status === 'Active' && b.status !== 'Active') return -1;
        if (a.status !== 'Active' && b.status === 'Active') return 1;
        return a.daysRemaining - b.daysRemaining;
    });
  }, [subscriptions]);
  
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex p-1.5 bg-slate-200/50 dark:bg-black/20 backdrop-blur-sm rounded-full w-full md:w-fit overflow-x-auto">
            <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}>{t('overview')}</button>
            <button onClick={() => setActiveTab('subscriptions')} className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === 'subscriptions' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}>{t('subscriptions')}</button>
            <button onClick={() => setActiveTab('loan')} className={`px-4 py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${activeTab === 'loan' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500'}`}>
                <Landmark size={14}/> {t('homeLoan')}
            </button>
        </div>
        <Button className="shrink-0" size="sm" icon={<Plus size={16}/>} onClick={() => { setEditingId(null); setFormData({frequency: 'Monthly', isSubscription: activeTab === 'subscriptions', date: new Date().toISOString().split('T')[0], status: 'Active'}); setIsModalOpen(true); }}>{t('addExpense')}</Button>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="flex flex-col gap-2">
            <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 border-none text-white shadow-glow relative overflow-hidden p-3">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg"><DollarSign size={16}/></div>
                    <span className="font-semibold text-indigo-100 text-xs">{t('totalSpent')} ({t('monthly')})</span>
                </div>
                <h2 className="text-xl font-extrabold tracking-tight">${totalSpent.toFixed(2)}</h2>
              </div>
              <div className="mt-2 text-[10px] text-indigo-200 flex items-center gap-2 cursor-pointer hover:text-white transition-colors bg-white/10 w-fit px-2 py-0.5 rounded-full" onClick={() => setIsBudgetModalOpen(true)}>
                   {monthlyBudget > 0 ? `${t('budget')}: $${monthlyBudget.toFixed(2)}` : t('setBudgetDesc')}
                   {monthlyBudget === 0 && <AlertCircle size={12} />}
              </div>
            </Card>
            <Card className="p-3">
               <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600"><ShoppingBag size={16}/></div>
                    <span className="font-semibold text-slate-500 text-xs">{t('remaining')}</span>
                </div>
                <h2 className={`text-xl font-extrabold ${budgetLeft > 0 ? 'text-emerald-600' : 'text-red-500'}`}>${budgetLeft.toFixed(2)}</h2>
               </div>
            </Card>
            <Card className="p-3">
               <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-lg bg-purple-100 text-purple-600"><CalendarClock size={16}/></div>
                    <span className="font-semibold text-slate-500 text-xs">{t('projectedCost')}</span>
                </div>
                <h2 className="text-xl font-extrabold text-purple-600">${subscriptionMetrics.projectedMonthly.toFixed(2)}</h2>
               </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card title={t('history')}>
              <div className="space-y-4">
                {expenses.slice(0, 6).map(expense => (
                  <div key={expense.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 group relative transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer" onClick={() => handleView(expense)}>
                    <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all bg-white dark:bg-slate-800 shadow-sm rounded-lg p-1 z-10" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleEdit(expense)} className="p-1.5 text-slate-400 hover:text-blue-500"><Edit2 size={14}/></button>
                        <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`w-1.5 h-12 rounded-full ${expense.isSubscription ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-lg">{expense.title}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-slate-500 font-medium">{expense.date}</span>
                          <Badge color="gray">{t(expense.category.toLowerCase() as any)}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right pr-8">
                      <p className="font-bold text-slate-900 dark:text-white text-lg">-${expense.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && <p className="text-center text-slate-400 py-6">{t('noData')}</p>}
              </div>
            </Card>
            <Card title={t('analytics')}>
                <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={6} dataKey="value">
                      {categoryData.map((entry, index) => <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'}} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      ) : activeTab === 'loan' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card 
                className="border-t-4 border-t-red-600" 
                title={t('cimbTracker')}
                subtitle={`${t('liveStatus')} (Dec 30, 2025)`}
                action={
                    <button onClick={handleResetTracker} className="text-xs text-slate-400 hover:text-red-500 font-bold underline decoration-dotted">
                        {t('resetStatus')}
                    </button>
                }
              >
                  <div className="relative mt-4">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                      {loanMetrics.timeline.steps.map((step, idx) => {
                          const isCompleted = idx <= loanMetrics.timeline.stage;
                          const isCurrent = idx === loanMetrics.timeline.stage;
                          
                          return (
                              <div key={`step-${step.title}-${idx}`} className={`flex items-start gap-4 mb-6 relative z-10 pl-1 transition-all duration-300 ${isCurrent ? 'scale-100' : 'opacity-90'}`}>
                                  <div className={`
                                      w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 transition-colors duration-300
                                      ${isCompleted ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-200 dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'}
                                  `}>
                                      {isCompleted ? <CheckCircle2 size={14}/> : step.icon}
                                  </div>
                                  <div className={`
                                      flex-1 p-4 rounded-xl border transition-all duration-300
                                      ${isCurrent 
                                          ? 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-900/50 shadow-lg ring-1 ring-red-100 dark:ring-red-900/20' 
                                          : isCompleted 
                                              ? 'bg-slate-50 dark:bg-white/5 border-transparent opacity-70 hover:opacity-100' 
                                              : 'bg-transparent border-transparent opacity-50'}
                                  `}>
                                      <div className="flex justify-between items-center mb-1">
                                          <span className={`text-sm font-bold ${isCompleted ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{step.title}</span>
                                          <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{step.date}</span>
                                      </div>
                                      
                                      {isCurrent && (
                                          <div className="mt-3 pt-3 border-t border-red-50 dark:border-white/5">
                                              <div className="flex items-start gap-2 mb-3">
                                                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0"/>
                                                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-snug">
                                                      {t('actionLabel')}: <span className="text-red-600 dark:text-red-400">{step.action}</span>
                                                  </p>
                                              </div>
                                              {idx < loanMetrics.timeline.steps.length - 1 && (
                                                  <Button 
                                                      size="sm" 
                                                      className="w-full bg-red-600 hover:bg-red-700 border-none shadow-md shadow-red-200 dark:shadow-none text-white"
                                                      onClick={() => handleMarkStepDone(idx)}
                                                      icon={<Check size={14} />}
                                                  >
                                                      {t('markAsDone')}
                                                  </Button>
                                              )}
                                          </div>
                                      )}
                                      
                                      {isCompleted && !isCurrent && (
                                          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                                              <Check size={10} strokeWidth={4} /> {t('completed')}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </Card>

              {/* Loan Details Grid */}
              <div className="flex flex-col gap-6">
                  <Card title={t('loanFees')} subtitle={t('feesSubtitle')} action={<Button size="sm" variant="outline" onClick={openFeeModal}>{t('manageFees')}</Button>}>
                      <div className="space-y-4">
                          <div className="flex justify-between items-end mb-2">
                              <div>
                                  <p className="text-2xl font-black text-slate-800 dark:text-white">${formatCurrency(feesStats.paid, 0)}</p>
                                  <p className="text-xs font-bold text-slate-400 uppercase">{t('paidSoFar')}</p>
                              </div>
                              <div className="text-right">
                                  <p className="text-lg font-bold text-slate-600 dark:text-slate-400">${formatCurrency(feesStats.total, 0)}</p>
                                  <p className="text-xs font-bold text-slate-400 uppercase">{t('totalEst')}</p>
                              </div>
                          </div>
                          
                          <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{width: `${feesStats.percent}%`}}></div>
                          </div>

                          <div className="space-y-2 mt-4">
                              {fees.map((fee: any) => (
                                  <div key={fee.id} className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg cursor-pointer group" onClick={() => handleToggleFee(fee.id)}>
                                      <div className="flex items-center gap-3">
                                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${fee.paid ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                              {fee.paid && <Check size={12} className="text-white"/>}
                                          </div>
                                          <span className={`text-sm font-medium ${fee.paid ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{fee.name}</span>
                                      </div>
                                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">${fee.amount}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </Card>

                  <div className="space-y-6">
                      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
                          <div className="flex justify-between items-start mb-6">
                              <div>
                                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{t('monthlyEmi')}</p>
                                  <h3 className="text-4xl font-black">${loanMetrics.emi.toFixed(2)}</h3>
                              </div>
                              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                  <Banknote size={24} className="text-emerald-400"/>
                              </div>
                          </div>
                          <div className="space-y-3">
                              <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                                  <span className="text-slate-400">{t('totalInterest')}</span>
                                  <span className="font-mono font-bold text-red-300">${formatCurrency(loanMetrics.totalInterest, 0)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                  <span className="text-slate-400">{t('borrowingCost')}</span>
                                  <span className="font-mono font-bold">~63%</span>
                              </div>
                          </div>
                          <div className="mt-6 p-3 bg-white/5 rounded-xl border border-white/10 flex gap-3 items-center">
                              <Zap size={18} className="text-yellow-400 shrink-0"/>
                              <p className="text-xs font-medium text-slate-300 leading-snug">
                                  <span className="text-white font-bold">{t('lifestyleEq')}:</span> {t('avgElecBill')}
                              </p>
                          </div>
                      </Card>

                      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-slate-700 rounded-[1.5rem] p-5 shadow-sm">
                          <div className="flex items-center gap-2 mb-3">
                              <Unlock size={18} className="text-indigo-500"/>
                              <h4 className="font-bold text-slate-800 dark:text-white">{t('lockInPeriod')}</h4>
                          </div>
                          <div className="flex items-end justify-between mb-2">
                              <div>
                                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{t('freedomDate')}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">{t('freedomDay')}</p>
                              </div>
                              <Badge color="purple">3 Years</Badge>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                              {t('freedomNote')}
                          </p>
                      </div>
                  </div>
              </div>

              {/* Amortization Chart */}
              <Card title={t('amortization')} subtitle={`Schedule for ${amortizationYear}`} action={
                  <div className="flex items-center gap-3">
                      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                          <button 
                              onClick={() => setAmortizationView('chart')} 
                              className={`p-1.5 rounded-md transition-all ${amortizationView === 'chart' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
                          >
                              <TrendingUp size={16}/>
                          </button>
                          <button 
                              onClick={() => setAmortizationView('table')} 
                              className={`p-1.5 rounded-md transition-all ${amortizationView === 'table' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
                          >
                              <Table size={16}/>
                          </button>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => setAmortizationYear(Math.max(2026, amortizationYear - 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronRight className="rotate-180" size={16}/></button>
                          <span className="font-mono font-bold text-sm pt-0.5">{amortizationYear}</span>
                          <button onClick={() => setAmortizationYear(Math.min(2050, amortizationYear + 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronRight size={16}/></button>
                      </div>
                  </div>
              }>
                  {amortizationView === 'chart' ? (
                      <div className="h-64 w-full mt-4">
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={visibleSchedule} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                  <defs>
                                      <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                                  <XAxis dataKey="date" tickFormatter={(d) => d.toLocaleDateString(undefined, {month:'short'})} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}/>
                                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}/>
                                  <Tooltip 
                                      content={({ active, payload, label }) => {
                                          if (active && payload && payload.length) {
                                              const principal = Number(payload[0].value);
                                              const interest = Number(payload[1].value);
                                              const total = principal + interest;
                                              const dateLabel = new Date(payload[0].payload.date).toLocaleDateString(undefined, {month:'short', year:'numeric'});
                                              return (
                                                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800">
                                                      <p className="font-bold text-slate-500 mb-3 text-xs uppercase tracking-wider">{dateLabel}</p>
                                                      <div className="space-y-2 text-sm">
                                                          <div className="flex justify-between gap-6">
                                                              <span className="text-emerald-500 font-bold">{t('principal')}:</span>
                                                              <span className="font-mono text-slate-700 dark:text-slate-200">${principal.toFixed(2)}</span>
                                                          </div>
                                                          <div className="flex justify-between gap-6">
                                                              <span className="text-rose-500 font-bold">{t('interest')}:</span>
                                                              <span className="font-mono text-slate-700 dark:text-slate-200">${interest.toFixed(2)}</span>
                                                          </div>
                                                          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between gap-6">
                                                              <span className="text-slate-900 dark:text-white font-black">{t('totalPayment') || "Total Payment"}:</span>
                                                              <span className="font-mono font-black text-slate-900 dark:text-white">${total.toFixed(2)}</span>
                                                          </div>
                                                      </div>
                                                  </div>
                                              );
                                          }
                                          return null;
                                      }}
                                  />
                                  <Area type="monotone" dataKey="principal" stackId="1" stroke="#10B981" fill="url(#colorPrincipal)" />
                                  <Area type="monotone" dataKey="interest" stackId="1" stroke="#EF4444" fill="url(#colorInterest)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  ) : (
                      <div className="mt-4 overflow-x-auto max-h-64 custom-scrollbar">
                          <table className="w-full text-sm text-left">
                              <thead className="text-xs text-slate-400 uppercase bg-slate-50 dark:bg-slate-800 sticky top-0">
                                  <tr>
                                      <th className="px-4 py-2 rounded-l-lg">{t('month')}</th>
                                      <th className="px-4 py-2">{t('principal')}</th>
                                      <th className="px-4 py-2">{t('interest')}</th>
                                      <th className="px-4 py-2">{t('totalPayment') || "Total Payment"}</th>
                                      <th className="px-4 py-2 text-right rounded-r-lg">{t('balance')}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {visibleSchedule.map((row, idx) => (
                                      <tr key={`schedule-${row.date}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-white/5">
                                          <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-300">{row.date.toLocaleDateString(undefined, {month:'short'})}</td>
                                          <td className="px-4 py-2 text-emerald-600">${row.principal.toFixed(2)}</td>
                                          <td className="px-4 py-2 text-rose-500">${row.interest.toFixed(2)}</td>
                                          <td className="px-4 py-2 font-bold text-slate-800 dark:text-white">${(row.principal + row.interest).toFixed(2)}</td>
                                          <td className="px-4 py-2 text-right font-mono text-slate-500">${row.balance.toFixed(2)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </Card>

              {/* Smart Strategy Simulator */}
              <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                  <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h3 className="text-2xl font-black mb-1 flex items-center gap-2"><Sparkles className="text-yellow-400" /> {t('smartStrategy')}</h3>
                              <p className="text-indigo-200 text-sm">{t('startsJan2029')}</p>
                          </div>
                          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-1">{t('monthlyExtra')}</p>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => setExtraPayment(Math.max(0, extraPayment - 50))} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">-</button>
                                  <span className="font-black text-xl w-16 text-center">${extraPayment}</span>
                                  <button onClick={() => setExtraPayment(extraPayment + 50)} className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">+</button>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
                              <p className="text-xs font-bold text-indigo-300 uppercase tracking-wide mb-1">{t('interestSaved')}</p>
                              <p className="text-3xl font-black text-emerald-300">${formatCurrency(loanMetrics.smart.interestSaved, 0)}</p>
                              <p className="text-xs text-indigo-200 mt-2 opacity-80">That's a new car!</p>
                          </div>
                          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
                              <p className="text-xs font-bold text-indigo-300 uppercase tracking-wide mb-1">{t('timeSaved')}</p>
                              <p className="text-3xl font-black text-blue-300">{(loanMetrics.smart.monthsSaved / 12).toFixed(1)} {t('years')}</p>
                              <p className="text-xs text-indigo-200 mt-2 opacity-80">Debt-free earlier</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      ) : (
        <div className="space-y-6">
            {/* ... Subscriptions UI ... */}
            <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-80 h-80 bg-white opacity-[0.05] rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
                 <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 opacity-[0.1] rounded-full -ml-10 -mb-10 blur-3xl"></div>
                 
                 <div className="relative z-10 flex flex-col md:flex-row gap-8 md:items-center">
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-indigo-200 font-bold text-[10px] uppercase tracking-widest mb-1">{t('monthlyCost')}</p>
                            <h2 className="text-3xl font-black">${subscriptionMetrics.projectedMonthly.toFixed(2)}</h2>
                        </div>
                        <div>
                            <p className="text-purple-200 font-bold text-[10px] uppercase tracking-widest mb-1">{t('yearlyTotal')}</p>
                            <h2 className="text-3xl font-bold opacity-80">${(subscriptionMetrics.projectedMonthly * 12).toFixed(0)}</h2>
                        </div>
                        <div>
                            <p className="text-pink-200 font-bold text-[10px] uppercase tracking-widest mb-1">Cost Per Day</p>
                            <h2 className="text-3xl font-bold opacity-80">${subscriptionMetrics.projectedDaily.toFixed(2)}</h2>
                        </div>
                        <div>
                            <p className="text-emerald-200 font-bold text-[10px] uppercase tracking-widest mb-1">Active</p>
                            <h2 className="text-3xl font-bold opacity-80">{subscriptionMetrics.count}</h2>
                        </div>
                    </div>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {processedSubscriptions.map(sub => (
                        <div 
                            key={sub.id} 
                            className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border ${sub.branding.border} hover:shadow-md hover:scale-[1.01] transition-all duration-300 cursor-pointer group relative overflow-hidden ${sub.status !== 'Active' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                            onClick={() => handleView(sub)}
                        >
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${sub.branding.bg} ${sub.branding.color}`}>
                                    {sub.branding.icon}
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-2">
                                        {sub.status === 'Active' ? <CheckCircle2 size={12} className="text-emerald-500" /> : sub.status === 'Paused' ? <PauseCircle size={12} className="text-amber-500" /> : <XCircle size={12} className="text-red-500" />}
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">${sub.amount.toFixed(2)}</h3>
                                    </div>
                                    <Badge color="gray" className="mt-0.5 text-[10px]">{t(sub.frequency?.toLowerCase() as any)}</Badge>
                                </div>
                            </div>
                            
                            <div className="relative z-10 mb-3">
                                <h4 className="font-bold text-base text-slate-800 dark:text-white truncate pr-8">{sub.title}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{t(sub.category.toLowerCase() as any)}</p>
                            </div>
                            
                            {sub.status === 'Active' && (
                                <div className="relative z-10">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className={`text-[10px] font-bold ${sub.daysRemaining <= 5 ? 'text-red-500' : 'text-slate-500'}`}>
                                            {sub.daysRemaining === 0 ? t('dueToday') : `${t('dueIn')} ${sub.daysRemaining} ${t('days')}`}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-300">{sub.nextDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${sub.branding.progress}`} 
                                            style={{width: `${sub.progress}%`}}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {sub.status !== 'Active' && (
                                <div className="h-10 flex items-center text-sm font-bold text-slate-400 italic">
                                    Subscription {sub.status}
                                </div>
                            )}

                            <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 z-20" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleEdit(sub)} className="p-2.5 bg-white dark:bg-slate-800 shadow-lg rounded-full text-slate-400 hover:text-primary border border-slate-100 dark:border-slate-700 transition-colors"><Edit2 size={16}/></button>
                                <button onClick={() => handleDelete(sub.id)} className="p-2.5 bg-white dark:bg-slate-800 shadow-lg rounded-full text-slate-400 hover:text-red-500 border border-slate-100 dark:border-slate-700 transition-colors"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                    <button 
                        onClick={() => { setEditingId(null); setFormData({isSubscription: true, frequency: 'Monthly', date: new Date().toISOString().split('T')[0], status: 'Active'}); setIsModalOpen(true); }}
                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.25rem] text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all min-h-[220px] group"
                    >
                        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors">
                            <Plus size={32} />
                        </div>
                        <span className="font-bold text-lg">{t('addSubscription')}</span>
                    </button>
                </div>

                <div className="space-y-6">
                    <Card title="Recurrence Split" subtitle="Monthly Distribution" icon={<PieChartIcon size={18}/>}>
                        <div className="h-64 w-full">
                            {subCategoryData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={subCategoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={8} dataKey="value">
                                            {subCategoryData.map((entry, index) => <Cell key={`sub-cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">No active subscriptions</div>
                            )}
                        </div>
                        <div className="mt-4 space-y-2">
                             {subCategoryData.map((item, i) => (
                                 <div key={`sub-cat-${item.name}-${i}`} className="flex justify-between items-center text-sm font-medium">
                                     <div className="flex items-center gap-2">
                                         <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                         <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                                     </div>
                                     <span className="font-bold text-slate-800 dark:text-white">${item.value.toFixed(2)}</span>
                                 </div>
                             ))}
                        </div>
                    </Card>

                    <Card title="Quick Stats" icon={<TrendingUp size={18}/>}>
                         <div className="space-y-4">
                             <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Highest Bill</p>
                                 {subscriptions.length > 0 ? (
                                     <div>
                                         <p className="font-bold text-lg text-slate-800 dark:text-white">{subscriptions.sort((a,b) => b.amount - a.amount)[0].title}</p>
                                         <p className="text-primary font-black text-xl">${subscriptions.sort((a,b) => b.amount - a.amount)[0].amount.toFixed(2)}</p>
                                     </div>
                                 ) : <p className="text-slate-400">N/A</p>}
                             </div>
                             <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Upcoming in 7 Days</p>
                                 <p className="text-2xl font-black text-slate-800 dark:text-white">
                                     {processedSubscriptions.filter(s => s.status === 'Active' && s.daysRemaining <= 7).length}
                                 </p>
                             </div>
                         </div>
                    </Card>
                </div>
            </div>
        </div>
      )}

      {/* View Expense Modal */}
      {viewingExpense && (
          <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={t('recordDetails')}>
               <div className="space-y-6">
                   <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2rem] text-center border border-slate-100 dark:border-slate-700">
                       <p className="text-sm text-slate-400 font-bold uppercase mb-2">{t(viewingExpense.category.toLowerCase() as any)}</p>
                       <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">${viewingExpense.amount.toFixed(2)}</h2>
                       <div className="inline-block bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm font-bold text-lg">
                           {viewingExpense.title}
                       </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                            <span className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('date')}</span>
                            <span className="font-bold">{viewingExpense.date}</span>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                            <span className="block text-xs font-bold text-slate-400 uppercase mb-1">{t('status')}</span>
                            <span className={`font-bold ${viewingExpense.status === 'Active' ? 'text-emerald-500' : viewingExpense.status === 'Paused' ? 'text-amber-500' : 'text-slate-400'}`}>
                                {viewingExpense.status || 'Paid'}
                            </span>
                        </div>
                   </div>

                   {viewingExpense.isSubscription && (
                       <div className="p-5 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-800 flex items-center gap-4">
                           <div className="p-3 bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300 rounded-xl">
                               <Repeat size={24}/>
                           </div>
                           <div>
                               <p className="font-bold text-purple-900 dark:text-purple-100">{t('subscription')}</p>
                               <p className="text-sm text-purple-700 dark:text-purple-300">{t('renews')} {t(viewingExpense.frequency?.toLowerCase() as any)}</p>
                           </div>
                       </div>
                   )}

                   <div className="flex justify-end gap-3 pt-4">
                       <Button variant="ghost" onClick={() => setIsViewModalOpen(false)}>{t('cancel')}</Button>
                       <Button onClick={() => { setIsViewModalOpen(false); handleEdit(viewingExpense); }} icon={<Edit2 size={16}/>}>{t('edit')}</Button>
                   </div>
               </div>
          </Modal>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? t('edit') : t('addExpense')}>
          <div className="space-y-6">
              <Input label={t('title')} icon={<ShoppingBag size={18}/>} value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} autoFocus placeholder="Netflix, Rent, etc." />
              
              <div className="grid grid-cols-2 gap-4">
                  <Input label={t('amount')} icon={<DollarSign size={18}/>} type="number" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: e.target.value as any})} placeholder="0.00" />
                  <DatePicker label={t('date')} icon={<Calendar size={18}/>} value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              
              <RadioGroup 
                label={t('category')}
                options={[
                    {value: 'Toys', label: t('toys'), icon: <Gift size={16}/>},
                    {value: 'Clothes', label: t('clothes'), icon: <ShoppingBag size={16}/>},
                    {value: 'Food', label: t('food'), icon: <ShoppingBag size={16}/>},
                    {value: 'Medical', label: t('medical'), icon: <Heart size={16}/>},
                    {value: 'Childcare', label: t('childcare'), icon: <Briefcase size={16}/>},
                    {value: 'Travel', label: t('travel'), icon: <Plane size={16}/>},
                    {value: 'Subscription', label: t('subscription'), icon: <Repeat size={16}/>},
                ]}
                value={formData.category || 'Toys'}
                onChange={v => setFormData({...formData, category: v})}
                gridCols={3}
              />

              <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${formData.isSubscription ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                          <Repeat size={24}/>
                      </div>
                      <div>
                          <span className="block text-sm font-bold text-slate-800 dark:text-white">{t('recurringPayment')}</span>
                          <span className="text-xs text-slate-400 font-medium">{t('isSubscription')}</span>
                      </div>
                  </div>
                  <Switch checked={formData.isSubscription || false} onChange={c => setFormData({...formData, isSubscription: c})} />
              </div>
              
              {formData.isSubscription && (
                  <div className="animate-in slide-in-from-top-2 fade-in space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label={t('frequency')}
                            options={[
                                {value: 'Weekly', label: t('weekly')},
                                {value: 'Monthly', label: t('monthly')},
                                {value: 'Yearly', label: t('yearly')}
                            ]}
                            value={formData.frequency || 'Monthly'}
                            onChange={e => setFormData({...formData, frequency: e.target.value as any})}
                        />
                        <Select 
                            label={t('status')}
                            options={[
                                {value: 'Active', label: 'Active'},
                                {value: 'Paused', label: 'Paused'},
                                {value: 'Canceled', label: 'Canceled'}
                            ]}
                            value={formData.status || 'Active'}
                            onChange={e => setFormData({...formData, status: e.target.value as any})}
                        />
                      </div>
                  </div>
              )}
              
              <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} className="w-full sm:w-auto px-12">{editingId ? t('update') : t('save')}</Button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isBudgetModalOpen} onClose={() => setIsBudgetModalOpen(false)} title={t('budgetSet')}>
          <div className="space-y-6">
              <p className="text-slate-500 dark:text-slate-400 text-sm bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">{t('setBudgetDesc')}</p>
              <div className="relative">
                  <span className="absolute left-6 top-4 text-slate-400 font-bold text-2xl">$</span>
                  <input 
                    type="number" 
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-3xl font-bold text-center focus:outline-none focus:ring-4 focus:ring-primary/20"
                    value={newBudget}
                    onChange={(e) => setNewBudget(parseFloat(e.target.value))}
                    autoFocus
                  />
              </div>
              <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveBudget} className="w-full">{t('save')}</Button>
              </div>
          </div>
      </Modal>

      {/* Fee Management Modal */}
      <Modal isOpen={isFeeModalOpen} onClose={() => setIsFeeModalOpen(false)} title={t('manageFees')}>
          <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl text-xs text-slate-500 mb-2 border border-slate-100 dark:border-slate-700">
                  <p>Customize the fees for your loan tracking. These amounts are used for the total paid calculation.</p>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {editingFees.map((fee, index) => (
                      <div key={`fee-${fee.name}-${index}`} className="flex gap-2 items-center bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-in slide-in-from-right-2 duration-300" style={{animationDelay: `${index * 50}ms`}}>
                          <div className="flex-1">
                              <Input 
                                  value={fee.name} 
                                  onChange={(e) => handleFeeChange(index, 'name', e.target.value)}
                                  placeholder="Fee Name"
                                  className="!mb-0"
                              />
                          </div>
                          <div className="w-28 relative">
                              <Input 
                                  type="number"
                                  value={fee.amount} 
                                  onChange={(e) => handleFeeChange(index, 'amount', parseFloat(e.target.value))}
                                  placeholder="0.00"
                                  className="!mb-0 text-right pr-2"
                              />
                          </div>
                          <button 
                              onClick={() => handleDeleteFee(index)}
                              className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          >
                              <Trash2 size={18}/>
                          </button>
                      </div>
                  ))}
              </div>
              
              <div className="flex justify-center py-2">
                  <Button variant="secondary" size="sm" onClick={handleAddFee} icon={<Plus size={16}/>}>Add Custom Fee</Button>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
                  <Button variant="ghost" onClick={() => setIsFeeModalOpen(false)}>{t('cancel')}</Button>
                  <Button onClick={saveFees}>{t('save')}</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
