
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MedicalRecord, Caregiver, ChatMessage, MedicationItem } from '../../types';
import { Card, Badge, Button, Modal, Input, Select, DatePicker, RadioGroup } from '../UI';
import { Syringe, Calendar, AlertTriangle, Pill, Plus, Thermometer, FileText, Trash2, Edit2, User, Heart, Stethoscope, Check, Activity, Droplet, Clock, ShieldAlert, Scissors, Bell, Eye, ChevronRight, ChevronDown, CheckCircle, Upload, CheckCircle2, History, Timer, BellRing, Sparkles, Loader2, Send, Bot, MessageSquareText, ShieldCheck, UserCog, TrendingUp, Info, Search, LayoutGrid, CalendarDays, Moon, Camera, Maximize2, X, ZoomIn } from 'lucide-react';
import { saveHealthRecord, deleteHealthRecord } from '../../services/neon';
import { getAiAdvice } from '../../services/geminiService';
import { VACCINATION_SCHEDULE, VACCINE_INFO } from '../../constants';
import { getKhmerLunarDate } from '../../services/khmerCalendar';

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
  records: MedicalRecord[];
  caregivers?: Caregiver[];
  isDark: boolean;
  onRefresh: (scope?: string[]) => void;
  t: (key: any) => string;
  lang?: string;
  deepLink?: { id: string; type: string } | null;
  onConsumeDeepLink?: () => void;
}

