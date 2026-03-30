
import React, { useState, useMemo } from 'react';
import { Expense, MedicalRecord, GrowthRecord, Milestone, Trip } from '../../types';
import { Card, Button, DatePicker, Select, Input, Badge, Modal } from '../UI';
import { exportToCSV } from '../../services/exportService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, FileText, TrendingUp, DollarSign, Calendar, Heart, Thermometer, Activity, Search, Filter, Eye, X, MapPin, Pill, Stethoscope, Ruler, Weight, User, Repeat, Image as ImageIcon, Syringe, ShieldCheck } from 'lucide-react';

interface Props {
  expenses: Expense[];
  healthRecords: MedicalRecord[];
  growthRecords: GrowthRecord[];
  milestones: Milestone[];
  trips: Trip[];
  isDark: boolean;
  t: (key: any) => string;
}

const HEALTH_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];
const VACCINE_COLORS = ['#10b981', '#3b82f6', '#ef4444', '#f59e0b']; // Green, Blue, Red, Orange

export const AnalyticsView: React.FC<Props> = ({ expenses, healthRecords, growthRecords, milestones, trips, isDark, t }) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'history'>('reports');
  const [startDate, setStartDate] = useState('2023-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  // History Tab State
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState('All');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

  // Filter data based on date range
  const filteredExpenses = useMemo(() => 
    expenses.filter(e => e.date >= startDate && e.date <= endDate),
  [expenses, startDate, endDate]);

  const filteredHealth = useMemo(() => 
    healthRecords.filter(r => r.date >= startDate && r.date <= endDate),
  [healthRecords, startDate, endDate]);

  const filteredVaccines = useMemo(() => 
    healthRecords.filter(r => r.type === 'Vaccine'),
  [healthRecords]);

  // Calculations
  const totalSpent = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const milestonesAchieved = milestones.filter(m => m.completed && m.dateCompleted && m.dateCompleted >= startDate && m.dateCompleted <= endDate).length;
  
  // Health Specific Metrics
  const illnesses = filteredHealth.filter(r => r.type === 'Illness');
  const totalIllnesses = illnesses.length;
  const completedIllnesses = illnesses.filter(r => r.endDate);
  
  const avgDuration = useMemo(() => {
      if (completedIllnesses.length === 0) return 0;
      const totalDays = completedIllnesses.reduce((acc, curr) => {
          if (!curr.endDate) return acc;
          const start = new Date(curr.date).getTime();
          const end = new Date(curr.endDate).getTime();
          const days = Math.ceil((end - start) / (1000 * 3600 * 24));
          return acc + (days || 1);
      }, 0);
      return (totalDays / completedIllnesses.length).toFixed(1);
  }, [completedIllnesses]);

  // Chart Data Preparation
  const expenseByMonth = useMemo(() => {
    const data: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const month = e.date.substring(0, 7); // YYYY-MM
      data[month] = (data[month] || 0) + e.amount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredExpenses]);

  const healthByType = useMemo(() => {
      const data: Record<string, number> = {};
      filteredHealth.forEach(r => {
          const translatedType = t(r.type.toLowerCase() as any);
          data[translatedType] = (data[translatedType] || 0) + 1;
      });
      return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [filteredHealth, t]);

  const vaccineStatusData = useMemo(() => {
      const completed = filteredVaccines.filter(v => v.status === 'Completed').length;
      const scheduled = filteredVaccines.filter(v => v.status === 'Scheduled').length;
      const overdue = filteredVaccines.filter(v => v.status === 'Overdue').length;
      
      const data = [
          { name: t('completed'), value: completed },
          { name: t('scheduled'), value: scheduled },
      ];
      
      if (overdue > 0) data.push({ name: t('overdue'), value: overdue });
      
      return data;
  }, [filteredVaccines, t]);

  const illnessByMonth = useMemo(() => {
    const data: Record<string, number> = {};
    illnesses.forEach(r => {
        const month = r.date.substring(0, 7);
        data[month] = (data[month] || 0) + 1;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name));
  }, [illnesses]);
  
  // Unified History List
  const unifiedHistory = useMemo(() => {
      let items: any[] = [];
      
      expenses.forEach(e => items.push({...e, recordType: 'Expense', displayDate: e.date, displayTitle: e.title, detail: `$${e.amount}`}));
      healthRecords.forEach(h => items.push({...h, recordType: 'Health', subType: h.type, displayDate: h.date, displayTitle: h.title, detail: t(h.type.toLowerCase() as any)}));
      milestones.filter(m => m.completed).forEach(m => items.push({...m, recordType: 'Milestone', displayDate: m.dateCompleted, displayTitle: m.title, detail: t(m.category.toLowerCase() as any)}));
      trips.forEach(t => items.push({...t, recordType: 'Trip', displayDate: t.startDate, displayTitle: t.title, detail: t.location}));
      growthRecords.forEach(g => items.push({...g, recordType: 'Growth', displayDate: g.date, displayTitle: t('growthCharts'), detail: `${g.heightCm}cm / ${g.weightKg}kg`}));
      
      // Filter
      if (historyFilter !== 'All') {
          items = items.filter(i => i.recordType === historyFilter || i.subType === historyFilter);
      }
      
      // Search
      if (historySearch) {
          const lower = historySearch.toLowerCase();
          items = items.filter(i => 
              i.displayTitle.toLowerCase().includes(lower) || 
              (i.detail && i.detail.toString().toLowerCase().includes(lower)) ||
              i.displayDate.includes(lower)
          );
      }
      
      return items.sort((a,b) => new Date(b.displayDate).getTime() - new Date(a.displayDate).getTime());
  }, [expenses, healthRecords, milestones, trips, growthRecords, historyFilter, historySearch, t]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header & Controls */}
      <Card className="bg-slate-900 text-white border-none">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold">{t('analyticsTitle')}</h2>
            <p className="text-slate-400">{t('analyticsDesc')}</p>
          </div>
          <div className="flex p-1 bg-white/10 rounded-xl backdrop-blur-md">
               <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'}`}>{t('reports')}</button>
               <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:text-white'}`}>{t('detailedHistory')}</button>
          </div>
        </div>
      </Card>

      {activeTab === 'reports' ? (
      <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><DollarSign size={16}/></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('periodSpending')}</span>
              </div>
              <p className="text-xl font-black">${totalSpent.toFixed(0)}</p>
            </Card>
            <Card className="p-3">
               <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600"><TrendingUp size={16}/></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('milestones')}</span>
              </div>
              <p className="text-xl font-black">{milestonesAchieved}</p>
            </Card>
            <Card className="p-3">
               <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><Calendar size={16}/></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('healthEvents')}</span>
              </div>
              <p className="text-xl font-black">{filteredHealth.length}</p>
            </Card>
            <Card className="p-3">
               <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-orange-100 rounded-lg text-orange-600"><Thermometer size={16}/></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('sickDaysAvg')}</span>
              </div>
              <p className="text-xl font-black">{avgDuration} <span className="text-[10px] font-medium text-slate-400">{t('days')}</span></p>
            </Card>
          </div>
          
          <div className="flex justify-end gap-4">
               <div className="flex items-center gap-2 bg-white dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                   <span className="text-sm font-bold text-slate-500">{t('dateRange')}:</span>
                   <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-slate-800 dark:text-white" />
                   <span className="text-slate-400">-</span>
                   <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-slate-800 dark:text-white" />
               </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title={t('monthlyExpenses')} className="min-h-[400px]">
              <div className="h-80 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseByMonth}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"}/>
                    <XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`}/>
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'}}/>
                    <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={t('vaccineProgress')} subtitle={t('protectionLevel')} className="min-h-[400px]">
                <div className="h-80 w-full mt-4 flex items-center justify-center">
                    {vaccineStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={vaccineStatusData} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={60} 
                                    outerRadius={100} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {vaccineStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={VACCINE_COLORS[index % VACCINE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'}} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-slate-400">
                            <Syringe size={48} className="mx-auto mb-2 opacity-50" />
                            <p>{t('noHealthData')}</p>
                        </div>
                    )}
                </div>
            </Card>
            
            <Card title={t('healthBreakdown')} subtitle={t('recordsByType')} className="min-h-[400px]">
                <div className="h-80 w-full mt-4 flex items-center justify-center">
                    {healthByType.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={healthByType} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={60} 
                                    outerRadius={100} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {healthByType.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={HEALTH_COLORS[index % HEALTH_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 8px 20px rgba(0,0,0,0.1)'}} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center text-slate-400">
                            <Heart size={48} className="mx-auto mb-2 opacity-50" />
                            <p>{t('noHealthData')}</p>
                        </div>
                    )}
                </div>
            </Card>
            
            {/* Illness Trends Chart */}
            <Card title={t('illnessFrequency')} subtitle={t('illnessOverTime')} className="min-h-[400px]">
                 <div className="h-80 w-full mt-4">
                    {illnessByMonth.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={illnessByMonth}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"}/>
                            <XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickLine={false} axisLine={false}/>
                            <YAxis allowDecimals={false} stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickLine={false} axisLine={false}/>
                            <Tooltip cursor={{stroke: '#f59e0b', strokeWidth: 2}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'}}/>
                            <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                        </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                             <Activity size={32} className="mb-2 opacity-50" />
                             <p>{t('noIllnessData')}</p>
                        </div>
                    )}
                 </div>
            </Card>
          </div>
          
          {/* Export Section */}
          <Card title={t('exportData')} subtitle={t('downloadReports')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><FileText size={20}/></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{t('financialReport')}</p>
                      <p className="text-xs text-slate-500">{filteredExpenses.length} {t('records')}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredExpenses, `expenses_${startDate}_${endDate}`)} icon={<Download size={16}/>}>CSV</Button>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg"><FileText size={20}/></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{t('healthRecords')}</p>
                      <p className="text-xs text-slate-500">{filteredHealth.length} {t('records')}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredHealth, `health_${startDate}_${endDate}`)} icon={<Download size={16}/>}>CSV</Button>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl flex justify-between items-center">
                   <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><Syringe size={20}/></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{t('vaccination_nav')}</p>
                      <p className="text-xs text-slate-500">{filteredVaccines.length} {t('records')}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(filteredVaccines, 'vaccination_history')} icon={<Download size={16}/>}>CSV</Button>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl flex justify-between items-center">
                   <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg"><FileText size={20}/></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{t('growthData')}</p>
                      <p className="text-xs text-slate-500">{growthRecords.length} {t('records')}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportToCSV(growthRecords, 'growth_data')} icon={<Download size={16}/>}>CSV</Button>
                </div>
              </div>
            </Card>
        </>
      ) : (
          /* History List Tab */
          <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                  <Input 
                      placeholder={t('search')} 
                      icon={<Search size={18}/>} 
                      value={historySearch} 
                      onChange={e => setHistorySearch(e.target.value)}
                      className="flex-1"
                  />
                  <Select 
                      options={['All', 'Expense', 'Health', 'Milestone', 'Trip', 'Growth'].map(v => ({
                          value: v, 
                          label: v === 'All' ? t('all') : t(v.toLowerCase() as any) || v
                      }))}
                      value={historyFilter}
                      onChange={e => setHistoryFilter(e.target.value)}
                      icon={<Filter size={18}/>}
                      className="md:w-64"
                  />
              </div>

              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                   <div className="overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-slate-700 text-slate-500 uppercase font-bold text-xs">
                               <tr>
                                   <th className="px-6 py-4">{t('date')}</th>
                                   <th className="px-6 py-4">{t('category')}</th>
                                   <th className="px-6 py-4">{t('title')}</th>
                                   <th className="px-6 py-4">{t('detail')}</th>
                                   <th className="px-6 py-4 text-right">{t('action')}</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                               {unifiedHistory.map((item: any, i) => (
                                   <tr key={`${item.recordType}-${item.id}-${i}`} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => setSelectedHistoryItem(item)}>
                                       <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-600 dark:text-slate-300">{item.displayDate}</td>
                                       <td className="px-6 py-4">
                                           <Badge color={
                                               item.recordType === 'Expense' ? 'green' : 
                                               item.recordType === 'Health' ? 'red' : 
                                               item.recordType === 'Trip' ? 'blue' : 
                                               'yellow'
                                           }>
                                               {t(item.subType?.toLowerCase() as any) || t(item.recordType.toLowerCase() as any) || item.recordType}
                                           </Badge>
                                       </td>
                                       <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{item.displayTitle}</td>
                                       <td className="px-6 py-4 text-slate-500">{item.detail}</td>
                                       <td className="px-6 py-4 text-right">
                                           <button className="text-slate-400 hover:text-primary p-2">
                                               <Eye size={16}/>
                                           </button>
                                       </td>
                                   </tr>
                               ))}
                               {unifiedHistory.length === 0 && (
                                   <tr>
                                       <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">{t('noRecordsFound')}</td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>
              </div>
          </div>
      )}

      {/* History Item Detail Modal */}
      {selectedHistoryItem && (
          <Modal isOpen={true} onClose={() => setSelectedHistoryItem(null)} title={t('recordDetails')}>
              <div className="space-y-6">
                  {/* Common Header */}
                  <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-700 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                      <Badge className="mb-2" color={
                           selectedHistoryItem.recordType === 'Expense' ? 'green' : 
                           selectedHistoryItem.recordType === 'Health' ? 'red' : 
                           selectedHistoryItem.recordType === 'Trip' ? 'blue' : 
                           'yellow'
                      }>
                          {t(selectedHistoryItem.subType?.toLowerCase() as any) || t(selectedHistoryItem.recordType.toLowerCase() as any)}
                      </Badge>
                      <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1 leading-tight">{selectedHistoryItem.displayTitle}</h3>
                      <p className="text-sm font-bold text-slate-400">{selectedHistoryItem.displayDate}</p>
                  </div>

                  {/* Type Specific Content */}
                  
                  {/* 1. EXPENSE */}
                  {selectedHistoryItem.recordType === 'Expense' && (
                      <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><DollarSign size={20}/></div>
                                  <div>
                                      <p className="text-xs font-bold text-emerald-600 uppercase">{t('amount')}</p>
                                      <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">${selectedHistoryItem.amount}</p>
                                  </div>
                              </div>
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('category')}</p>
                                  <p className="font-semibold">{t(selectedHistoryItem.category.toLowerCase() as any)}</p>
                              </div>
                          </div>
                          {selectedHistoryItem.isSubscription && (
                              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-xl font-bold text-sm">
                                  <Repeat size={16}/> {t('recurringPayment')} {t(selectedHistoryItem.frequency.toLowerCase() as any)}
                              </div>
                          )}
                      </div>
                  )}

                  {/* 2. HEALTH */}
                  {selectedHistoryItem.recordType === 'Health' && (
                      <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('status')}</p>
                                  <span className={`font-bold ${selectedHistoryItem.status === 'Active' ? 'text-orange-500' : 'text-slate-700 dark:text-slate-300'}`}>{t(selectedHistoryItem.status.toLowerCase() as any)}</span>
                              </div>
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('provider')}</p>
                                  <div className="flex items-center gap-1 font-semibold truncate">
                                      <Stethoscope size={14} className="text-slate-400"/> {selectedHistoryItem.doctorName || 'N/A'}
                                  </div>
                              </div>
                          </div>
                          
                          {selectedHistoryItem.notes && (
                              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('notes')}</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{selectedHistoryItem.notes}"</p>
                              </div>
                          )}

                          {(selectedHistoryItem.medicineName || selectedHistoryItem.medicineUsage) && (
                              <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800">
                                  <div className="flex items-center gap-2 mb-2 text-orange-700 dark:text-orange-300 font-bold text-sm">
                                      <Pill size={16}/> {t('medication')}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <p className="text-[10px] uppercase font-bold text-orange-400">{t('medicineName')}</p>
                                          <p className="font-semibold text-orange-900 dark:text-orange-100">{selectedHistoryItem.medicineName || '--'}</p>
                                      </div>
                                      <div>
                                          <p className="text-[10px] uppercase font-bold text-orange-400">{t('usage')}</p>
                                          <p className="font-semibold text-orange-900 dark:text-orange-100">{selectedHistoryItem.medicineUsage || '--'}</p>
                                      </div>
                                  </div>
                                  {selectedHistoryItem.medicinePhotoUrl && (
                                      <div className="mt-3 rounded-lg overflow-hidden border border-orange-200 dark:border-orange-800">
                                          <img src={selectedHistoryItem.medicinePhotoUrl} alt="Medicine" className="w-full h-32 object-cover" />
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  )}

                  {/* 3. MILESTONE */}
                  {selectedHistoryItem.recordType === 'Milestone' && (
                      <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('category')}</p>
                                  <p className="font-semibold">{t(selectedHistoryItem.category.toLowerCase() as any)}</p>
                              </div>
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('ageAchieved')}</p>
                                  <p className="font-semibold">{selectedHistoryItem.ageMonth} {t('months')}</p>
                              </div>
                          </div>
                          
                          {selectedHistoryItem.photoUrl && (
                              <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 relative group">
                                  <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                      <ImageIcon size={12}/> {t('evidence')}
                                  </div>
                                  <img src={selectedHistoryItem.photoUrl} alt="Milestone" className="w-full h-auto max-h-64 object-cover" />
                              </div>
                          )}
                          
                          {selectedHistoryItem.notes && (
                              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('notes')}</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{selectedHistoryItem.notes}"</p>
                              </div>
                          )}
                      </div>
                  )}

                  {/* 4. TRIP */}
                  {selectedHistoryItem.recordType === 'Trip' && (
                      <div className="space-y-4">
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><MapPin size={20}/></div>
                              <div>
                                  <p className="text-xs font-bold text-blue-600 uppercase">{t('location')}</p>
                                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{selectedHistoryItem.location}</p>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('start')}</p>
                                  <p className="font-semibold">{selectedHistoryItem.startDate}</p>
                              </div>
                              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('end')}</p>
                                  <p className="font-semibold">{selectedHistoryItem.endDate}</p>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* 5. GROWTH */}
                  {selectedHistoryItem.recordType === 'Growth' && (
                      <div className="space-y-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                              <p className="text-xs font-bold text-slate-400 uppercase mb-1">{t('age')}</p>
                              <p className="text-xl font-bold text-slate-900 dark:text-white">{selectedHistoryItem.ageMonths} {t('months')}</p>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800 text-center">
                                  <Ruler size={16} className="mx-auto text-blue-500 mb-1"/>
                                  <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{selectedHistoryItem.heightCm}</p>
                                  <p className="text-[10px] font-bold text-blue-400 uppercase">CM</p>
                              </div>
                              <div className="p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-800 text-center">
                                  <Weight size={16} className="mx-auto text-rose-500 mb-1"/>
                                  <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{selectedHistoryItem.weightKg}</p>
                                  <p className="text-[10px] font-bold text-rose-400 uppercase">KG</p>
                              </div>
                              <div className="p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800 text-center">
                                  <ShieldCheck size={16} className="mx-auto text-purple-500 mb-1"/>
                                  <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                                      {/* BMI Calc for History */}
                                      {selectedHistoryItem.heightCm > 0 ? (selectedHistoryItem.weightKg / Math.pow(selectedHistoryItem.heightCm / 100, 2)).toFixed(1) : '--'}
                                  </p>
                                  <p className="text-[10px] font-bold text-purple-400 uppercase">BMI</p>
                              </div>
                          </div>
                      </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                      <Button onClick={() => setSelectedHistoryItem(null)}>{t('close')}</Button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
