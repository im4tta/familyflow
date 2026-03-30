
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: React.ReactNode;
  rounded?: string;
}

export const generateEmojiAvatar = (emoji: string): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const hue = Math.floor(Math.random() * 360);
    ctx.fillStyle = `hsl(${hue}, 70%, 95%)`;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.font = '140px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 128, 138);
  }
  return canvas.toDataURL('image/png');
};

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className = '', 
  rounded = 'rounded-full',
  ...props 
}) => {
  const baseStyles = `inline-flex items-center justify-center font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm ${rounded}`;
  
  const variants = {
    primary: "bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 border border-white/10",
    secondary: "bg-secondary text-white shadow-lg shadow-secondary/30 border border-white/10",
    outline: "border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-primary hover:bg-primary/5 dark:hover:bg-white/5",
    ghost: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-primary dark:hover:text-white",
    glass: "bg-white/30 dark:bg-white/10 backdrop-blur-md border border-white/30 text-slate-800 dark:text-white hover:bg-white/40 dark:hover:bg-white/20 shadow-sm",
    danger: "bg-red-500/10 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white transition-colors",
  };

  const sizes = {
    sm: "h-6 px-2 text-[9px]",
    md: "h-7 px-3 text-[10px]",
    lg: "h-8 px-4 text-xs",
    icon: "h-7 w-7 p-1",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {icon && <span className={children ? "mr-2" : ""}>{icon}</span>}
      {children}
    </button>
  );
};

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  title?: string; 
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ children, className = '', title, subtitle, icon, action, noPadding = false, onClick, style }) => (
  <div 
    onClick={onClick}
    style={style}
    className={`
      bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl
      rounded-2xl
      shadow-lg shadow-slate-200/40 dark:shadow-black/40
      border border-white/60 dark:border-slate-700/60
      transition-all duration-300 
      ${onClick ? 'cursor-pointer active:scale-[0.99] hover:shadow-2xl hover:border-primary/30 dark:hover:border-slate-500/50' : ''} 
      ${className}
    `}
  >
    {(title || action || icon) && (
      <div className="px-3 pt-3 pb-1 md:px-4 md:pt-4 md:pb-1 flex justify-between items-start">
        <div className="flex items-center gap-2 overflow-hidden">
          {icon && <div className="text-slate-400 dark:text-slate-500 shrink-0">{icon}</div>}
          <div className="min-w-0">
            {title && <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight truncate">{title}</h3>}
            {subtitle && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0 uppercase tracking-wider truncate">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="ml-2 shrink-0">{action}</div>}
      </div>
    )}
    <div className={noPadding ? '' : 'p-2 md:p-3'}>
      {children}
    </div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'green' | 'blue' | 'red' | 'yellow' | 'gray' | 'purple' | 'orange'; className?: string }> = ({ children, color = 'blue', className = '' }) => {
  const colors = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
    red: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-200 dark:border-rose-500/30",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
    gray: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300 border-slate-200 dark:border-slate-600",
    purple: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 border-violet-200 dark:border-violet-500/30",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border-orange-200 dark:border-orange-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-extrabold border ${colors[color]} ${className}`}>
      {children}
    </span>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: React.ReactNode }> = ({ label, icon, className = '', ...props }) => (
  <div className="mb-4 group">
    {label && <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide transition-colors group-focus-within:text-primary">{label}</label>}
    <div className="relative transition-all duration-300 transform group-focus-within:-translate-y-0.5">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
          {icon}
        </div>
      )}
      <input 
        className={`w-full ${icon ? 'pl-8' : 'px-2'} pr-2 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all shadow-sm hover:bg-white dark:hover:bg-slate-800 text-[10px] ${className}`} 
        {...props} 
      />
    </div>
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: {value: string, label: string}[]; icon?: React.ReactNode }> = ({ label, options, icon, className = '', ...props }) => (
  <div className="mb-4 group">
    {label && <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide transition-colors group-focus-within:text-primary">{label}</label>}
    <div className="relative transition-all duration-300 transform group-focus-within:-translate-y-0.5">
       {icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
          {icon}
        </div>
      )}
      <select 
        className={`w-full ${icon ? 'pl-8' : 'px-2'} pr-6 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white appearance-none focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer shadow-sm hover:bg-white dark:hover:bg-slate-800 text-[10px] ${className}`} 
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">
        <ChevronDown size={16} />
      </div>
    </div>
  </div>
);

export const RadioGroup: React.FC<{
  label?: string;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (value: any) => void;
  className?: string;
  gridCols?: number; // 1, 2, 3
}> = ({ label, options, value, onChange, className = '', gridCols }) => {
  const gridClass = gridCols === 2 ? 'grid-cols-2' : gridCols === 3 ? 'grid-cols-3' : gridCols === 4 ? 'grid-cols-4' : 'grid-cols-1';
  
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide">{label}</label>}
      <div className={`gap-2 ${gridCols ? `grid ${gridClass}` : 'flex flex-wrap'}`}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`
                relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border
                ${isSelected 
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02] z-10' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-slate-600'
                }
                ${!gridCols ? 'flex-1 min-w-[80px]' : ''}
              `}
            >
              {option.icon && <span className={`transition-colors ${isSelected ? 'text-white' : 'text-slate-400'}`}>{option.icon}</span>}
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const DatePicker: React.FC<{ label?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; icon?: React.ReactNode }> = ({ label, value, onChange, icon }) => (
  <div className="mb-4 group">
    {label && <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 ml-1 uppercase tracking-wide transition-colors group-focus-within:text-primary">{label}</label>}
    <div className="relative transition-all duration-300 transform group-focus-within:-translate-y-0.5">
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
          {icon}
        </div>
      )}
      <input 
        type="date"
        value={value}
        onChange={onChange}
        className={`w-full ${icon ? 'pl-8' : 'px-2'} py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer shadow-sm hover:bg-white dark:hover:bg-slate-800 appearance-none min-h-[30px] text-[10px]`}
      />
    </div>
  </div>
);

export const Switch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-300 cursor-pointer shadow-inner ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
  >
    <div
      className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

export const ConfettiBurst: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  return (
    <>
      <style>{`
        @keyframes confetti-explode {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center overflow-hidden">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full"
            style={{
              backgroundColor: ['#FFD700', '#FF6347', '#00CED1', '#ADFF2F', '#FF69B4', '#9370DB'][i % 6],
              left: '50%',
              top: '50%',
              '--tx': `${(Math.random() - 0.5) * 150}vw`,
              '--ty': `${(Math.random() - 0.5) * 150}vh`,
              animation: `confetti-explode ${1 + Math.random()}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
              animationDelay: `${Math.random() * 0.2}s`
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  const [show, setShow] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      document.body.classList.add('modal-open');
    } else {
      setTimeout(() => setShow(false), 300);
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!show) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-end md:items-center justify-center md:p-4 transition-all duration-500 ${isOpen ? 'visible' : 'invisible'}`}>
      <div 
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      />
      <div className={`
        bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl
        w-full md:max-w-lg 
        rounded-t-[2.5rem] md:rounded-[2.5rem] 
        shadow-2xl 
        transform transition-all duration-500 cubic-bezier(0.2, 0.8, 0.2, 1)
        ${isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-full md:translate-y-8 md:scale-95 opacity-0'} 
        max-h-[90vh] flex flex-col
        border border-white/20 dark:border-slate-700
      `}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl z-20 rounded-t-[2.5rem] shrink-0">
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors transform active:scale-90">
            <X size={18} className="text-slate-500 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-6 pb-24 md:pb-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
