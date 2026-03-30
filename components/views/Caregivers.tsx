
import React, { useState } from 'react';
import { Caregiver, User } from '../../types';
import { Card, Button, Badge, Modal, Input, Select, DatePicker, RadioGroup } from '../UI';
import { User as UserIcon, Phone, Mail, ShieldCheck, Plus, Trash2, Edit2, Cake, Droplet, Stethoscope, Heart, Activity, ArrowRight, Eye, Lock, Camera, Upload } from 'lucide-react';
import { saveCaregiver, deleteCaregiver } from '../../services/neon';

interface Props {
  caregivers: Caregiver[];
  isDark: boolean;
  user?: User;
  onAddCaregiver: (c: Caregiver) => void;
  onDeleteCaregiver: (id: string) => void;
  onRefresh: () => void;
  t: (key: any) => string;
  onNavigate: (category: any) => void;
}

export const CaregiversView: React.FC<Props> = ({ caregivers, isDark, user, onAddCaregiver, onDeleteCaregiver, onRefresh, t, onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<Caregiver | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Caregiver>>({
    role: 'Parent',
    accessLevel: 'ViewOnly'
  });

  const handleEdit = (c: Caregiver) => {
      setEditingId(c.id);
      setFormData(c);
      setIsModalOpen(true);
  }

  const handleViewProfile = (c: Caregiver) => {
      setViewingMember(c);
      setIsProfileModalOpen(true);
  }

  const handleSave = async () => {
    if(!formData.name) return;
    const member: Caregiver = {
        id: editingId || Date.now().toString(),
        name: formData.name,
        role: formData.role as any,
        phone: formData.phone || '',
        email: formData.email || '',
        accessLevel: formData.accessLevel as any,
        lastActive: editingId ? (formData.lastActive || 'Today') : 'Invited',
        photoUrl: formData.photoUrl,
        dateOfBirth: formData.dateOfBirth || '',
        bloodType: formData.bloodType || '',
        allergies: formData.allergies || '',
        doctorName: formData.doctorName || ''
    };
    await saveCaregiver(member);
    onRefresh();
    setIsModalOpen(false);
    setFormData({ role: 'Parent', accessLevel: 'ViewOnly' });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
      if(confirm(t('confirmDelete'))) {
          await deleteCaregiver(id);
          onRefresh();
      }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("File size too large. Please select an image under 10MB.");
        return;
      }
      
      // Image Compression Logic
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 600; // Resize to reasonable max dimension

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.7 quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData({ ...formData, photoUrl: compressedDataUrl });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateAge = (dob?: string) => {
      if(!dob) return null;
      const birth = new Date(dob);
      const now = new Date();
      const diff = now.getTime() - birth.getTime();
      
      if (diff < 0) return null;
      
      const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30.44));
      
      if (months < 1) return t('lessThanMonth');
      if (months < 24) return `${months} ${t('months')}`;
      
      const years = Math.floor(months / 12);
      return `${years} ${t('years')}`;
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <Card className="bg-gradient-to-r from-orange-900 to-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div>
             <h2 className="text-3xl font-bold">{t('familyTeam')}</h2>
             <p className="text-orange-200 mt-1">{t('manageAccess')}</p>
           </div>
           <div className="flex items-center gap-4">
                {user?.role === 'Admin' && (
                    <Button variant="glass" size="sm" icon={<Plus size={16} />} onClick={() => { setEditingId(null); setFormData({}); setIsModalOpen(true); }}>{t('invite')}</Button>
                )}
           </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {caregivers.map(person => (
          <div key={person.id} className="bg-white dark:bg-dark-card border border-slate-100 dark:border-slate-700 rounded-[2rem] p-6 shadow-pill hover:shadow-xl transition-all duration-300 group relative hover:scale-[1.02]">
             {user?.role === 'Admin' && (
                 <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(person); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-primary transition-colors shadow-sm"><Edit2 size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition-colors shadow-sm"><Trash2 size={16}/></button>
                 </div>
             )}
             <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm">
                    {person.photoUrl ? <img src={person.photoUrl} alt={person.name} className="w-full h-full object-cover" /> : <UserIcon size={28} className="text-slate-400" />}
                </div>
                <Badge color={person.accessLevel === 'Full' ? 'green' : 'blue'}>{t(person.accessLevel.toLowerCase())}</Badge>
             </div>
             
             <h4 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                 {person.name}
                 {person.dateOfBirth && (
                     <span className="text-sm font-normal text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/5">
                         {calculateAge(person.dateOfBirth)}
                     </span>
                 )}
             </h4>
             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1"><ShieldCheck size={14}/> {t(person.role.toLowerCase())}</p>
             
             {(person.bloodType || person.dateOfBirth) && (
                 <div className="flex items-center gap-3 mb-4">
                    {person.bloodType && (
                        <div className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-full text-xs font-bold flex items-center">
                            <Droplet size={12} className="mr-1"/> {person.bloodType}
                        </div>
                    )}
                 </div>
             )}

             <div className="space-y-3">
               <Button variant="outline" className="w-full justify-center" onClick={() => handleViewProfile(person)}>{t('viewProfile')}</Button>
               
               <div className="grid grid-cols-2 gap-3">
                    <a href={`tel:${person.phone}`} className="flex items-center justify-center space-x-2 py-2.5 bg-slate-50 dark:bg-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <Phone size={16} /> <span>Call</span>
                    </a>
                    <a href={`mailto:${person.email}`} className="flex items-center justify-center space-x-2 py-2.5 bg-slate-50 dark:bg-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                        <Mail size={16} /> <span>Email</span>
                    </a>
               </div>
             </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? t('edit') : t('invite')}>
          <div className="space-y-6">
              <div className="flex flex-col items-center mb-4">
                  <div className="relative group cursor-pointer w-24 h-24">
                      <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-slate-100 dark:ring-slate-700">
                          <img src={formData.photoUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=New"} className="w-full h-full object-cover bg-slate-50" alt="Avatar" />
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="text-white" size={24} />
                      </div>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarUpload} accept="image/*" />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{t('selectAvatar')}</p>
              </div>

              <Input label={t('title')} value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Full Name" />
              
              <RadioGroup 
                label={t('role')}
                options={[
                    {value: 'Parent', label: t('parent')},
                    {value: 'Child', label: t('child')},
                    {value: 'Nanny', label: t('nanny')},
                    {value: 'Grandparent', label: t('grandparent')},
                ]}
                value={formData.role || 'Parent'}
                onChange={v => setFormData({...formData, role: v})}
                gridCols={2}
              />

              <div className="grid grid-cols-2 gap-4">
                   <DatePicker label={t('birthday')} value={formData.dateOfBirth || ''} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
                   <RadioGroup 
                    label={t('bloodType')}
                    options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => ({value: b, label: b}))}
                    value={formData.bloodType || ''}
                    onChange={v => setFormData({...formData, bloodType: v})}
                    className="col-span-2"
                    gridCols={4}
                  />
              </div>
              <Input label={t('allergies')} value={formData.allergies || ''} onChange={e => setFormData({...formData, allergies: e.target.value})} placeholder="e.g. Peanuts" />
              <Input label={t('provider')} value={formData.doctorName || ''} onChange={e => setFormData({...formData, doctorName: e.target.value})} placeholder="Dr. Name" />

              <div className="grid grid-cols-2 gap-4">
                  <Input label={t('phone')} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="555-0123" />
                  <Input label={t('email')} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
              </div>
              
              <RadioGroup 
                label={t('accessLevel')}
                options={[
                    {value: 'Full', label: t('full'), icon: <ShieldCheck size={16}/>},
                    {value: 'Limited', label: t('limited'), icon: <Eye size={16}/>},
                    {value: 'ViewOnly', label: t('viewOnly'), icon: <Lock size={16}/>}
                ]}
                value={formData.accessLevel || 'ViewOnly'}
                onChange={v => setFormData({...formData, accessLevel: v})}
              />
              
              <div className="flex justify-end pt-4">
                  <Button onClick={handleSave}>{editingId ? t('update') : t('invite')}</Button>
              </div>
          </div>
      </Modal>

      {/* Full Profile Modal */}
      {viewingMember && (
          <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title={`${viewingMember.name}'s ${t('profile')}`}>
              <div className="space-y-6">
                  {/* Header Card */}
                  <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-[1.5rem] p-6 text-white shadow-lg relative overflow-hidden">
                      <div className="relative z-10 flex items-center gap-6">
                          <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md p-1">
                              <img src={viewingMember.photoUrl} className="w-full h-full rounded-full bg-white object-cover" alt="Profile" />
                          </div>
                          <div>
                              <h2 className="text-3xl font-bold">{viewingMember.name}</h2>
                              <p className="opacity-90 font-medium flex items-center gap-2">{t(viewingMember.role.toLowerCase())} <span className="w-1 h-1 bg-white rounded-full"></span> {calculateAge(viewingMember.dateOfBirth)}</p>
                          </div>
                      </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-800">
                           <p className="text-xs text-rose-500 font-bold uppercase mb-1">{t('bloodType')}</p>
                           <p className="text-2xl font-black text-rose-700 dark:text-rose-400">{viewingMember.bloodType || '--'}</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                           <p className="text-xs text-blue-500 font-bold uppercase mb-1">{t('provider')}</p>
                           <p className="text-lg font-bold text-blue-700 dark:text-blue-400 truncate">{viewingMember.doctorName || 'Not set'}</p>
                      </div>
                  </div>
                  
                  {/* Allergies */}
                  <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Activity size={16}/> {t('allergies')}</h4>
                      {viewingMember.allergies ? (
                           <div className="flex flex-wrap gap-2">
                               {viewingMember.allergies.split(',').map((a, i) => (
                                   <span key={`${a.trim()}-${i}`} className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-sm font-bold">{a.trim()}</span>
                               ))}
                           </div>
                      ) : (
                          <p className="text-slate-400 text-sm italic">No known allergies listed.</p>
                      )}
                  </div>
                  
                  {/* Child Specific Quick Links */}
                  {viewingMember.role === 'Child' && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 p-5 rounded-2xl border border-orange-100 dark:border-orange-800">
                          <h4 className="font-bold text-orange-900 dark:text-orange-300 mb-3">{t('trackDev')}</h4>
                          <p className="text-sm text-orange-700 dark:text-orange-400 mb-4">Quick access to growth tracking and milestones.</p>
                          <div className="flex gap-3">
                              <Button size="sm" className="flex-1" onClick={() => { setIsProfileModalOpen(false); onNavigate('Development'); }}>{t('growthCharts')}</Button>
                              <Button size="sm" variant="secondary" className="flex-1" onClick={() => { setIsProfileModalOpen(false); onNavigate('Health'); }}>{t('medicalHistory')}</Button>
                          </div>
                      </div>
                  )}

                  <div className="flex justify-end">
                      <Button variant="ghost" onClick={() => setIsProfileModalOpen(false)}>{t('cancel')}</Button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};
