
import React, { useState, useMemo, useEffect } from 'react';
import { Milestone, GrowthRecord } from '../../types';
import { Button, Card, Badge, Input, Modal, RadioGroup, DatePicker, ConfettiBurst, Select } from '../UI';
import { CheckCircle, Circle, Plus, Trophy, Upload, Trash2, Edit2, Activity, Ruler, Weight, ChevronUp, Sparkles, Brain, Loader2, Link as LinkIcon, ScanFace, TrendingUp, Compass, Heart, Scale, Eye, Calendar, Info, AlertCircle, Camera, Baby, CheckSquare, Footprints, Smile, MessageCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { saveMilestone, saveGrowthRecord, deleteGrowthRecord, deleteMilestone } from '../../services/neon';
import { generateChildInsights } from '../../services/geminiService';
import { STANDARD_MILESTONES, WHO_GROWTH_STANDARDS } from '../../constants';

// High-efficiency Image Compression Utility
const compressImage = (dataUrl: string, maxWidth: number = 800, quality: number = 0.6): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width *= maxWidth / height;
                    height = maxWidth;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = dataUrl;
    });
};

interface Props {
  milestones: Milestone[];
  onToggleMilestone: (id: string) => void;
  growthRecords: GrowthRecord[];
  onAddGrowth: (record: Omit<GrowthRecord, 'id'>) => void;
  onAddMilestone: () => void;
  onRefresh: (scope?: string[]) => void;
  isDark: boolean;
  t: (key: any) => string;
  childDob?: string;
  lang?: string;
  deepLink?: { id: string; type: string } | null;
  onConsumeDeepLink?: () => void;
}

