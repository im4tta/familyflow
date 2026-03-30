
import React, { useState } from 'react';
import { Trip } from '../../types';
import { Card, Button, Badge, Modal, Input, Select, DatePicker, RadioGroup } from '../UI';
import { MapPin, Calendar, CheckSquare, Plus, MoreHorizontal, Edit2, Trash2, Clock, Lightbulb, ArrowRight, Sparkles, Check, Briefcase, Smile, X, Eye, Navigation, Copy } from 'lucide-react';
import { saveTrip, deleteTrip } from '../../services/neon';

interface Props {
  trips: Trip[];
  onAddTrip?: (trip: Trip) => void;
  onRefresh: () => void;
  isDark: boolean;
  t: (key: any) => string;
}

export const PlanningView: React.FC<Props> = ({ trips, onRefresh, isDark, t }) => {
  const [activeTab, setActiveTab] = useState<'trips' | 'ideas'>('trips');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);
  const [formData, setFormData] = useState<Partial<Trip>>({
      status: 'Planning',
      todos: [],
      startDate: '',
      endDate: ''
  });
  
  // Local state for adding todos in modal
  const [newTodo, setNewTodo] = useState('');

  const upcomingTrips = trips.filter(t => t.status !== 'Idea');
  const ideas = trips.filter(t => t.status === 'Idea');

  const handleEdit = (t: Trip) => {
      setEditingId(t.id);
      setFormData(t);
      setIsModalOpen(true);
  }
  
  const handleView = (t: Trip) => {
      setViewingTrip(t);
      setIsViewModalOpen(true);
  }

  const handleDuplicate = (t: Trip) => {
      setFormData({
          ...t,
          title: `${t.title} (Copy)`,
          status: 'Planning',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          todos: t.todos.map(todo => ({...todo, done: false})) 
      });
      setEditingId(null); 
      setIsModalOpen(true);
  }

  const handleToggleTodo = async (trip: Trip, todoId: string) => {
      const updatedTodos = trip.todos.map(todo => 
          todo.id === todoId ? { ...todo, done: !todo.done } : todo
      );
      const updatedTrip = { ...trip, todos: updatedTodos };
      
      // Update viewing state for immediate UI response
      if (viewingTrip?.id === trip.id) {
          setViewingTrip(updatedTrip);
      }
      
      await saveTrip(updatedTrip);
      onRefresh();
  };

  const handleSave = async () => {
      if(!formData.title) return;
      const trip: Trip = {
          id: editingId || Date.now().toString(),
          title: formData.title,
          location: formData.location || '',
          startDate: formData.startDate || new Date().toISOString().split('T')[0],
          startTime: formData.startTime || '',
          endDate: formData.endDate || new Date().toISOString().split('T')[0],
          endTime: formData.endTime || '',
          status: formData.status as any || 'Planning',
          todos: formData.todos || []
      };
      await saveTrip(trip);
      onRefresh();
      setIsModalOpen(false);
      setFormData({ status: 'Planning', todos: [], startDate: '', endDate: '' });
      setEditingId(null);
  }

  const handleDelete = async (id: string) => {
      if(confirm(t('confirmDelete'))) {
          await deleteTrip(id);
          onRefresh();
      }
  }

  const handlePromoteIdea = async (trip: Trip) => {
    await saveTrip({ ...trip, status: 'Planning', startDate: new Date().toISOString().split('T')[0] });
    onRefresh();
    setActiveTab('trips');
  }
  
  const handleAddTodo = () => {
      if(!newTodo.trim()) return;
      const todo = {
          id: Date.now().toString(),
          task: newTodo,
          done: false
      };
      setFormData({
          ...formData,
          todos: [...(formData.todos || []), todo]
      });
      setNewTodo('');
  };

  const handleRemoveTodo = (todoId: string) => {
      setFormData({
          ...formData,
          todos: (formData.todos || []).filter(t => t.id !== todoId)
      });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-center">
         <div className="flex p-1.5 bg-slate-200/50 dark:bg-black/20 backdrop-blur-sm rounded-full w-fit">
          {['trips', 'ideas'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2 rounded-full text-sm font-bold capitalize transition-all duration-300 ${
                activeTab === tab 
                ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' 
                : 'text-slate-500'
              }`}
            >
              {t(tab)}
            </button>
          ))}
        </div>
        <Button 
          icon={activeTab === 'trips' ? <Plus size={18} /> : <Lightbulb size={18} />} 
          onClick={() => { 
            setEditingId(null); 
            setFormData({todos: [], status: activeTab === 'trips' ? 'Planning' : 'Idea', startDate: new Date().toISOString().split('T')[0]}); 
            setIsModalOpen(true); 
          }}
        >
          {activeTab === 'trips' ? t('newTrip') : t('newIdea')}
        </Button>
       </div>

      {activeTab === 'trips' && (
        <div className="space-y-6">
            {upcomingTrips.map(trip => (
              <Card key={trip.id} className="overflow-hidden !p-0 border-0 group cursor-pointer shadow-2xl dark:shadow-none bg-white dark:bg-slate-900" noPadding onClick={() => handleView(trip)}>
                <div className="h-56 relative overflow-hidden">
                    <div className="absolute inset-0 z-0 bg-slate-200 dark:bg-slate-800">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            frameBorder="0" 
                            style={{border:0, filter: isDark ? 'invert(90%) hue-rotate(180deg) brightness(0.8)' : 'none', opacity: trip.status === 'Completed' ? 0.7 : 1}} 
                            src={`https://www.google.com/maps?q=${encodeURIComponent(trip.location)}&output=embed`}
                            allowFullScreen
                            loading="lazy"
                        ></iframe>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent pointer-events-none"></div>
                    </div>

                   <div className="absolute top-4 right-4 z-20 flex gap-2">
                      <Badge color={trip.status === 'Planning' ? 'yellow' : trip.status === 'Upcoming' ? 'blue' : 'green'} className="shadow-lg backdrop-blur-md bg-white/90 dark:bg-slate-900/90">{t(trip.status.toLowerCase())}</Badge>
                   </div>
                   
                   <div className="absolute bottom-0 left-0 right-0 p-5 z-20 text-white w-full">
                        <h3 className="text-3xl font-extrabold drop-shadow-lg tracking-tight mb-1 text-white">{trip.title}</h3>
                        <p className="text-white/90 text-sm flex items-center gap-1 drop-shadow-sm font-bold"><MapPin size={16} className="text-cyan-300"/> {trip.location}</p>
                   </div>
                </div>
                
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                             <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-primary"><Calendar size={18} /></div>
                             <div className="flex flex-col">
                               <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{t('start')}</span>
                               <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                   {new Date(trip.startDate).toLocaleDateString(undefined, {weekday: 'short', month:'short', day:'numeric'})}
                               </span>
                               {trip.startTime && <span className="text-primary font-bold text-xs">{trip.startTime}</span>}
                             </div>
                        </div>
                        
                        <div className="hidden md:flex items-center justify-center text-slate-300">
                            <ArrowRight size={20} />
                        </div>
                        
                        <div className="flex-1 p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                             <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400"><Navigation size={18} /></div>
                             <div className="flex flex-col">
                               <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">{t('end')}</span>
                               <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                   {new Date(trip.endDate).toLocaleDateString(undefined, {weekday: 'short', month:'short', day:'numeric'})}
                               </span>
                               {trip.endTime && <span className="text-primary font-bold text-xs">{trip.endTime}</span>}
                             </div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-50/50 dark:bg-white/[0.02] rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2"><CheckSquare size={14}/> {t('itinerary')}</p>
                            <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md text-slate-500 dark:text-slate-300">
                                {trip.todos.filter(t => t.done).length}/{trip.todos.length}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {trip.todos.slice(0, 3).map(todo => (
                                <div key={todo.id} className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${todo.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {todo.done && <Check size={10} className="text-white animate-check-flourish" />}
                                    </div>
                                    <span className={`text-sm font-medium transition-all ${todo.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{todo.task}</span>
                                </div>
                            ))}
                            {trip.todos.length > 3 && <p className="text-xs text-center text-primary font-bold pt-1 opacity-80">+ {trip.todos.length - 3} more</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                         <Button variant="ghost" size="sm" icon={<Copy size={14}/>} onClick={(e) => {e.stopPropagation(); handleDuplicate(trip);}}>{t('duplicate')}</Button>
                         <Button variant="ghost" size="sm" icon={<Edit2 size={14}/>} onClick={(e) => {e.stopPropagation(); handleEdit(trip);}}>{t('edit')}</Button>
                         <Button variant="danger" size="sm" className="bg-red-50 text-red-600 dark:bg-red-900/10 hover:bg-red-100 border-0" icon={<Trash2 size={14}/>} onClick={(e) => {e.stopPropagation(); handleDelete(trip.id);}}>{t('delete')}</Button>
                    </div>
                </div>
              </Card>
            ))}
             {upcomingTrips.length === 0 && (
                 <div className="text-center py-16 text-slate-400 bg-white dark:bg-white/5 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center">
                     <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <MapPin size={40} className="text-slate-300" />
                     </div>
                     <p className="font-bold text-xl text-slate-600 dark:text-slate-300">{t('noTrips')}</p>
                     <p className="text-sm mb-6 mt-1">Time to explore somewhere new!</p>
                     <Button onClick={() => { setEditingId(null); setFormData({todos: [], status: 'Planning', startDate: new Date().toISOString().split('T')[0]}); setIsModalOpen(true); }} size="lg" className="shadow-lg shadow-primary/20">{t('planTrip')}</Button>
                 </div>
            )}
        </div>
      )}

      {activeTab === 'ideas' && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {ideas.map(idea => (
                 <div key={idea.id} className="bg-white dark:bg-dark-card border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 hover:border-primary/50 transition-all hover:shadow-lg group relative">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(idea)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-primary transition-colors"><Edit2 size={16}/></button>
                          <button onClick={() => handleDelete(idea.id)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                      <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                          <Lightbulb size={28} />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{idea.title}</h3>
                      {idea.location && <p className="text-slate-500 flex items-center gap-1 mb-6 font-medium"><MapPin size={16}/> {idea.location}</p>}
                      
                      <Button className="w-full shadow-lg shadow-yellow-500/20" variant="secondary" onClick={() => handlePromoteIdea(idea)} icon={<Sparkles size={16}/>}>
                          {t('makeItHappen')}
                      </Button>
                 </div>
             ))}
             <button 
                onClick={() => { setEditingId(null); setFormData({todos: [], status: 'Idea'}); setIsModalOpen(true); }}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] text-slate-400 hover:text-primary hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-all h-full min-h-[240px] group"
             >
                 <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Plus size={32} />
                 </div>
                 <span className="font-bold text-lg">{t('newIdea')}</span>
             </button>
         </div>
      )}

      {/* View Trip Modal */}
      {viewingTrip && (
          <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={t('recordDetails')}>
             <div className="space-y-6">
                  <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-8 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                      <Badge color={viewingTrip.status === 'Planning' ? 'yellow' : viewingTrip.status === 'Upcoming' ? 'blue' : 'green'} className="mb-3 shadow-sm">{t(viewingTrip.status.toLowerCase())}</Badge>
                      <h2 className="text-3xl font-extrabold mb-2 leading-tight">{viewingTrip.title}</h2>
                      <p className="flex items-center opacity-90 font-bold"><MapPin size={18} className="mr-2"/> {viewingTrip.location}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <p className="text-xs text-slate-400 font-extrabold uppercase mb-1 tracking-wider">{t('start')}</p>
                          <p className="font-bold text-slate-800 dark:text-white text-lg">{viewingTrip.startDate}</p>
                          {viewingTrip.startTime && <p className="text-sm text-primary font-bold">{viewingTrip.startTime}</p>}
                      </div>
                      <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-700">
                          <p className="text-xs text-slate-400 font-extrabold uppercase mb-1 tracking-wider">{t('end')}</p>
                          <p className="font-bold text-slate-800 dark:text-white text-lg">{viewingTrip.endDate}</p>
                           {viewingTrip.endTime && <p className="text-sm text-primary font-bold">{viewingTrip.endTime}</p>}
                      </div>
                  </div>
                  
                  <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm relative h-56">
                      <iframe 
                          width="100%" 
                          height="100%" 
                          style={{border:0}} 
                          loading="lazy" 
                          allowFullScreen 
                          src={`https://www.google.com/maps?q=${encodeURIComponent(viewingTrip.location)}&output=embed`}
                      ></iframe>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-700 dark:text-white"><CheckSquare size={18}/> {t('tasks')}</h4>
                      <div className="space-y-3">
                           {viewingTrip.todos.map(task => (
                               <div 
                                    key={task.id} 
                                    onClick={() => handleToggleTodo(viewingTrip, task.id)}
                                    className="flex items-center gap-3 p-3 hover:bg-white dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer group active:scale-[0.98]"
                                >
                                   <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.done ? 'bg-green-500 border-green-500 shadow-sm shadow-green-500/20' : 'border-slate-300 dark:border-slate-600 group-hover:border-primary/50'}`}>
                                       {task.done && <Check size={14} className="text-white animate-check-flourish"/>}
                                   </div>
                                   <span className={`font-bold transition-all ${task.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{task.task}</span>
                               </div>
                           ))}
                           {viewingTrip.todos.length === 0 && <p className="text-slate-400 text-sm italic text-center">No tasks listed.</p>}
                      </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                       <Button variant="ghost" onClick={() => setIsViewModalOpen(false)}>{t('cancel')}</Button>
                       <Button onClick={() => { setIsViewModalOpen(false); handleDuplicate(viewingTrip); }} icon={<Copy size={16}/>}>{t('duplicate')}</Button>
                       <Button onClick={() => { setIsViewModalOpen(false); handleEdit(viewingTrip); }} icon={<Edit2 size={16}/>}>{t('edit')}</Button>
                  </div>
             </div>
          </Modal>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? t('editPlan') : activeTab === 'trips' ? t('planTrip') : t('newIdea')}>
          <div className="space-y-6">
              <Input label={t('title')} icon={<Lightbulb size={18}/>} value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Summer Vacation" autoFocus />
              <Input label={t('location')} icon={<MapPin size={18}/>} value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. Paris, France" />
              
              {activeTab === 'trips' && (
                <div className="space-y-6">
                    <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <DatePicker label={t('start')} icon={<Calendar size={18}/>} value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                                <Input label={t('time')} type="time" icon={<Clock size={18}/>} value={formData.startTime || ''} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                            </div>
                            <div>
                                <DatePicker label={t('end')} icon={<Calendar size={18}/>} value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                                <Input label={t('time')} type="time" icon={<Clock size={18}/>} value={formData.endTime || ''} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('tasks')}</label>
                        <div className="flex gap-2">
                             <input 
                                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-primary transition-all"
                                placeholder={t('addTask')}
                                value={newTodo}
                                onChange={(e) => setNewTodo(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                             />
                             <Button onClick={handleAddTodo} variant="secondary" icon={<Plus size={20}/>} />
                        </div>
                        
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                            {formData.todos?.map((todo) => (
                                <div key={todo.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-white/5 rounded-xl group hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                                    <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{todo.task}</span>
                                    <button onClick={() => handleRemoveTodo(todo.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {(!formData.todos || formData.todos.length === 0) && (
                                <p className="text-xs text-slate-400 italic text-center py-2">No tasks added yet.</p>
                            )}
                        </div>
                    </div>

                    <RadioGroup 
                        label={t('status')}
                        options={[
                            {value: 'Planning', label: t('planning'), icon: <Briefcase size={16}/>},
                            {value: 'Upcoming', label: t('upcoming'), icon: <Clock size={16}/>},
                            {value: 'Completed', label: t('completed'), icon: <Check size={16}/>},
                        ]}
                        value={formData.status || 'Planning'}
                        onChange={v => setFormData({...formData, status: v})}
                    />
                </div>
              )}

              <div className="flex justify-end pt-4">
                  <Button onClick={handleSave}>{editingId ? t('update') : t('create')}</Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
