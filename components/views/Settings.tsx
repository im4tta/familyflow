
import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Input, Modal, DatePicker, RadioGroup } from '../UI';
import { testConnection, saveSettings, getSettings, resetDatabase, repairDatabaseSchema, getCaregivers, saveCaregiver } from '../../services/neon';
import { requestNotificationPermission, sendLocalNotification } from '../../services/pushService';
import { Database, RefreshCw, Trash2, LogOut, Palette, Type, Layout, Globe, DollarSign, Edit2, Check, AlertCircle, CheckCircle, Wrench, Droplet, Camera, Box, Maximize, Sparkles, Sliders, Bell, BellRing, Monitor, Moon, Sun, PaintBucket } from 'lucide-react';
import { AppSettings, User, Caregiver } from '../../types';

interface Props {
  user: User;
  isDark: boolean;
  onSettingsChange: (s: AppSettings) => void;
  t: (key: any) => string;
}

const ACCENT_COLORS = [
    { value: 'indigo', hex: '#4F46E5' },
    { value: 'rose', hex: '#E11D48' },
    { value: 'blue', hex: '#2563EB' },
    { value: 'emerald', hex: '#059669' },
    { value: 'orange', hex: '#F97316' },
    { value: 'violet', hex: '#8B5CF6' },
    { value: 'cyan', hex: '#06b6d4' },
    { value: 'fuchsia', hex: '#d946ef' },
    { value: 'lime', hex: '#84cc16' },
    { value: 'christmas', hex: '#D42426' }, // Special Christmas Red
];