export const DevelopmentView: React.FC<Props> = ({ milestones: propMilestones, onToggleMilestone, growthRecords, onAddGrowth, onAddMilestone, onRefresh, isDark, t, childDob, lang, deepLink, onConsumeDeepLink }) => {
  const [activeTab, setActiveTab] = useState<'milestones' | 'growth'>('milestones');
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>(propMilestones);
  const [aiInsight, setAiInsight] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => { setLocalMilestones(propMilestones); }, [propMilestones]);

  useEffect(() => {
    if (deepLink && onConsumeDeepLink) {
        if (deepLink.type === 'Milestone') {
            const milestone = localMilestones.find(m => m.id === deepLink.id);
            if (milestone) { setActiveTab('milestones'); handleViewMilestone(milestone); onConsumeDeepLink(); }
        } else if (deepLink.type === 'Growth') {
            setActiveTab('growth'); onConsumeDeepLink();
        }
    }
  }, [deepLink, localMilestones]);
  
  const [isGrowthModalOpen, setIsGrowthModalOpen] = useState(false);
  const [isViewGrowthModalOpen, setIsViewGrowthModalOpen] = useState(false);
  const [editingGrowthId, setEditingGrowthId] = useState<string | null>(null);
  const [viewingGrowthRecord, setViewingGrowthRecord] = useState<GrowthRecord | null>(null);
  const [growthFormData, setGrowthFormData] = useState<Partial<GrowthRecord>>({ date: new Date().toISOString().split('T')[0] });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleToggleWithConfetti = (id: string) => {
      const m = localMilestones.find(x => x.id === id);
      if(m && !m.completed) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
      }
      onToggleMilestone(id);
  }

  const handleEditMilestone = (m: Milestone) => { setSelectedMilestone(m); setIsEditModalOpen(true); };
  const handleViewMilestone = (m: Milestone) => { setSelectedMilestone(m); setIsViewModalOpen(true); };
  const handleAddNewMilestone = () => { setSelectedMilestone({ id: Date.now().toString(), title: '', category: 'Physical', ageMonth: 0, completed: false }); setIsEditModalOpen(true); }

  const handleDeleteMilestone = async (id: string, e?: React.MouseEvent) => {
      if (e) { e.stopPropagation(); e.preventDefault(); }
      if (window.confirm(t('confirmDelete'))) {
          setIsViewModalOpen(false);
          const prevMilestones = [...localMilestones];
          setLocalMilestones(prev => prev.filter(m => m.id !== id));
          try {
              const success = await deleteMilestone(id);
              if (success) await onRefresh(['milestones']);
              else { setLocalMilestones(prevMilestones); alert("Could not delete item."); }
          } catch (error) { setLocalMilestones(prevMilestones); alert("An error occurred."); }
      }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(!selectedMilestone) return;
      const val = e.target.value;
      const updates: any = { title: val };
      // Check if current value matches any standard milestone translation
      const match = STANDARD_MILESTONES.find(m => t(m.key as any) === val || m.key === val);
      if (match) { 
        updates.ageMonth = match.age; 
        updates.category = match.category; 
        // If they pick from list, we can keep the translated title
        updates.title = t(match.key as any);
      }
      setSelectedMilestone(prev => prev ? ({...prev, ...updates}) : null);
  };

  const formatAgeDisplay = (months: number) => {
      const y = Math.floor(months / 12);
      const m = Math.floor(months % 12);
      if (y > 0) return `${y}y ${m}m`;
      return `${m}m`;
  };

  const calculateAgeFromDate = (dateStr: string) => {
      if (!childDob) return 0;
      const birth = new Date(childDob);
      const current = new Date(dateStr);
      const diffTime = current.getTime() - birth.getTime();
      if (isNaN(diffTime) || diffTime < 0) return 0;
      const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.4375);
      return parseFloat(diffMonths.toFixed(1));
  };

  const calculateBMI = (heightCm: number, weightKg: number) => {
      if (!heightCm || !weightKg) return 0;
      return weightKg / Math.pow(heightCm / 100, 2);
  };

  const getBMICategory = (bmi: number) => {
      if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500', bg: 'bg-blue-500', border: 'border-blue-200' };
      if (bmi < 25) return { label: 'Healthy Weight', color: 'text-green-500', bg: 'bg-green-500', border: 'border-green-200' };
      if (bmi < 30) return { label: 'Overweight', color: 'text-orange-500', bg: 'bg-orange-500', border: 'border-orange-200' };
      return { label: 'Obese', color: 'text-red-500', bg: 'bg-red-500', border: 'border-red-200' };
  };

  const handleOpenGrowthModal = (record?: GrowthRecord) => {
      if (record) { setEditingGrowthId(record.id); setGrowthFormData(record); } 
      else {
          setEditingGrowthId(null);
          const today = new Date().toISOString().split('T')[0];
          const initialAge = childDob ? calculateAgeFromDate(today) : undefined;
          setGrowthFormData({ date: today, ageMonths: initialAge, heightCm: undefined, weightKg: undefined, headCircumferenceCm: undefined });
      }
      setIsGrowthModalOpen(true);
  };

  const handleViewGrowth = (record: GrowthRecord) => { setViewingGrowthRecord(record); setIsViewGrowthModalOpen(true); };

  const handleSaveGrowth = async () => {
    if (!growthFormData.ageMonths || !growthFormData.heightCm || !growthFormData.weightKg) return;
    setIsGrowthModalOpen(false);
    const record: GrowthRecord = {
      id: editingGrowthId || Date.now().toString(),
      date: growthFormData.date || new Date().toISOString().split('T')[0],
      ageMonths: Number(growthFormData.ageMonths),
      heightCm: Number(growthFormData.heightCm),
      weightKg: Number(growthFormData.weightKg),
      headCircumferenceCm: Number(growthFormData.headCircumferenceCm) || 0
    };
    await saveGrowthRecord(record);
    onRefresh(['growth']);
  };

  const handleDeleteGrowth = async (id: string) => {
    if(window.confirm(t('confirmDelete'))) { 
        setIsViewGrowthModalOpen(false);
        await deleteGrowthRecord(id); 
        onRefresh(['growth']);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedMilestone) {
        if (file.size > 10 * 1024 * 1024) { alert("File size too large."); return; }
        setIsCompressing(true);
        const reader = new FileReader();
        reader.onloadend = async (ev) => {
            const originalDataUrl = ev.target?.result as string;
            const optimizedDataUrl = await compressImage(originalDataUrl);
            setSelectedMilestone({ ...selectedMilestone, photoUrl: optimizedDataUrl });
            setIsCompressing(false);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleNoteSave = async () => {
      if(selectedMilestone && selectedMilestone.title) {
          setIsEditModalOpen(false);
          const milestoneToSave = { ...selectedMilestone };
          if (milestoneToSave.completed && !milestoneToSave.dateCompleted) {
              milestoneToSave.dateCompleted = new Date().toISOString().split('T')[0];
          }
          if(milestoneToSave.completed && !selectedMilestone.completed) {
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 3000);
          }
          await saveMilestone(milestoneToSave);
          onRefresh(['milestones']);
      }
  }

  const handleGenerateInsight = async () => {
    setIsAnalyzing(true);
    setAiInsight(null);
    const sortedGrowth = [...growthRecords].sort((a,b) => a.ageMonths - b.ageMonths);
    const latest = sortedGrowth[sortedGrowth.length - 1];
    const previous = sortedGrowth.length > 1 ? sortedGrowth[sortedGrowth.length - 2] : null;
    const completed = localMilestones.filter(m => m.completed);
    const pending = localMilestones.filter(m => !m.completed).sort((a,b) => a.ageMonth - b.ageMonth).slice(0, 3);
    const childData = {
        age: latest ? `${latest.ageMonths} months` : 'Unknown',
        growth: {
            current: latest ? { height: latest.heightCm, weight: latest.weightKg, head: latest.headCircumferenceCm } : null,
            previous: previous ? { height: previous.heightCm, weight: previous.weightKg } : null,
        },
        milestones: { recentAchievements: completed.slice(-3).map(m => m.title), nextUp: pending.map(m => m.title), totalCompleted: completed.length }
    };
    const result = await generateChildInsights(childData, lang);
    setAiInsight(result);
    setIsAnalyzing(false);
  };

  const getActualAge = (completedDate?: string) => {
    if (!completedDate || !childDob) return 'N/A'; 
    const start = new Date(childDob);
    const end = new Date(completedDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diffTime = end.getTime() - start.getTime(); 
    if (diffTime < 0) return 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return (diffDays / 30.44).toFixed(1);
  };

  const chartData = useMemo(() => {
      const dataMap = new Map<number, any>();
      WHO_GROWTH_STANDARDS.forEach(d => { dataMap.set(d.age, { ageMonths: d.age, standardHeight: d.height, standardWeight: d.weight, standardHead: d.headCircumference }); });
      growthRecords.forEach(r => {
          const existing = dataMap.get(r.ageMonths) || { ageMonths: r.ageMonths };
          existing.weightKg = r.weightKg;
          existing.heightCm = r.heightCm;
          existing.headCircumferenceCm = r.headCircumferenceCm;
          existing.date = r.date;
          if (r.heightCm > 0) {
              const heightM = r.heightCm / 100;
              const bmi = r.weightKg / (heightM * heightM);
              existing.bmi = parseFloat(bmi.toFixed(1));
          }
          dataMap.set(r.ageMonths, existing);
      });
      return Array.from(dataMap.values()).sort((a, b) => a.ageMonths - b.ageMonths);
  }, [growthRecords]);

  const sortedHistory = useMemo(() => {
      return [...growthRecords].sort((a, b) => b.ageMonths - a.ageMonths).map(r => {
          let bmi = 'N/A';
          if (r.heightCm > 0) bmi = (r.weightKg / Math.pow(r.heightCm / 100, 2)).toFixed(1);
          return { ...r, bmi };
      });
  }, [growthRecords]);

  const progressStats = useMemo(() => {
      const cats = ['Physical', 'Cognitive', 'Social'];
      return cats.map(c => {
          const total = localMilestones.filter(m => m.category === c).length;
          const done = localMilestones.filter(m => m.category === c && m.completed).length;
          return { category: c, total, done, percent: total > 0 ? (done / total) * 100 : 0 };
      });
  }, [localMilestones]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const userPoint = payload.find((p: any) => p.dataKey === 'weightKg' || p.dataKey === 'heightCm' || p.dataKey === 'bmi' || p.dataKey === 'headCircumferenceCm');
        const date = userPoint?.payload?.date;
        const ageFormatted = formatAgeDisplay(Number(label));
        const ageRaw = Number(label).toFixed(1);
        return (
            <div className="bg-white/95 dark:bg-slate-900/95 p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 backdrop-blur-md min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
                <div className="mb-3 border-b border-slate-100 dark:border-slate-800 pb-2"><p className="font-black text-lg text-slate-800 dark:text-white leading-tight">{ageFormatted}</p><div className="flex items-center justify-between mt-1"><span className="text-xs text-slate-400 font-bold tracking-wide">{ageRaw}m old</span>{date ? (<span className="text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{date}</span>) : (<span className="text-[10px] text-slate-400 font-medium italic opacity-70">WHO Standard</span>)}</div></div>
                <div className="space-y-1.5">{payload.map((p: any, i: number) => { const isChild = !p.name.includes('Avg') && !p.name.includes('Standard') && !p.name.includes('WHO'); return (<div key={`${p.name}-${i}`} className={`flex items-center justify-between text-sm gap-4 ${isChild ? 'font-bold' : 'opacity-70'}`}><span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><div className="w-2 h-2 rounded-full shadow-sm" style={{backgroundColor: p.color}}></div><span className="truncate max-w-[100px]">{p.name}:</span></span><span className={`font-mono ${isChild ? 'text-slate-900 dark:text-white text-base' : 'text-slate-500'}`}>{p.value}{(p.name.toLowerCase().includes('height') || p.name.toLowerCase().includes('head') || p.unit === 'cm') && <span className="text-[10px] ml-0.5 text-slate-400">cm</span>}{(p.name.toLowerCase().includes('weight') || p.unit === 'kg') && <span className="text-[10px] ml-0.5 text-slate-400">kg</span>}</span></div>);})}</div>
            </div>
        );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <ConfettiBurst show={showConfetti} />
      <Card className="bg-gradient-to-br from-orange-50 to-white dark:from-slate-900 dark:to-orange-950/20 border-orange-100 dark:border-orange-900/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Brain size={160} /></div>
          <div className="relative z-10">
              <div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-black text-slate-800 dark:text-orange-100 flex items-center gap-3"><Sparkles className="text-orange-500" size={24} fill="currentColor" />AI Development Insights</h3><p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Professional analysis of growth & milestones</p></div><Button size="md" onClick={handleGenerateInsight} disabled={isAnalyzing} className="shadow-xl shadow-orange-500/20 px-6" icon={isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}>{isAnalyzing ? 'Analyzing...' : 'Generate Insight'}</Button></div>
              {aiInsight ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500"><div className="p-5 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white dark:border-slate-800 shadow-sm"><h4 className="flex items-center gap-2 text-sm font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-3"><TrendingUp size={16}/> Growth Trajectory</h4><p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{aiInsight.growthSummary}</p></div><div className="p-5 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white dark:border-slate-800 shadow-sm"><h4 className="flex items-center gap-2 text-sm font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-3"><Trophy size={16}/> Milestone Mastery</h4><p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{aiInsight.milestoneSummary}</p></div><div className="md:col-span-2 p-5 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/30"><h4 className="flex items-center gap-2 text-sm font-black text-orange-50 uppercase tracking-widest mb-4"><Compass size={16}/> Suggested Focus Activities</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{aiInsight.activities?.map((act: string, idx: number) => (<div key={`${act}-${idx}`} className="flex items-start gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/20"><div className="mt-1"><CheckCircle size={14}/></div><p className="text-sm font-bold leading-snug">{act}</p></div>))}</div><div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0"><Heart size={14} fill="white"/></div><p className="text-xs font-bold opacity-90 italic">"{aiInsight.summary}"</p></div></div></div>) : (!isAnalyzing && <div className="p-12 border-2 border-dashed border-orange-200 dark:border-orange-800/50 rounded-3xl text-center text-orange-400 bg-orange-50/30 dark:bg-transparent"><Brain size={48} className="mx-auto mb-4 opacity-30" /><p className="text-lg font-black">{t('noData')}</p><p className="text-sm opacity-70">Tap "Generate Insight" to get a personalized AI report on your child's progress.</p></div>)}
          </div>
      </Card>
      <div className="flex p-1.5 bg-slate-200/50 dark:bg-black/20 backdrop-blur-sm rounded-full w-fit">{['milestones', 'growth'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2 rounded-full text-sm font-bold capitalize transition-all duration-300 ${activeTab === tab ? 'bg-white dark:bg-slate-700 shadow-sm scale-105 text-primary' : 'text-slate-500 hover:text-slate-700'}`}>{t(tab)}</button>))}</div>
      {activeTab === 'milestones' && (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-2">{progressStats.map((stat, idx) => (<div key={stat.category} className="bg-white dark:bg-dark-card rounded-xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-primary/30 transition-all"><div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity ${idx === 0 ? 'text-blue-500' : idx === 1 ? 'text-purple-500' : 'text-green-500'}`}>{idx === 0 ? <Footprints size={48}/> : idx === 1 ? <Brain size={48}/> : <Smile size={48}/>}</div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t(stat.category.toLowerCase() as any)}</p><div className="flex items-end gap-1 mb-1"><h3 className="text-xl font-black">{stat.percent.toFixed(0)}%</h3><span className="text-[9px] font-medium text-slate-500 mb-0.5">Done</span></div><div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-purple-500' : 'bg-green-500'}`} style={{width: `${stat.percent}%`}}></div></div></div>))}</div>
          <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2"><Trophy size={24} className="text-yellow-500" /> {t('milestones')}</h3><Button icon={<Plus size={16}/>} onClick={handleAddNewMilestone}>{t('addMilestone')}</Button></div>
          <div className="space-y-2">
            {localMilestones.sort((a,b) => {
                if (a.completed && b.completed) return new Date(b.dateCompleted || 0).getTime() - new Date(a.dateCompleted || 0).getTime();
                if (!a.completed && !b.completed) return a.ageMonth - b.ageMonth;
                return a.completed ? 1 : -1;
            }).map((m) => {
                const isPhysical = m.category === 'Physical';
                const isCognitive = m.category === 'Cognitive';
                const themeColor = isPhysical ? 'blue' : isCognitive ? 'purple' : 'green';
                const icon = isPhysical ? <Footprints size={14}/> : isCognitive ? <Brain size={14}/> : <Smile size={14}/>;
                const standardInfo = STANDARD_MILESTONES.find(sm => sm.key === m.title || t(sm.key as any) === m.title);
                const expectedAge = m.ageMonth > 0 ? m.ageMonth : (standardInfo?.age || '?');
                return (<div key={m.id} onClick={() => handleViewMilestone(m)} className={`flex items-center gap-3 bg-white dark:bg-dark-card rounded-xl p-2 border transition-all duration-300 cursor-pointer hover:shadow-sm ${m.completed ? `border-${themeColor}-100 dark:border-${themeColor}-900/30` : 'border-slate-100 dark:border-slate-800'}`}><button onClick={(e) => {e.stopPropagation(); handleToggleWithConfetti(m.id);}} className={`p-1.5 rounded-full transition-all ${m.completed ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'}`}>{m.completed ? <CheckCircle size={14}/> : <Circle size={14}/>}</button><div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.completed ? `bg-${themeColor}-50 text-${themeColor}-600 dark:bg-${themeColor}-900/20 dark:text-${themeColor}-400` : 'bg-slate-50 text-slate-400 dark:bg-white/5'}`}>{m.photoUrl ? (<img src={m.photoUrl} alt={m.title} className="w-full h-full object-cover rounded-lg" />) : (icon)}</div><div className="flex-grow min-w-0"><h4 className={`text-xs font-bold leading-tight truncate ${m.completed ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{m.title}</h4><p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{t(m.category.toLowerCase() as any)} • {m.completed ? (m.dateCompleted || 'Done') : `${t('expected')}: ${expectedAge}m`}</p></div><div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); handleEditMilestone(m); }} className="p-1 text-slate-400 hover:text-primary rounded"><Edit2 size={12}/></button><button onClick={(e) => handleDeleteMilestone(m.id, e)} className="p-1 text-slate-400 hover:text-red-500 rounded"><Trash2 size={12}/></button></div></div>);
            })}
            <div onClick={handleAddNewMilestone} className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-3 text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer"><div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Plus size={16} /></div><span className="font-bold text-xs">{t('addMilestone')}</span></div>
          </div>
        </div>
      )}

      {activeTab === 'growth' && (
        <div className="space-y-6">
          <div className="flex justify-end"><Button icon={<Plus size={16}/>} onClick={() => handleOpenGrowthModal()}>{t('logMeasurement')}</Button></div>
          <Card title={t('growthCharts')} subtitle={`${t('height')} & ${t('weight')}`}><div className="h-[400px] w-full mt-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} /><XAxis dataKey="ageMonths" stroke={isDark ? "#94a3b8" : "#64748b"} type="number" domain={[0, 'auto']}/><YAxis yAxisId="left" stroke="#ec4899" label={{ value: 'kg', angle: -90, position: 'insideLeft', fill: '#ec4899' }} /><YAxis yAxisId="right" orientation="right" stroke="#F97316" label={{ value: 'cm', angle: 90, position: 'insideRight', fill: '#F97316' }}/><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="top" height={36} iconType="circle" /><Line yAxisId="left" type="monotone" dataKey="standardWeight" name={`Avg ${t('weight')} (kg)`} stroke="#ec4899" strokeDasharray="5 5" dot={false} opacity={0.3} /><Line yAxisId="right" type="monotone" dataKey="standardHeight" name={`Avg ${t('height')} (cm)`} stroke="#F97316" strokeDasharray="5 5" dot={false} opacity={0.3} /><Line yAxisId="left" type="monotone" dataKey="weightKg" name={`Child ${t('weight')}`} stroke="#ec4899" strokeWidth={3} dot={{fill: '#fff'}} /><Line yAxisId="right" type="monotone" dataKey="heightCm" name={`Child ${t('height')}`} stroke="#F97316" strokeWidth={3} dot={{fill: '#fff'}} /></LineChart></ResponsiveContainer></div></Card>
          <Card title="BMI Trend" subtitle="Body Mass Index (Age 0 - Adult)"><div className="h-[300px] w-full mt-4">{chartData.some(d => d.bmi) ? (<ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} /><XAxis dataKey="ageMonths" stroke={isDark ? "#94a3b8" : "#64748b"} type="number" domain={[0, 'auto']}/><YAxis stroke="#8b5cf6" domain={[10, 35]} label={{ value: 'BMI', angle: -90, position: 'insideLeft', fill: '#8b5cf6' }} /><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="top" height={36} iconType="circle" /><Line type="monotone" dataKey="bmi" name="BMI" stroke="#8b5cf6" strokeWidth={3} dot={{fill: '#fff', r: 4}} activeDot={{r: 6}} /></LineChart></ResponsiveContainer>) : (<div className="flex flex-col items-center justify-center h-full text-slate-400"><Scale size={48} className="mb-2 opacity-50" /><p>No enough data to calculate BMI yet.</p><p className="text-xs">Add Height & Weight to see trends.</p></div>)}</div></Card>
          <Card title={t('headCirc')} subtitle="Brain Development Indicator"><div className="h-[300px] w-full mt-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} vertical={false} /><XAxis dataKey="ageMonths" stroke={isDark ? "#94a3b8" : "#64748b"} type="number" domain={[0, 'auto']}/><YAxis stroke="#10b981" domain={['dataMin - 2', 'dataMax + 2']} label={{ value: 'cm', angle: -90, position: 'insideLeft', fill: '#10b981' }} /><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="top" height={36} iconType="circle" /><Line type="monotone" dataKey="standardHead" name="WHO Standard (cm)" stroke="#10b981" strokeDasharray="5 5" dot={false} opacity={0.3} /><Line type="monotone" dataKey="headCircumferenceCm" name={`Child ${t('headCirc')}`} stroke="#10b981" strokeWidth={3} dot={{fill: '#fff', r: 4}} activeDot={{r: 6}} /></LineChart></ResponsiveContainer></div></Card>
          <Card title={t('history_growth')} className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-slate-700 text-slate-500 uppercase font-bold text-xs"><tr><th className="px-6 py-4">{t('date')}</th><th className="px-6 py-4">{t('ageMonths')}</th><th className="px-6 py-4">{t('height')}</th><th className="px-6 py-4">{t('weight')}</th><th className="px-6 py-4">{t('headCirc')}</th><th className="px-6 py-4">BMI</th><th className="px-6 py-4 text-right">{t('action')}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{sortedHistory.map((record) => (<tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => handleViewGrowth(record)}><td className="px-6 py-4 font-medium">{record.date}</td><td className="px-6 py-4">{record.ageMonths}</td><td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{record.heightCm} cm</td><td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{record.weightKg} kg</td><td className="px-6 py-4">{record.headCircumferenceCm ? `${record.headCircumferenceCm} cm` : '--'}</td><td className="px-6 py-4"><Badge color={!record.bmi || record.bmi === 'N/A' ? 'gray' : parseFloat(record.bmi) < 18.5 ? 'blue' : parseFloat(record.bmi) > 25 ? 'orange' : 'green'}>{record.bmi}</Badge></td><td className="px-6 py-4 text-right"><div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => {e.stopPropagation(); handleViewGrowth(record);}} className="text-slate-400 hover:text-primary transition-colors"><Eye size={16} /></button><button onClick={(e) => {e.stopPropagation(); handleOpenGrowthModal(record);}} className="text-slate-400 hover:text-blue-500 transition-colors"><Edit2 size={16} /></button><button onClick={(e) => {e.stopPropagation(); handleDeleteGrowth(record.id);}} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button></div></td></tr>))}{sortedHistory.length === 0 && (<tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400 italic">{t('noData')}</td></tr>)}</tbody></table></div></Card>
        </div>
      )}

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={selectedMilestone?.id ? t('edit') : t('addMilestone')}>
         {selectedMilestone && (
             <div className="space-y-6">
                 <RadioGroup label={t('category')} options={[{value: 'Physical', label: t('physical'), icon: <Footprints size={16}/>},{value: 'Cognitive', label: t('cognitive'), icon: <Brain size={16}/>},{value: 'Social', label: t('social'), icon: <Smile size={16}/>}]} value={selectedMilestone.category} onChange={(v) => setSelectedMilestone({...selectedMilestone, category: v})} gridCols={3}/>
                 <Input label={t('title')} autoComplete="off" value={selectedMilestone.title} onChange={handleTitleChange} list="milestone-suggestions-modal" placeholder={t('selectOrType')}/>
                 <datalist id="milestone-suggestions-modal">
                    {STANDARD_MILESTONES.map(m => (<option key={m.key} value={t(m.key as any)} />))}
                 </datalist>
                <div className="grid grid-cols-2 gap-4"><Input label={t('expected')} type="number" value={selectedMilestone.ageMonth?.toString() || ''} onChange={(e) => setSelectedMilestone({...selectedMilestone, ageMonth: parseFloat(e.target.value) || 0})}/><DatePicker label={t('completedDate')} value={selectedMilestone.dateCompleted || ''} onChange={(e) => { const date = e.target.value; setSelectedMilestone(prev => prev ? ({ ...prev, dateCompleted: date, completed: !!date }) : null); }}/></div>
                 <div className="flex flex-col items-center mb-4"><div className={`relative group cursor-pointer w-full h-32 border-2 border-dashed ${isCompressing ? 'border-primary' : 'border-slate-300'} rounded-2xl flex items-center justify-center hover:bg-slate-50 transition-colors overflow-hidden`}>{isCompressing ? <Loader2 className="animate-spin text-primary" size={32}/> : (selectedMilestone.photoUrl ? (<img src={selectedMilestone.photoUrl} alt="Milestone" className="w-full h-full object-cover" />) : (<div className="text-center"><Upload className="text-slate-400 mb-2 mx-auto" size={32} /><p className="text-sm font-bold text-slate-600">{t('uploadPhoto')}</p></div>))}<input type="file" className="opacity-0 absolute inset-0 cursor-pointer" onChange={handlePhotoUpload} accept="image/*" disabled={isCompressing}/></div></div>
                 <Input label={t('notes')} placeholder="Details..." value={selectedMilestone.notes || ''} onChange={(e) => setSelectedMilestone({...selectedMilestone, notes: e.target.value})}/><div className="flex justify-end gap-2 mt-4"><Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>{t('cancel')}</Button><Button onClick={() => handleNoteSave()} disabled={isCompressing}>{t('save')}</Button></div>
             </div>
         )}
      </Modal>

      {selectedMilestone && (<Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={t('recordDetails')}><div className="space-y-6"><div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 rounded-3xl text-white shadow-lg"><Badge color="green">{selectedMilestone.completed ? t('completed') : t('upcoming')}</Badge><h2 className="text-3xl font-extrabold mt-2 mb-1">{selectedMilestone.title}</h2><p className="opacity-90 flex items-center gap-2 text-sm"><Activity size={16}/> {t(selectedMilestone.category.toLowerCase())}</p></div>{selectedMilestone.photoUrl && (<div className="w-full h-48 rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-700"><img src={selectedMilestone.photoUrl} className="w-full h-full object-cover" alt="Milestone" /></div>)}<div className="grid grid-cols-2 gap-4"><div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-700"><p className="text-xs text-slate-400 font-bold uppercase mb-1">{t('expected')}</p><p className="font-bold text-slate-800 dark:text-white">{selectedMilestone.ageMonth} {t('months')}</p></div><div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-700"><p className="text-xs text-slate-400 font-bold uppercase mb-1">{t('completedDate')}</p><p className="font-bold text-slate-800 dark:text-white">{selectedMilestone.dateCompleted || '--'}</p></div></div><div className="flex justify-end gap-3 pt-4"><Button variant="ghost" onClick={() => setIsViewModalOpen(false)}>{t('cancel')}</Button><Button onClick={() => { setIsViewModalOpen(false); handleEditMilestone(selectedMilestone); }} icon={<Edit2 size={16}/>}>{t('edit')}</Button><Button onClick={(e) => { setIsViewModalOpen(false); handleDeleteMilestone(selectedMilestone.id, e); }} icon={<Trash2 size={16}/>} className="bg-red-100 text-red-600">{t('delete')}</Button></div></div></Modal>)}
      <Modal isOpen={isGrowthModalOpen} onClose={() => setIsGrowthModalOpen(false)} title={editingGrowthId ? t('edit') : t('logMeasurement')}><div className="space-y-6"><div className="grid grid-cols-2 gap-4"><DatePicker label={t('date')} value={growthFormData.date || ''} onChange={e => { const newDate = e.target.value; let newAge = growthFormData.ageMonths; if (childDob && newDate) newAge = calculateAgeFromDate(newDate); setGrowthFormData({...growthFormData, date: newDate, ageMonths: newAge}); }} /><Input label={t('ageMonths')} type="number" value={growthFormData.ageMonths?.toString() || ''} onChange={e => setGrowthFormData({...growthFormData, ageMonths: parseFloat(e.target.value) || 0})} /></div><div className="grid grid-cols-3 gap-4"><Input label={`${t('height')} (cm)`} type="number" value={growthFormData.heightCm?.toString() || ''} onChange={e => setGrowthFormData({...growthFormData, heightCm: parseFloat(e.target.value) || 0})} /><Input label={`${t('weight')} (kg)`} type="number" value={growthFormData.weightKg?.toString() || ''} onChange={e => setGrowthFormData({...growthFormData, weightKg: parseFloat(e.target.value) || 0})} /><Input label={`${t('headCirc')} (cm)`} type="number" value={growthFormData.headCircumferenceCm?.toString() || ''} onChange={e => setGrowthFormData({...growthFormData, headCircumferenceCm: parseFloat(e.target.value) || 0})} /></div><div className="flex justify-end pt-4 gap-2"><Button variant="ghost" onClick={() => setIsGrowthModalOpen(false)}>{t('cancel')}</Button><Button onClick={handleSaveGrowth}>{editingGrowthId ? t('update') : t('save')}</Button></div></div></Modal>
      {viewingGrowthRecord && (<Modal isOpen={isViewGrowthModalOpen} onClose={() => setIsViewGrowthModalOpen(false)} title={t('recordDetails')}><div className="space-y-6"><div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-3xl text-white shadow-lg text-center"><p className="text-sm opacity-80 uppercase font-bold tracking-widest mb-1">{t('age')}</p><h2 className="text-4xl font-extrabold">{viewingGrowthRecord.ageMonths} {t('months')}</h2><div className="mt-2 flex items-center justify-center gap-2 text-sm bg-white/20 backdrop-blur-md rounded-full py-1 px-3 w-fit mx-auto"><Calendar size={14}/> {viewingGrowthRecord.date}</div></div><div className="grid grid-cols-2 gap-3"><div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-700 text-center"><Ruler size={24} className="mx-auto text-blue-500 mb-2"/><p className="text-xs text-slate-400 font-bold uppercase mb-1">{t('height')}</p><p className="font-black text-xl text-slate-800 dark:text-white">{viewingGrowthRecord.heightCm} <span className="text-sm font-medium text-slate-400">cm</span></p></div><div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-700 text-center"><Weight size={24} className="mx-auto text-rose-500 mb-2"/><p className="text-xs text-slate-400 font-bold uppercase mb-1">{t('weight')}</p><p className="font-black text-xl text-slate-800 dark:text-white">{viewingGrowthRecord.weightKg} <span className="text-sm font-medium text-slate-400">kg</span></p></div></div>{(() => { const bmi = calculateBMI(viewingGrowthRecord.heightCm, viewingGrowthRecord.weightKg); const { label, color, bg, border } = getBMICategory(bmi); const percent = Math.min(100, Math.max(0, ((bmi - 12) / (32 - 12)) * 100)); return (<div className={`p-5 rounded-2xl border ${border} bg-white dark:bg-white/5 shadow-sm relative overflow-hidden`}><div className={`absolute top-0 left-0 w-1 h-full ${bg}`}></div><div className="flex justify-between items-end mb-4"><div><p className="text-xs text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><Scale size={14}/> BMI Analysis</p><p className={`text-2xl font-black ${color}`}>{bmi.toFixed(1)}</p></div><Badge className={`${bg} text-white border-none shadow-sm px-3 py-1`}>{label}</Badge></div><div className="relative h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full mb-2 overflow-hidden shadow-inner"><div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-blue-300 via-green-400 to-red-400 opacity-80"></div><div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] border-x border-slate-400 z-10 transition-all duration-500" style={{ left: `${percent}%` }}></div></div><div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider"><span>12.0</span><span>Healthy (18.5-25)</span><span>32.0+</span></div><div className="mt-4 flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700"><AlertCircle size={14} className="shrink-0 mt-0.5 text-blue-500"/><p>BMI ranges shown are general indicators. For children, growth percentiles are more accurate. Consult a doctor for medical advice.</p></div></div>); })()}<div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700"><Button variant="ghost" onClick={() => setIsViewGrowthModalOpen(false)}>{t('close')}</Button><Button onClick={() => { setIsViewGrowthModalOpen(false); handleOpenGrowthModal(viewingGrowthRecord); }} icon={<Edit2 size={16}/>}>{t('edit')}</Button><Button onClick={() => handleDeleteGrowth(viewingGrowthRecord.id)} icon={<Trash2 size={16}/>} className="bg-red-100 text-red-600">{t('delete')}</Button></div></div></Modal>)}
    </div>
  );
};
