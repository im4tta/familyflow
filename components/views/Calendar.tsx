



import React, { useState, useMemo } from 'react';
import { Trip, MedicalRecord, KhmerDate } from '../../types';
import { Card, Button, Badge } from '../UI';
import { ChevronLeft, ChevronRight, Map, Heart, Clock, Calendar as CalendarIcon, MapPin, Download, Moon, Thermometer, Pill, Plus, Plane } from 'lucide-react';
import { generateCalendarICS } from '../../services/exportService';
import { getKhmerLunarDate } from '../../services/khmerCalendar';

interface Props {
  trips: Trip[];
  healthRecords: MedicalRecord[];
  isDark: boolean;
  t: (key: any) => string;
  onQuickAdd: (type: 'Trip' | 'Health', data?: any) => void;
}

interface CalendarEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    type: 'Trip' | 'Health' | 'Illness';
    color: string;
    data: Trip | MedicalRecord;
}

export const CalendarView: React.FC<Props> = ({ trips, healthRecords, isDark, t, onQuickAdd }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToToday = () => {
      const now = new Date();
      setCurrentDate(now);
      setSelectedDate(now.toISOString().split('T')[0]);
  }

  // Calendar Logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  // Process Events
  const eventsMap = useMemo(() => {
      const map: Record<string, CalendarEvent[]> = {};

      // Add Health Records
      healthRecords.forEach(r => {
          if (r.type === 'Illness') {
              // Handle Illness Spanning
              const start = new Date(r.date);
              // If active (no endDate), show for today/ongoing, otherwise use endDate
              const end = r.endDate ? new Date(r.endDate) : new Date(r.date); 
              
              let current = new Date(start);
              
              // Safety break for loop
              const maxDays = 30; 
              let daysCount = 0;

              while (current <= end && daysCount < maxDays) {
                  const dateStr = current.toISOString().split('T')[0];
                  if (!map[dateStr]) map[dateStr] = [];
                  
                   // Unique ID for daily instances
                  const instanceId = `ill-${r.id}-${dateStr}`;

                  if (!map[dateStr].find(e => e.id === instanceId)) {
                      map[dateStr].push({
                          id: instanceId,
                          title: r.title,
                          date: dateStr,
                          type: 'Illness',
                          color: 'bg-orange-500',
                          data: r
                      });
                  }
                  current.setDate(current.getDate() + 1);
                  daysCount++;
              }
          } else {
              // Standard Appointment (Single Day)
              if (!map[r.date]) map[r.date] = [];
              map[r.date].push({
                  id: `h-${r.id}`,
                  title: r.title,
                  date: r.date,
                  type: 'Health',
                  color: 'bg-rose-500',
                  data: r
              });
          }
      });

      // Add Trips (handle multi-day)
      trips.forEach(trip => {
          if (trip.status === 'Idea') return; // Skip ideas
          
          let current = new Date(trip.startDate);
          const end = new Date(trip.endDate);
          
          // Loop through each day of the trip
          while (current <= end) {
              const dateStr = current.toISOString().split('T')[0];
              if (!map[dateStr]) map[dateStr] = [];
              
              const instanceId = `t-${trip.id}-${dateStr}`; // Unique ID

              // Avoid duplicates
              if (!map[dateStr].find(e => e.id.startsWith(`t-${trip.id}`))) {
                  map[dateStr].push({
                      id: instanceId,
                      title: trip.title,
                      date: dateStr,
                      type: 'Trip',
                      color: 'bg-indigo-500',
                      data: trip
                  });
              }
              
              current.setDate(current.getDate() + 1);
          }
      });

      return map;
  }, [trips, healthRecords]);

  const handleExportCalendar = () => {
      const allEvents: {id: string, title: string, date: string, description?: string}[] = [];
      
      healthRecords.forEach(h => {
          allEvents.push({
              id: `health_${h.id}`, // Stable ID
              title: `[${h.type}] ${h.title}`,
              date: h.date,
              description: h.notes || h.doctorName
          });
      });

      trips.forEach(t => {
          if(t.status === 'Idea') return;
          allEvents.push({
              id: `trip_${t.id}`, // Stable ID
              title: `[Trip] ${t.title}`,
              date: t.startDate,
              description: t.location
          });
      });

      generateCalendarICS(allEvents);
  };

  // Generate Calendar Grid
  const calendarDays = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null);
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push(i);
  }

  const selectedDateEvents = eventsMap[selectedDate] || [];
  
  // Calculate Khmer Date
  const khmerDate: KhmerDate | null = useMemo(() => {
      if (!selectedDate) return null;
      return getKhmerLunarDate(new Date(selectedDate));
  }, [selectedDate]);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div className="flex items-center gap-4">
                 <button onClick={prevMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                     <ChevronLeft size={24} />
                 </button>
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
                     {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                 </h2>
                 <button onClick={nextMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                     <ChevronRight size={24} />
                 </button>
             </div>
             <div className="flex gap-2 relative">
                 <Button variant="outline" size="sm" onClick={jumpToToday}>{t('today')}</Button>
                 <Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={handleExportCalendar}>Sync</Button>
                 
                 <div className="relative">
                     <Button size="sm" icon={<Plus size={16}/>} onClick={() => setShowAddMenu(!showAddMenu)}>{t('create')}</Button>
                     {showAddMenu && (
                         <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                             <button 
                                onClick={() => { onQuickAdd('Trip', { startDate: selectedDate, endDate: selectedDate }); setShowAddMenu(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200"
                             >
                                 <Plane size={16} className="text-blue-500"/> {t('newTrip')}
                             </button>
                             <button 
                                onClick={() => { onQuickAdd('Health', { date: selectedDate }); setShowAddMenu(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-200"
                             >
                                 <Heart size={16} className="text-rose-500"/> {t('addRecord')}
                             </button>
                         </div>
                     )}
                 </div>
                 {showAddMenu && <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)}></div>}
             </div>
        </div>

        <Card className="p-4 md:p-6 !pb-8" noPadding>
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={`${d}-${i}`} className="text-center text-xs font-bold text-slate-400 py-2">{d}</div>
                ))}
            </div>
            
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {calendarDays.map((day, index) => {
                    if (day === null) return <div key={`empty-${index}`} className="h-16 md:h-24"></div>;
                    
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;
                    const isSelected = selectedDate === dateStr;
                    const dayEvents = eventsMap[dateStr] || [];
                    const hasTrip = dayEvents.some(e => e.type === 'Trip');
                    const hasHealth = dayEvents.some(e => e.type === 'Health');
                    const hasIllness = dayEvents.some(e => e.type === 'Illness');

                    return (
                        <button 
                            key={dateStr}
                            onClick={() => setSelectedDate(dateStr)}
                            className={`
                                relative h-16 md:h-24 rounded-2xl flex flex-col items-center justify-start pt-2 transition-all duration-200 border
                                ${isSelected 
                                    ? 'bg-primary/10 border-primary shadow-inner' 
                                    : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                                }
                            `}
                        >
                            <span className={`
                                w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1
                                ${isToday ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-700 dark:text-slate-300'}
                            `}>
                                {day}
                            </span>
                            
                            {/* Indicators */}
                            <div className="flex gap-1 mt-1">
                                {hasTrip && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
                                {hasHealth && <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>}
                                {hasIllness && <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
                            </div>
                            
                            {/* Desktop Bar View (if enough space) */}
                            <div className="hidden md:flex flex-col gap-1 w-full px-1 mt-1">
                                {dayEvents.slice(0, 2).map((evt, i) => (
                                    <div key={`${evt.id}-${i}`} className={`h-1.5 w-full rounded-full opacity-60 ${evt.color}`}></div>
                                ))}
                                {dayEvents.length > 2 && (
                                    <div className="h-1 w-full flex justify-center gap-0.5">
                                        <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                                        <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </Card>

        {/* Selected Date Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
             
             {/* Left Column: Integrated Date Card */}
             <div className="lg:col-span-1">
                 <div className="bg-white dark:bg-dark-card rounded-3xl p-6 border border-slate-100 dark:border-slate-700 h-full flex flex-col justify-between">
                     <div>
                         <div className="flex items-center gap-4 mb-6">
                            {/* Date Badge */}
                             <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex flex-col items-center justify-center text-primary">
                                 <span className="text-[10px] uppercase font-bold">{new Date(selectedDate).toLocaleString('default', {month: 'short'})}</span>
                                 <span className="text-3xl font-extrabold leading-none">{new Date(selectedDate).getDate()}</span>
                             </div>
                             <div>
                                 <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                                     {new Date(selectedDate).toLocaleString('default', { weekday: 'long' })}
                                 </h3>
                                 <p className="text-slate-500 dark:text-slate-400 font-medium">
                                     {new Date(selectedDate).getFullYear()}
                                 </p>
                             </div>
                         </div>
                     </div>

                     {/* Integrated Khmer Lunar Date */}
                     {khmerDate && (
                         <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700">
                             <div className="flex items-center gap-2 mb-3">
                                 <Moon size={16} className="text-amber-500" />
                                 <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Khmer Lunar Date</span>
                             </div>
                             <div className="font-['Battambang'] bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                 <h2 className="text-lg font-bold text-slate-800 dark:text-amber-100 leading-snug mb-1">
                                     {khmerDate.compactDate}
                                 </h2>
                                  <p className="text-xs text-slate-500 dark:text-amber-400/80 mt-1 font-medium">
                                     {khmerDate.gregorianDateKh}
                                 </p>
                             </div>
                         </div>
                     )}
                 </div>
             </div>

             {/* Right Column: Events List */}
             <div className="lg:col-span-2 space-y-4">
                 {selectedDateEvents.length > 0 ? selectedDateEvents.map(evt => (
                     <div key={evt.id} className="bg-white dark:bg-dark-card p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                         <div className={`p-3 rounded-xl shrink-0 ${evt.type === 'Trip' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300' : evt.type === 'Illness' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300'}`}>
                             {evt.type === 'Trip' ? <Map size={24} /> : evt.type === 'Illness' ? <Thermometer size={24}/> : <Heart size={24} />}
                         </div>
                         <div className="flex-1">
                             <div className="flex justify-between items-start">
                                 <h4 className="font-bold text-lg text-slate-900 dark:text-white">{evt.title}</h4>
                                 <Badge color={evt.type === 'Trip' ? 'blue' : evt.type === 'Illness' ? 'yellow' : 'red'}>{evt.type}</Badge>
                             </div>
                             <div className="flex gap-4 mt-1">
                                 {evt.type === 'Trip' ? (
                                     <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14}/> {(evt.data as Trip).location}</p>
                                 ) : (
                                     <p className="text-sm text-slate-500 flex items-center gap-1"><Clock size={14}/> {(evt.data as MedicalRecord).date}</p>
                                 )}
                             </div>
                             {evt.type === 'Illness' && (evt.data as MedicalRecord).medicineName && (
                                 <p className="text-xs text-orange-500 mt-2 flex items-center gap-1 font-semibold">
                                     <Pill size={12}/> Using: {(evt.data as MedicalRecord).medicineName}
                                 </p>
                             )}
                         </div>
                     </div>
                 )) : (
                     <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 h-full flex flex-col justify-center">
                         <CalendarIcon size={32} className="mx-auto text-slate-300 mb-2"/>
                         <p className="text-slate-500 font-medium">{t('noEvents')}</p>
                         <Button variant="ghost" className="mt-4" size="sm" onClick={() => setShowAddMenu(!showAddMenu)} icon={<Plus size={16}/>}>{t('create')}</Button>
                     </div>
                 )}
             </div>
        </div>
    </div>
  );
};