export const SettingsView: React.FC<Props> = ({ user: propUser, isDark, onSettingsChange, t }) => {
  const user = propUser || { name: 'Guest', role: 'User', username: 'guest', avatar: '' };
  // Initialize with safe defaults, will be overwritten by parent prop or DB load
  const [appSettings, setAppSettings] = useState<AppSettings>({
      font: 'sans', density: 'comfortable', accentColor: 'orange', glassIntensity: 'high',
      language: 'en', monthlyBudget: 0, cornerRadius: 'large', appStyle: 'glass', liveBackground: 'none'
  });
  
  // Load settings on mount (in case parent didn't pass full state)
  useEffect(() => {
      if(user.username) {
          getSettings(user.username).then(s => {
              if(s) setAppSettings(prev => ({...prev, ...s}));
          });
      }
  }, [user.username]);

  const [notifPermission, setNotifPermission] = useState(Notification.permission);
  const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');

  const handleRequestNotifs = async () => {
      const granted = await requestNotificationPermission();
      setNotifPermission(Notification.permission);
      if (granted) {
          sendLocalNotification("FamilyFlow Connected!", "You will now receive real-time updates for your family.");
      }
  };

  const handleTestNotification = () => {
      sendLocalNotification("Family Alert!", "A new milestone has been added! 🚶‍♂️");
  };

  const handleSettingsUpdate = (key: keyof AppSettings, value: any) => {
      const newSettings = { ...appSettings, [key]: value };
      setAppSettings(newSettings);
      onSettingsChange(newSettings);
      if(user.username && user.username !== 'guest') saveSettings(user.username, newSettings);
  };

  const handleTestDb = async () => {
      setDbStatus('testing');
      const res = await testConnection();
      setDbStatus(res.success ? 'connected' : 'error');
      setTimeout(() => setDbStatus('idle'), 3000);
  };

  const handleResetDb = async () => {
      if(confirm("DANGER: This will delete ALL data (expenses, health, milestones). Are you sure?")) {
          await resetDatabase();
          alert("Database has been reset.");
          window.location.reload();
      }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-24">
      
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-lg relative z-10">
              <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Profile" className="w-full h-full rounded-full bg-white object-cover" />
          </div>
          <div className="text-center md:text-left relative z-10">
              <h2 className="text-3xl font-black tracking-tight">{user.name}</h2>
              <p className="text-slate-400 font-medium text-sm flex items-center justify-center md:justify-start gap-2">@{user.username} <span className="w-1 h-1 bg-slate-500 rounded-full"></span> {t(user.role.toLowerCase() as any)}</p>
          </div>
          <div className="md:ml-auto relative z-10">
               <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                   <div className={`w-2.5 h-2.5 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></div>
                   <span className="text-xs font-bold uppercase tracking-wider">{dbStatus === 'connected' ? 'Online' : 'Connected'}</span>
               </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Appearance Settings */}
          <Card title={t('appearance')} icon={<Palette size={20}/>}>
              <div className="space-y-6">
                  {/* Accent Color */}
                  <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3 block">{t('accentColor')}</label>
                      <div className="flex flex-wrap gap-3">
                          {ACCENT_COLORS.map(c => (
                              <button
                                key={c.value}
                                onClick={() => handleSettingsUpdate('accentColor', c.value)}
                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center shadow-sm ${appSettings.accentColor === c.value ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 scale-110' : ''}`}
                                style={{backgroundColor: c.hex}}
                              >
                                  {appSettings.accentColor === c.value && <Check size={14} className="text-white drop-shadow-md" />}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* App Style */}
                  <RadioGroup 
                      label={t('appStyle')}
                      options={[
                          { value: 'glass', label: t('glass'), icon: <Maximize size={16}/> },
                          { value: 'minimal', label: t('minimal'), icon: <Layout size={16}/> },
                          { value: 'neumorphic', label: t('neumorphic'), icon: <Box size={16}/> }
                      ]}
                      value={appSettings.appStyle}
                      onChange={v => handleSettingsUpdate('appStyle', v)}
                      gridCols={3}
                  />

                  {/* Live Background */}
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">Live Background</label>
                      <select 
                          value={appSettings.liveBackground}
                          onChange={(e) => handleSettingsUpdate('liveBackground', e.target.value)}
                          className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                          <option value="none">None (Static)</option>
                          <option value="floating-lines">Floating Lines</option>
                          <option value="pixel-snow">Pixel Snow</option>
                          <option value="dot-grid">Dot Grid</option>
                          <option value="color-bends">Color Bends</option>
                          <option value="prism">Prism</option>
                      </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      {/* Corner Radius */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">{t('cornerRadius')}</label>
                          <div className="flex gap-2">
                              {['medium', 'large', 'full'].map((r) => (
                                  <button
                                      key={r}
                                      onClick={() => handleSettingsUpdate('cornerRadius', r)}
                                      className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${appSettings.cornerRadius === r ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                  >
                                      {r === 'medium' ? 'Md' : r === 'large' ? 'Lg' : 'Round'}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      {/* Glass Intensity */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">{t('glassIntensity')}</label>
                          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                              {['low', 'medium', 'high'].map((lvl) => (
                                  <button
                                      key={lvl}
                                      onClick={() => handleSettingsUpdate('glassIntensity', lvl)}
                                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${appSettings.glassIntensity === lvl ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-400'}`}
                                  >
                                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </Card>

          <div className="space-y-8">
              {/* Typography & Localization */}
              <Card title="Interface" icon={<Type size={20}/>}>
                  <div className="space-y-6">
                      <RadioGroup 
                          label={t('language')}
                          options={[
                              { value: 'en', label: 'English', icon: <Globe size={16}/> },
                              { value: 'km', label: 'ភាសាខ្មែរ', icon: <Globe size={16}/> }
                          ]}
                          value={appSettings.language}
                          onChange={v => handleSettingsUpdate('language', v)}
                          gridCols={2}
                      />
                      
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">{t('font')}</label>
                          <div className="grid grid-cols-3 gap-2">
                              {['sans', 'inter', 'quicksand'].map(f => (
                                  <button
                                      key={f}
                                      onClick={() => handleSettingsUpdate('font', f)}
                                      className={`py-2 px-3 rounded-xl border text-sm transition-all ${appSettings.font === f ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500'}`}
                                      style={{fontFamily: f === 'sans' ? 'Outfit' : f}}
                                  >
                                      {f.charAt(0).toUpperCase() + f.slice(1)}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </Card>

              {/* Budget Settings */}
              <Card title={t('finance')} icon={<DollarSign size={20}/>}>
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                          <DollarSign size={24} />
                      </div>
                      <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">{t('monthlyBudget')}</label>
                          <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                              <input 
                                  type="number" 
                                  value={appSettings.monthlyBudget}
                                  onChange={(e) => handleSettingsUpdate('monthlyBudget', parseFloat(e.target.value))}
                                  className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                          </div>
                      </div>
                  </div>
              </Card>
          </div>
      </div>

      {/* System & Database */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card title={t('notifications')} icon={<Bell size={20}/>}>
              <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${notifPermission === 'granted' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                              <BellRing size={20}/>
                          </div>
                          <div>
                              <p className="font-bold text-sm text-slate-800 dark:text-white">Push Notifications</p>
                              <p className="text-xs text-slate-500">{notifPermission === 'granted' ? 'Active' : 'Disabled'}</p>
                          </div>
                      </div>
                      <Button size="sm" variant={notifPermission === 'granted' ? 'outline' : 'primary'} onClick={handleRequestNotifs}>
                          {notifPermission === 'granted' ? 'Reset' : 'Enable'}
                      </Button>
                  </div>
                  {notifPermission === 'granted' && (
                      <button onClick={handleTestNotification} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-500 hover:text-primary hover:border-primary/50 transition-colors uppercase tracking-wide">
                          Send Test Alert
                      </button>
                  )}
              </div>
          </Card>

          <Card title={t('database')} icon={<Database size={20}/>}>
              <div className="space-y-3">
                  <div className="flex gap-3">
                      <button onClick={handleTestDb} className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2">
                          <RefreshCw size={16} className={dbStatus === 'testing' ? 'animate-spin' : ''} />
                          Test Connection
                      </button>
                      <button onClick={repairDatabaseSchema} className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2">
                          <Wrench size={16} />
                          Repair Schema
                      </button>
                  </div>
                  <button onClick={handleResetDb} className="w-full py-3 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                      <Trash2 size={16} />
                      {t('resetDb')}
                  </button>
                  {dbStatus === 'error' && (
                      <div className="p-3 bg-red-100 text-red-700 text-xs rounded-xl flex items-center gap-2">
                          <AlertCircle size={16} /> Connection failed. Check configuration.
                      </div>
                  )}
                  {dbStatus === 'connected' && (
                      <div className="p-3 bg-emerald-100 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                          <CheckCircle size={16} /> Connection successful.
                      </div>
                  )}
              </div>
          </Card>
      </div>
    </div>
  );
};