export const HealthView: React.FC<Props> = ({ records, caregivers = [], isDark, onRefresh, t, lang, deepLink, onConsumeDeepLink }) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(caregivers.find(c => c.role === 'Child')?.id || 'all');
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'vaccination' | 'calendar'>('records');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingRecord, setViewingRecord] = useState<MedicalRecord | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<Partial<MedicalRecord>>({
      type: 'Visit',
      status: 'Scheduled',
      date: new Date().toISOString().split('T')[0],
      memberId: selectedMemberId !== 'all' ? selectedMemberId : undefined,
      medications: []
  });
  const [tempMed, setTempMed] = useState<Partial<MedicationItem>>({});
  const [isCompressing, setIsCompressing] = useState(false);

  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (deepLink && onConsumeDeepLink) {
        const record = records.find(r => r.id === deepLink.id);
        if (record) { handleView(record); onConsumeDeepLink(); }
    }
  }, [deepLink, records]);

  useEffect(() => {
    if (chatBottomRef.current) chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isAiTyping]);

  const displayedRecords = useMemo(() => {
      let filtered = records;
      if (selectedMemberId !== 'all') filtered = records.filter(r => r.memberId === selectedMemberId);
      return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, selectedMemberId]);

  const { upcoming, history } = useMemo(() => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const up: MedicalRecord[] = [];
      const hist: MedicalRecord[] = [];
      displayedRecords.forEach(r => {
          const rDate = new Date(r.date);
          const isRemindable = r.status === 'Scheduled' || r.status === 'Active' || r.status === 'Recovering' || r.status === 'Overdue';
          if (isRemindable && (r.status === 'Active' || r.status === 'Recovering' || r.status === 'Overdue' || rDate >= today)) up.push(r);
          else hist.push(r);
      });
      up.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return { upcoming: up, history: hist };
  }, [displayedRecords]);

  const selectedCaregiver = caregivers.find(c => c.id === selectedMemberId);

  const vaccinationStatus = useMemo(() => {
    if (!selectedCaregiver || selectedCaregiver.role !== 'Child') return null;
    const dob = selectedCaregiver.dateOfBirth ? new Date(selectedCaregiver.dateOfBirth) : null;
    if (!dob) return { missingDob: true };
    const now = new Date();
    const childAgeMonths = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const completedVaccines = records
        .filter(r => r.type === 'Vaccine' && r.status === 'Completed' && r.memberId === selectedCaregiver.id)
        .map(r => r.title.toLowerCase());
    const dueNow: { name: string; ageMonths: number }[] = [];
    let totalScheduled = 0, totalDone = 0;
    const schedule = VACCINATION_SCHEDULE.map(item => {
        const itemVaccines = item.vaccines.map(v => {
            totalScheduled++;
            const isDone = completedVaccines.some(cv => cv.includes(v.toLowerCase()));
            const isDue = item.ageMonths <= childAgeMonths;
            if (isDone) totalDone++;
            if (isDue && !isDone) dueNow.push({ name: v, ageMonths: item.ageMonths });
            return { name: v, done: isDone, due: isDue, info: VACCINE_INFO[v] };
        });
        return { ageMonths: item.ageMonths, vaccines: itemVaccines };
    });
    return { childAgeMonths, schedule, dueNow, progressPercent: Math.round((totalDone/totalScheduled)*100), totalDone, totalScheduled };
  }, [selectedCaregiver, records]);

  const healthEventsByDate = useMemo(() => {
      const map: Record<string, MedicalRecord[]> = {};
      displayedRecords.forEach(r => {
          if (!map[r.date]) map[r.date] = [];
          map[r.date].push(r);
      });
      return map;
  }, [displayedRecords]);

  const handleEdit = (record: MedicalRecord) => { 
      setEditingId(record.id); 
      setFormData({...record, medications: Array.isArray(record.medications) ? record.medications : []}); 
      setIsModalOpen(true); 
  }
  const handleView = (record: MedicalRecord) => { setViewingRecord(record); setIsViewModalOpen(true); }
  const handleDelete = async (id: string) => { 
      if(window.confirm(t('confirmDelete'))) { 
          setIsViewModalOpen(false);
          await deleteHealthRecord(id); 
          onRefresh(['health']); 
      } 
  }

  const handleSave = async () => {
      if (!formData.title || !formData.date) return;
      setIsModalOpen(false);
      setEditingId(null);
      await saveHealthRecord({
          id: editingId || Date.now().toString(),
          title: formData.title,
          type: formData.type as any || 'Visit',
          date: formData.date,
          endDate: formData.endDate,
          time: formData.time,
          status: formData.status as any,
          notes: formData.notes,
          doctorName: formData.doctorName,
          nextDueDate: formData.nextDueDate,
          memberId: formData.memberId || (selectedMemberId !== 'all' ? selectedMemberId : undefined),
          medications: Array.isArray(formData.medications) ? formData.medications : []
      });
      onRefresh(['health']);
      setTempMed({});
  };

  const handleMedicinePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { alert("File too large"); return; }
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
          const originalDataUrl = event.target?.result as string;
          const optimizedDataUrl = await compressImage(originalDataUrl);
          setTempMed(prev => ({ ...prev, photoUrl: optimizedDataUrl }));
          setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMedication = () => {
      if (!tempMed.name) return;
      const newMed: MedicationItem = {
          id: Date.now().toString(),
          name: tempMed.name,
          dosage: tempMed.dosage || '',
          frequency: tempMed.frequency || '',
          usage: tempMed.usage || '',
          photoUrl: tempMed.photoUrl || ''
      };
      setFormData(prev => ({ ...prev, medications: [...(prev.medications || []), newMed] }));
      setTempMed({});
  };

  const handleRemoveMedication = (id: string) => {
      setFormData(prev => ({ ...prev, medications: (prev.medications || []).filter(m => m.id !== id) }));
  };

  const handleMarkVaccineDone = async (vaccineName: string, milestoneAgeMonths: number) => {
      if (!selectedCaregiver || !selectedCaregiver.dateOfBirth) return;
      const completionDate = new Date().toISOString().split('T')[0];
      await saveHealthRecord({
          id: Date.now().toString(),
          title: vaccineName,
          type: 'Vaccine',
          date: completionDate,
          status: 'Completed',
          memberId: selectedCaregiver.id,
          medications: []
      });
      onRefresh(['health']);
  }

  const handleQuickStatusUpdate = async (e: React.MouseEvent, record: MedicalRecord, newStatus: MedicalRecord['status']) => {
      e.stopPropagation();
      if (window.confirm(newStatus === 'Recovered' ? t('markRecoveredConfirm') : t('save'))) {
          await saveHealthRecord({ ...record, status: newStatus, endDate: newStatus === 'Recovered' ? new Date().toISOString().split('T')[0] : record.endDate });
          onRefresh(['health']);
      }
  };

  const handleOpenAiChat = () => {
      if (aiMessages.length === 0) {
          setAiMessages([{ id: 'initial', role: 'model', text: t('howCanIHelpHealth'), timestamp: Date.now() }]);
      }
      setIsAiModalOpen(true);
  };

  const handleSendAiQuery = async (query: string) => {
      if (!query.trim()) return;
      setAiMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: query, timestamp: Date.now() }]);
      setAiInput('');
      setIsAiTyping(true);
      const context = `Family Health Context:
- Active Member: ${selectedCaregiver?.name || 'Whole Family'}
- Records Summary: ${records.slice(0, 15).map(r => `${r.date}: ${r.title} (${r.type})`).join('; ')}
- Vaccinations: ${vaccinationStatus ? vaccinationStatus.totalDone + '/' + vaccinationStatus.totalScheduled : 'N/A'}`;
      const response = await getAiAdvice(query, context, lang);
      setAiMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: response, timestamp: Date.now() }]);
      setIsAiTyping(false);
  };

  const getIcon = (type: MedicalRecord['type'], size = 18) => {
    switch (type) {
      case 'Vaccine': return <Syringe className="text-blue-500" size={size} />;
      case 'Visit': return <Calendar className="text-orange-500" size={size} />;
      case 'Allergy': return <AlertTriangle className="text-red-500" size={size} />;
      case 'Medication': return <Pill className="text-emerald-500" size={size} />;
      case 'Illness': return <Thermometer className="text-orange-500" size={size} />;
      case 'Grooming': return <Scissors className="text-pink-500" size={size} />;
      default: return <FileText className="text-slate-500" size={size} />;
    }
  };

  const renderCalendar = () => {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const days = [];
      for (let i = 0; i < firstDay; i++) days.push(null);
      for (let i = 1; i <= daysInMonth; i++) days.push(i);

      return (
          <div className="space-y-6">
              <Card>
                  <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                          <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ChevronRight size={24} className="rotate-180" /></button>
                          <h3 className="text-xl font-bold">{calendarDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h3>
                          <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ChevronRight size={24} /></button>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => {setCalendarDate(new Date()); setSelectedDay(new Date().toISOString().split('T')[0])}}>{t('today')}</Button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                      {['S','M','T','W','T','F','S'].map((d, i) => <span key={`${d}-${i}`} className="text-[10px] font-bold text-slate-400 uppercase">{d}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1 md:gap-3">
                      {days.map((day, i) => {
                          if (day === null) return <div key={`empty-${i}`} className="h-12 md:h-16"></div>;
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const hasEvents = healthEventsByDate[dateStr];
                          const isSelected = selectedDay === dateStr;
                          const isToday = new Date().toISOString().split('T')[0] === dateStr;
                          return (
                              <button key={dateStr} onClick={() => setSelectedDay(dateStr)} className={`relative h-12 md:h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${isSelected ? 'bg-primary text-white shadow-lg scale-105 z-10' : isToday ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                                  <span className="font-bold text-sm md:text-base">{day}</span>
                                  {hasEvents && <div className="flex gap-0.5 mt-1">{hasEvents.slice(0, 3).map((e, idx) => (<div key={`${e.id}-${idx}`} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}></div>))}</div>}
                              </button>
                          );
                      })}
                  </div>
              </Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                       <div className="bg-white dark:bg-dark-card rounded-3xl p-6 border border-slate-100 dark:border-slate-700 h-full">
                           <div className="flex items-center gap-4 mb-4">
                               <div className="w-14 h-14 bg-primary/10 rounded-2xl flex flex-col items-center justify-center text-primary">
                                   <span className="text-[10px] font-black uppercase leading-none">{new Date(selectedDay).toLocaleDateString(undefined, {month: 'short'})}</span>
                                   <span className="text-2xl font-black">{new Date(selectedDay).getDate()}</span>
                               </div>
                               <div>
                                   <h4 className="font-bold text-lg leading-tight">{new Date(selectedDay).toLocaleDateString(undefined, {weekday: 'long'})}</h4>
                                   <p className="text-slate-400 text-xs font-medium">{new Date(selectedDay).getFullYear()}</p>
                               </div>
                           </div>
                           {(() => {
                               const kd = getKhmerLunarDate(new Date(selectedDay));
                               return (
                                   <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                       <div className="flex items-center gap-2 mb-2">
                                           <Moon size={14} className="text-amber-500" />
                                           <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Khmer Date</span>
                                       </div>
                                       <p className="font-['Battambang'] text-sm text-slate-600 dark:text-amber-100 leading-snug">{kd.compactDate}</p>
                                   </div>
                               );
                           })()}
                       </div>
                  </div>
                  <div className="md:col-span-2 space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                      {healthEventsByDate[selectedDay] ? healthEventsByDate[selectedDay].map(r => (
                          <div key={r.id} className="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 group cursor-pointer hover:shadow-md transition-all" onClick={() => handleView(r)}>
                              <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl group-hover:scale-110 transition-transform">{getIcon(r.type, 24)}</div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                      <h5 className="font-bold text-slate-900 dark:text-white truncate">{r.title}</h5>
                                      <Badge color={r.status === 'Completed' ? 'green' : 'blue'}>{t(r.status.toLowerCase() as any)}</Badge>
                                  </div>
                                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock size={12} /> {r.time || 'All Day'} • {t(r.type.toLowerCase() as any)}</p>
                              </div>
                              <ChevronRight size={18} className="text-slate-300 group-hover:text-primary transition-colors" />
                          </div>
                      )) : (
                          <div className="bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                              <CalendarDays size={48} className="text-slate-300 mb-3" />
                              <p className="text-slate-500 font-bold">{t('noEvents')}</p>
                              <Button variant="ghost" className="mt-4" size="sm" icon={<Plus size={16}/>} onClick={() => { setFormData({ date: selectedDay }); setIsModalOpen(true); }}>{t('addRecord')}</Button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar items-center flex-1 w-full md:w-auto">
              <button onClick={() => setSelectedMemberId('all')} className={`h-14 px-6 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border-2 ${selectedMemberId === 'all' ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 border-transparent hover:bg-slate-50'}`}>{t('allFamily')}</button>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 shrink-0"></div>
              {caregivers.map(c => (
                   <button key={c.id} onClick={() => setSelectedMemberId(c.id)} className={`relative group h-14 pl-2 pr-6 rounded-2xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-3 border-2 ${selectedMemberId === c.id ? 'bg-white dark:bg-slate-800 text-primary border-primary shadow-lg scale-105 z-10' : 'bg-white dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-200'}`}>
                       <div className={`w-10 h-10 rounded-xl overflow-hidden ${selectedMemberId === c.id ? 'ring-2 ring-primary ring-offset-2' : 'opacity-80'}`}><img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover" /></div>
                       <div className="flex flex-col items-start"><span className="leading-tight">{c.name}</span><span className="text-[10px] uppercase font-black opacity-50 tracking-tighter">{t(c.role.toLowerCase() as any)}</span></div>
                       {selectedMemberId === c.id && <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1 shadow-sm"><Check size={10}/></div>}
                   </button>
              ))}
          </div>
          <div className="flex p-1 bg-slate-200/50 dark:bg-black/30 backdrop-blur-md rounded-2xl w-full md:w-auto">
              {[
                { id: 'records', label: t('records_nav'), icon: <LayoutGrid size={16}/> },
                { id: 'vaccination', label: t('vaccination_nav'), icon: <Syringe size={16}/>, hide: selectedCaregiver?.role !== 'Child' },
                { id: 'calendar', label: t('health_calendar_nav'), icon: <CalendarDays size={16}/> }
              ].map(tab => !tab.hide && (
                <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeSubTab === tab.id ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
          </div>
      </div>

      {activeSubTab === 'records' && (
        <div className="space-y-8">
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-400 opacity-20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30 transform transition-transform group-hover:scale-105 duration-500">
                            <Bot size={32} className="text-white animate-float" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-1">{t('healthAiAssistant')}</h2>
                            <p className="text-orange-50 font-medium max-w-sm opacity-90 leading-relaxed text-xs">Your personal health expert. Get advice on symptoms, vaccinations, and track medical history like a pro.</p>
                        </div>
                    </div>
                    <Button size="md" variant="glass" onClick={handleOpenAiChat} className="w-full md:w-auto px-6 shadow-xl font-bold bg-white text-primary border-none hover:bg-orange-50" icon={<MessageSquareText size={16} />}>
                        {t('askHealthAi')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                 <Card className="flex items-center gap-2 bg-white dark:bg-dark-card hover:border-primary/30 transition-colors p-2 rounded-lg">
                     <div className="p-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg shrink-0"><BellRing size={14}/></div>
                     <div><p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0">{t('upcoming')}</p><h4 className="text-md font-black">{upcoming.length}</h4></div>
                 </Card>
                 <Card className="flex items-center gap-2 bg-white dark:bg-dark-card hover:border-primary/30 transition-colors p-2 rounded-lg">
                     <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg shrink-0"><Syringe size={14}/></div>
                     <div><p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0">{t('vaccination_nav')}</p><h4 className="text-md font-black">{records.filter(r => r.type === 'Vaccine').length}</h4></div>
                 </Card>
                 <Card className="flex items-center gap-2 bg-white dark:bg-dark-card hover:border-primary/30 transition-colors p-2 rounded-lg">
                     <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0"><History size={14}/></div>
                     <div><p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0">{t('total')}</p><h4 className="text-md font-black">{displayedRecords.length}</h4></div>
                 </Card>
                 <button onClick={() => {setEditingId(null); setFormData({date: new Date().toISOString().split('T')[0], medications: []}); setIsModalOpen(true)}} className="bg-primary text-white rounded-lg p-2 shadow-lg shadow-primary/30 flex items-center justify-center gap-1 font-bold hover:bg-orange-600 active:scale-[0.98] transition-all text-xs">
                     <Plus size={14}/> {t('addRecord')}
                 </button>
            </div>

            {upcoming.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-slate-200"><Timer className="text-primary" size={24} /> {t('upcoming')}</h3>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {upcoming.map(record => (
                            <div key={record.id} className="bg-white dark:bg-dark-card rounded-xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 group cursor-pointer" onClick={() => handleView(record)}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-xl group-hover:scale-110 transition-transform">{getIcon(record.type, 18)}</div>
                                        <div>
                                            <Badge color={record.status === 'Overdue' ? 'red' : 'blue'} className="mb-0.5 text-[9px]">{t(record.status.toLowerCase() as any)}</Badge>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{record.title}</h4>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(record); }} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all"><Edit2 size={14}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg flex items-center gap-2"><Calendar size={12} className="text-slate-400" /><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{record.date}</span></div>
                                    <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg flex items-center gap-2"><Clock size={12} className="text-slate-400" /><span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{record.time || 'TBD'}</span></div>
                                </div>
                                <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800"><Button variant="outline" size="xs" rounded="rounded-lg" onClick={(e) => handleQuickStatusUpdate(e, record, 'Completed')}>{t('done')}</Button></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Card title={t('medicalHistory')} action={<div className="flex items-center gap-2"><Search size={18} className="text-slate-400"/><span className="text-xs text-slate-400 font-bold">{history.length} events</span></div>}>
                <div className="space-y-2 pt-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                    {history.map((record) => (
                        <div key={record.id} className="relative flex items-start gap-3 group" onClick={() => handleView(record)}>
                            <div className="text-center w-8 shrink-0 pt-0.5 flex flex-col items-center"><span className="text-base font-black text-slate-300 group-hover:text-primary transition-colors leading-none">{new Date(record.date).getDate()}</span><span className="text-[9px] uppercase font-bold text-slate-400">{new Date(record.date).toLocaleDateString(undefined, {month: 'short'})}</span></div>
                            <div className="flex-1 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer relative overflow-hidden group">
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg shrink-0 group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors shadow-sm">{getIcon(record.type, 14)}</div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate pr-2">{record.title}</h4>
                                            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">{t(record.type.toLowerCase() as any)} • {record.doctorName || 'General Provider'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-0.5 md:opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"><button onClick={(e) => { e.stopPropagation(); handleEdit(record); }} className="p-1.5 text-slate-400 hover:text-primary"><Edit2 size={12}/></button><button onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={12}/></button><ChevronRight size={14} className="text-slate-300 ml-1" /></div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {history.length === 0 && <div className="text-center py-10 text-slate-400"><div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3 opacity-50"><FileText size={32} /></div><p className="font-bold text-xs">{t('noData')}</p></div>}
                </div>
            </Card>
        </div>
      )}

      {activeSubTab === 'vaccination' && (
          <div className="space-y-8">
              {vaccinationStatus && (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-orange-600 to-amber-700 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2"><TrendingUp size={24} /> {t('vaccineProgress')}</h3>
                            <div className="flex items-end justify-between mb-3"><span className="text-6xl font-black">{vaccinationStatus.progressPercent}%</span><Badge color="green" className="text-white border-white/20 bg-white/20 mb-2">{t('protectionLevel')}</Badge></div>
                            <div className="h-4 w-full bg-black/20 rounded-full overflow-hidden mb-3"><div className="h-full bg-white rounded-full transition-all duration-1000 shadow-glow" style={{width: `${vaccinationStatus.progressPercent}%`}}></div></div>
                            <p className="text-sm font-bold opacity-80">{vaccinationStatus.totalDone} of {vaccinationStatus.totalScheduled} completed</p>
                        </div>
                        <Card className="lg:col-span-2 relative overflow-hidden border-rose-100 dark:border-rose-900/30">
                             <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none rotate-12"><Syringe size={120} className="text-rose-500" /></div>
                             <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-rose-600 dark:text-rose-400"><AlertTriangle size={24} className="animate-pulse" /> {t('vaccinesDueNow')}</h3>
                             <div className="flex flex-wrap gap-4 relative z-10">{vaccinationStatus.dueNow && vaccinationStatus.dueNow.length > 0 ? vaccinationStatus.dueNow.map((v, i) => (<div key={`${v.name}-${i}`} className="flex items-center gap-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-3xl hover:shadow-md transition-shadow group"><div className="p-3 bg-white dark:bg-rose-900 text-rose-600 rounded-2xl shadow-sm group-hover:scale-110 transition-transform"><Syringe size={22} /></div><div><p className="font-black text-slate-800 dark:text-rose-100">{t(v.name as any)}</p><button onClick={() => handleMarkVaccineDone(v.name, v.ageMonths)} className="text-[10px] font-black uppercase text-rose-600 hover:text-rose-700 bg-white dark:bg-rose-900/50 px-3 py-1 rounded-full mt-1.5 shadow-sm active:scale-95 transition-all">{t('markAsDone')}</button></div></div>)) : (<div className="flex flex-col items-center justify-center py-6 w-full text-slate-400"><CheckCircle2 size={48} className="text-emerald-500 mb-2 opacity-50" /><p className="font-bold">{t('childHealthy')}</p></div>)}</div>
                        </Card>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vaccinationStatus.schedule?.map((group, idx) => (
                            <div key={idx} className={`bg-white dark:bg-dark-card rounded-[2.5rem] border-2 transition-all overflow-hidden group hover:shadow-2xl ${group.ageMonths === vaccinationStatus.childAgeMonths ? 'border-primary shadow-xl ring-4 ring-primary/5' : 'border-slate-100 dark:border-slate-800'}`}>
                                <div className={`p-6 flex justify-between items-center ${group.ageMonths === vaccinationStatus.childAgeMonths ? 'bg-primary text-white' : 'bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-slate-800'}`}><div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${group.ageMonths === vaccinationStatus.childAgeMonths ? 'bg-white/20' : 'bg-white dark:bg-slate-800 text-primary shadow-sm'}`}>{group.ageMonths}m</div><span className="font-black uppercase text-xs tracking-widest">{group.ageMonths} {t('months')}</span></div><Badge color={group.ageMonths < vaccinationStatus.childAgeMonths ? 'green' : group.ageMonths === vaccinationStatus.childAgeMonths ? 'red' : 'gray'}>{group.ageMonths < vaccinationStatus.childAgeMonths ? t('done') : group.ageMonths === vaccinationStatus.childAgeMonths ? t('due') : t('notDue')}</Badge></div>
                                <div className="p-6 space-y-5">{group.vaccines.map((v, vIdx) => (<div key={`${v.name}-${vIdx}`} className="flex items-start gap-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-sm transition-transform group-hover:rotate-12 ${v.done ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>{v.done ? <CheckCircle size={20}/> : <Syringe size={20}/>}</div><div className="flex-1 min-w-0"><p className={`text-base font-bold ${v.done ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>{t(v.name as any)}</p>{v.info && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide mt-0.5">{t('protectsAgainst')}: {v.info.protectsAgainst}</p>}</div>{!v.done && group.ageMonths <= vaccinationStatus.childAgeMonths && (<button onClick={() => handleMarkVaccineDone(v.name, group.ageMonths)} className="shrink-0 p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all"><Plus size={18}/></button>)}</div>))}</div>
                            </div>
                        ))}
                    </div>
                  </>
              )}
          </div>
      )}

      {activeSubTab === 'calendar' && renderCalendar()}

      <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title={t('healthAiAssistant')}>
          <div className="flex flex-col h-[65vh]">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-3xl mb-6 border border-orange-100 dark:border-orange-800 shadow-sm">
                  <div className="flex items-center gap-2 mb-2"><ShieldCheck size={18} className="text-emerald-500" /><p className="text-xs text-orange-600 dark:text-orange-300 font-black uppercase tracking-widest">Medical Disclaimer</p></div>
                  <p className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400 italic leading-relaxed">{t('aiAdviceNote')}</p>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-4">
                  {aiMessages.map((msg, i) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                          <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}><div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-100'}`}>{msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}</div><div className={`p-5 rounded-3xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>{msg.text}</div></div>
                      </div>
                  ))}
                  {isAiTyping && (<div className="flex justify-start"><div className="flex gap-3 items-center"><div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900 text-orange-600 flex items-center justify-center shadow-md"><Bot size={18} /></div><div className="bg-white dark:bg-slate-800 p-4 rounded-3xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex gap-1.5 items-center"><div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce delay-150"></div></div></div></div>)}
                  <div ref={chatBottomRef} />
              </div>
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap gap-2 mb-4">{[t('summarizeHealth'), t('missingVaccines'), t('commonSymptoms'), t('illnessPatterns')].map((tag, i) => (<button key={`${tag}-${i}`} onClick={() => handleSendAiQuery(tag)} className="text-[10px] font-black px-4 py-2 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full transition-all border border-slate-200 dark:border-slate-700 active:scale-95 hover:border-primary/30">{tag}</button>))}</div>
                  <div className="relative"><input className="w-full pl-6 pr-14 py-4 bg-slate-100 dark:bg-slate-900 border-transparent rounded-[2rem] focus:bg-white dark:focus:bg-black/20 focus:outline-none focus:ring-2 focus:ring-primary text-sm shadow-inner transition-all" placeholder={t('askAboutHealth')} value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendAiQuery(aiInput)} /><button onClick={() => handleSendAiQuery(aiInput)} disabled={isAiTyping || !aiInput.trim()} className="absolute right-2 top-2 p-2 bg-primary text-white rounded-full shadow-lg hover:bg-orange-600 disabled:opacity-50 transition-all active:scale-90"><Send size={22} /></button></div>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? t('edit') : t('addRecord')}>
          <div className="space-y-6">
              <RadioGroup label={t('category')} options={[{value: 'Visit', label: t('visit'), icon: <Calendar size={16}/>},{value: 'Vaccine', label: t('vaccine'), icon: <Syringe size={16}/>},{value: 'Medication', label: t('medication'), icon: <Pill size={16}/>},{value: 'Illness', label: t('illness'), icon: <Thermometer size={16}/>},{value: 'Grooming', label: t('grooming'), icon: <Scissors size={16}/>}]} value={formData.type || 'Visit'} onChange={v => setFormData({...formData, type: v})} gridCols={3} />
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                  <div className="grid grid-cols-2 gap-6"><DatePicker label={t('date')} value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} /><Input label={t('time')} type="time" value={formData.time || ''} onChange={e => setFormData({...formData, time: e.target.value})} /></div>
              </div>
              <div className="space-y-5">
                  <Input label={t('title')} value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Annual Checkup" icon={<Activity size={18}/>} />
                  <Input label={t('provider')} value={formData.doctorName || ''} onChange={e => setFormData({...formData, doctorName: e.target.value})} placeholder="Doctor or Clinic Name" icon={<Stethoscope size={18}/>} />
                  <div className="grid grid-cols-2 gap-4"><Select label={t('status')} options={['Scheduled', 'Completed', 'Active', 'Overdue'].map(s => ({ value: s, label: t(s.toLowerCase() as any) }))} value={formData.status || 'Scheduled'} onChange={e => setFormData({...formData, status: e.target.value as any})} /><Select label={t('forWho')} options={[{value: 'all', label: t('allFamily')}, ...caregivers.map(c => ({ value: c.id, label: c.name }))]} value={formData.memberId || 'all'} onChange={e => setFormData({...formData, memberId: e.target.value})} /></div>
                  {(formData.type === 'Medication' || formData.type === 'Illness') && (
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800 space-y-4 animate-in slide-in-from-top-2">
                          <h4 className="font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2 text-sm uppercase tracking-wider"><Pill size={16}/> {t('medicationsList')}</h4>
                          <div className="space-y-2">
                              {formData.medications?.map(med => (
                                  <div key={med.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-orange-200 dark:border-orange-800 flex justify-between items-center shadow-sm">
                                      <div className="flex items-center gap-3">
                                          {med.photoUrl ? (<img src={med.photoUrl} alt="Med" className="w-10 h-10 object-cover rounded-lg bg-slate-100 cursor-pointer" onClick={() => setPreviewImage(med.photoUrl || null)} />) : (<div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-500"><Pill size={18}/></div>)}
                                          <div><p className="font-bold text-sm text-slate-800 dark:text-white">{med.name}</p><p className="text-xs text-slate-500">{med.dosage} • {med.frequency}</p></div>
                                      </div>
                                      <button onClick={() => handleRemoveMedication(med.id)} className="p-1.5 text-slate-400 hover:text-red-500"><X size={16}/></button>
                                  </div>
                              ))}
                              {(!formData.medications || formData.medications.length === 0) && (<p className="text-xs text-center text-slate-400 italic py-2">{t('noMedications')}</p>)}
                          </div>
                          <div className="pt-2 border-t border-orange-200 dark:border-orange-800/50">
                              <p className="text-xs font-bold text-orange-600 mb-2">{t('addMedication')}</p>
                              <Input value={tempMed.name || ''} onChange={e => setTempMed({...tempMed, name: e.target.value})} placeholder={t('medicineName')} className="mb-2" />
                              <div className="grid grid-cols-2 gap-2 mb-2"><Input value={tempMed.dosage || ''} onChange={e => setTempMed({...tempMed, dosage: e.target.value})} placeholder={t('dosage')} className="mb-0" /><Input value={tempMed.frequency || ''} onChange={e => setTempMed({...tempMed, frequency: e.target.value})} placeholder={t('frequency')} className="mb-0" /></div>
                              <Input value={tempMed.usage || ''} onChange={e => setTempMed({...tempMed, usage: e.target.value})} placeholder={t('usage')} className="mb-2" />
                              <div className="flex gap-2">
                                  <div className="relative flex-1">
                                      <div className={`flex items-center justify-center p-2 border border-dashed ${tempMed.photoUrl ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'border-orange-300 dark:border-orange-700 hover:bg-orange-100/50 text-orange-500'} rounded-xl cursor-pointer transition-colors text-xs font-bold gap-2`}>
                                          {isCompressing ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14}/>} {tempMed.photoUrl ? 'Photo Attached' : t('uploadPhoto')}
                                      </div>
                                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleMedicinePhotoUpload} accept="image/*" disabled={isCompressing} />
                                  </div>
                                  {tempMed.photoUrl && (<div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer" onClick={() => setPreviewImage(tempMed.photoUrl || null)}><img src={tempMed.photoUrl} alt="Preview" className="w-full h-full object-cover" /></div>)}
                                  <Button size="sm" onClick={handleAddMedication} disabled={!tempMed.name || isCompressing}>Add</Button>
                              </div>
                          </div>
                      </div>
                  )}
                  <div className="space-y-4 pt-2"><label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">{t('notes')}</label><textarea className="w-full p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-3xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm shadow-inner min-h-[100px]" placeholder="Any additional details..." value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea></div>
              </div>
              <div className="flex justify-end pt-4"><Button onClick={handleSave} disabled={isCompressing} className="w-full sm:w-auto px-16 py-4 rounded-[2rem] shadow-xl shadow-primary/30 font-black text-lg">{editingId ? t('update') : t('save')}</Button></div>
          </div>
      </Modal>

      {viewingRecord && (
          <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={t('recordDetails')}>
              <div className="space-y-6">
                  <div className="bg-gradient-to-br from-primary via-orange-600 to-orange-800 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                      <div className="flex items-center gap-3 mb-4"><Badge color="blue" className="bg-white/20 text-white border-white/20 backdrop-blur-md px-4 py-1.5 rounded-full">{t(viewingRecord.status.toLowerCase() as any)}</Badge><Badge color="gray" className="bg-black/20 text-white border-white/10 backdrop-blur-md px-4 py-1.5 rounded-full">{t(viewingRecord.type.toLowerCase() as any)}</Badge></div>
                      <h2 className="text-4xl font-black mb-2 leading-tight tracking-tight">{viewingRecord.title}</h2>
                      <p className="opacity-90 font-bold flex items-center gap-2 text-lg"><Calendar size={20} className="opacity-80"/> {viewingRecord.date}{viewingRecord.time && <><span className="opacity-40">•</span> <Clock size={20} className="opacity-80"/> {viewingRecord.time}</>}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"><p className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest flex items-center gap-2"><Stethoscope size={14} className="text-primary"/> {t('provider')}</p><p className="font-black text-xl text-slate-800 dark:text-white truncate">{viewingRecord.doctorName || 'N/A'}</p></div>
                      <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"><p className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest flex items-center gap-2"><User size={14} className="text-primary"/> {t('patient')}</p><p className="font-black text-xl text-slate-800 dark:text-white truncate">{caregivers.find(c => c.id === viewingRecord.memberId)?.name || t('allFamily')}</p></div>
                  </div>
                  <div className="p-8 bg-white dark:bg-dark-card rounded-[2.25rem] border border-slate-100 dark:border-slate-700 shadow-sm"><p className="text-[10px] text-slate-400 font-black uppercase mb-3 tracking-widest flex items-center gap-2"><Info size={14} className="text-primary"/> {t('notes')}</p><p className="text-lg italic text-slate-700 dark:text-slate-300 leading-relaxed font-medium">"{viewingRecord.notes || 'No specific notes recorded for this health event.'}"</p></div>

                  {/* Enhanced Medications Rendering (Merged legacy and list) */}
                  {(viewingRecord.medications && viewingRecord.medications.length > 0) || viewingRecord.medicineName || viewingRecord.medicinePhotoUrl ? (
                      <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-[2.25rem] border border-orange-100 dark:border-orange-800 shadow-sm">
                          <div className="flex items-center gap-2 mb-4 text-orange-700 dark:text-orange-300 font-bold"><Pill size={20} /> {t('medicationsList')}</div>
                          <div className="space-y-4">
                              {/* New Format List */}
                              {viewingRecord.medications?.map(med => (
                                  <div key={med.id} className="bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-orange-200/50 dark:border-orange-800/50">
                                      <div className="flex justify-between items-start mb-2"><h5 className="font-bold text-lg text-slate-800 dark:text-white">{med.name}</h5>{med.dosage && <Badge color="orange">{med.dosage}</Badge>}</div>
                                      {med.frequency && <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1"><Clock size={12}/> {med.frequency}</p>}
                                      {med.usage && <p className="text-sm text-slate-500 italic">"{med.usage}"</p>}
                                      {med.photoUrl && (<div className="mt-3 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 cursor-zoom-in bg-white dark:bg-black/20 relative group" onClick={() => setPreviewImage(med.photoUrl || null)}><img src={med.photoUrl} alt={med.name} className="w-full h-auto max-h-[400px] object-contain" /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none"><Maximize2 size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" /></div></div>)}
                                  </div>
                              ))}
                              {/* Legacy Format Fallback */}
                              {(!viewingRecord.medications || viewingRecord.medications.length === 0) && (viewingRecord.medicineName || viewingRecord.medicinePhotoUrl) && (
                                   <div className="bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-orange-200/50 dark:border-orange-800/50">
                                       <div className="flex justify-between items-start mb-2"><h5 className="font-bold text-lg text-slate-800 dark:text-white">{viewingRecord.medicineName || 'Unnamed Medicine'}</h5>{viewingRecord.dosage && <Badge color="orange">{viewingRecord.dosage}</Badge>}</div>
                                       {viewingRecord.frequency && <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1"><Clock size={12}/> {viewingRecord.frequency}</p>}
                                       {viewingRecord.medicineUsage && <p className="text-sm text-slate-500 italic">"{viewingRecord.medicineUsage}"</p>}
                                       {viewingRecord.medicinePhotoUrl && (<div className="mt-3 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 cursor-zoom-in bg-white dark:bg-black/20 relative group" onClick={() => setPreviewImage(viewingRecord.medicinePhotoUrl || null)}><img src={viewingRecord.medicinePhotoUrl} alt="Medicine" className="w-full h-auto max-h-[400px] object-contain" /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none"><Maximize2 size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" /></div></div>)}
                                   </div>
                              )}
                          </div>
                      </div>
                  ) : null}
                  
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                       <Button variant="ghost" className="rounded-2xl" onClick={() => setIsViewModalOpen(false)}>{t('cancel')}</Button>
                       <div className="flex gap-2 w-full sm:w-auto">
                            <Button className="flex-1 sm:flex-none rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white border-none hover:bg-slate-200" onClick={() => { setIsViewModalOpen(false); handleEdit(viewingRecord); }} icon={<Edit2 size={18}/>}>{t('edit')}</Button>
                            <Button className="flex-1 sm:flex-none rounded-2xl bg-rose-50 text-rose-600 border-none hover:bg-rose-100" onClick={() => { setIsViewModalOpen(false); handleDelete(viewingRecord.id); }} icon={<Trash2 size={18}/>}>{t('delete')}</Button>
                       </div>
                  </div>
              </div>
          </Modal>
      )}

      {previewImage && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setPreviewImage(null)}>
              <button className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors" onClick={() => setPreviewImage(null)}><X size={24} /></button>
              <img src={previewImage} alt="Full View" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </div>
      )}
    </div>
  );
};
