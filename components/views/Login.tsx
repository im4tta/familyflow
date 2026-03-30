
import React, { useState } from 'react';
import { Button, Input, Card } from '../UI';
import { login } from '../../services/auth';
import { User } from '../../types';
import { Sparkles, Lock, User as UserIcon, Loader2, Globe } from 'lucide-react';

// Added Props interface to match usage in App.tsx
interface Props {
  onLogin: (user: User) => void;
  t: (key: any) => string;
  currentLang: 'en' | 'km';
  onLanguageChange: (lang: 'en' | 'km') => void;
}

// Implemented and exported LoginView component to fix the 'App.tsx' error
export const LoginView: React.FC<Props> = ({ onLogin, t, currentLang, onLanguageChange }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    setError('');
    
    const user = await login(username, password);
    if (user) {
      onLogin(user);
    } else {
      setError('Invalid credentials. Please check your username and password.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-3xl animate-float"></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/30 mb-4 transform hover:rotate-12 transition-transform duration-500">
                <Sparkles size={32} fill="currentColor" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">{t('appName')}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{t('secureLogin')}</p>
        </div>

        <Card className="p-8 backdrop-blur-2xl border-white/40 dark:border-slate-700/50 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input 
              label={t('username')} 
              icon={<UserIcon size={18} />} 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
            />
            <Input 
              label={t('password')} 
              type="password" 
              icon={<Lock size={18} />} 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            <Button 
                type="submit" 
                className="w-full h-12 text-lg shadow-xl shadow-primary/30 font-black" 
                disabled={isLoading}
                icon={isLoading ? <Loader2 className="animate-spin" size={20} /> : undefined}
            >
              {isLoading ? t('verifying') : t('login')}
            </Button>
          </form>

          {/* Language Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
              <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                  <button 
                    onClick={() => onLanguageChange('en')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentLang === 'en' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                  >
                      EN
                  </button>
                  <button 
                    onClick={() => onLanguageChange('km')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentLang === 'km' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500'}`}
                  >
                      ខ្មែរ
                  </button>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                  <Globe size={10} /> {t('language')}
              </p>
          </div>
        </Card>

        <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-600 font-medium">
                © 2025 FamilyFlow App. All rights reserved.
            </p>
        </div>
      </div>
    </div>
  );
};
