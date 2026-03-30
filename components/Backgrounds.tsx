
import React, { useMemo } from 'react';

/**
 * Floating Lines Background
 * High-intensity moving vectors that react to the primary color.
 */
export const FloatingLines: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-60 dark:opacity-80">
        {[...Array(25)].map((_, i) => (
          <line
            key={i}
            x1={-100 + i * 10 + "%"}
            y1="-20%"
            x2={i * 10 + "%"}
            y2="120%"
            stroke="rgb(var(--color-primary))"
            strokeWidth="6"
            className="animate-pulse"
            style={{
              animation: `float-line-${i % 3} ${5 + i * 1.5}s ease-in-out infinite`,
              filter: 'blur(1.5px)',
              opacity: 0.15 + (i % 5) * 0.2
            }}
          />
        ))}
      </svg>
      <style>{`
        @keyframes float-line-0 { 0%, 100% { transform: translateX(-15%) rotate(0deg); } 50% { transform: translateX(15%) rotate(3deg); } }
        @keyframes float-line-1 { 0%, 100% { transform: translateY(-10%) skewX(10deg); } 50% { transform: translateY(10%) skewX(-10deg); } }
        @keyframes float-line-2 { 0%, 100% { transform: scaleX(0.7); } 50% { transform: scaleX(1.3); } }
      `}</style>
    </div>
  );
};

/**
 * Pixel Snow Background
 * Large, glowing falling squares for a tech-retro feel.
 */
export const PixelSnow: React.FC = () => {
  const pixels = useMemo(() => {
    return [...Array(120)].map((_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      size: Math.random() * 15 + 8 + 'px',
      delay: Math.random() * 6 + 's',
      duration: Math.random() * 5 + 3 + 's',
      opacity: Math.random() * 0.9 + 0.4
    }));
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {pixels.map((p) => (
        <div
          key={p.id}
          className="absolute bg-primary rounded-sm shadow-[0_0_25px_rgba(var(--color-primary),1)]"
          style={{
            left: p.left,
            top: '-30px',
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `pixel-fall-extreme ${p.duration} linear infinite`,
            animationDelay: p.delay
          }}
        />
      ))}
      <style>{`
        @keyframes pixel-fall-extreme {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(115vh) rotate(1800deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

/**
 * Dot Grid Background
 * Large, structural tech grid that dominates the backdrop.
 */
export const DotGrid: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <div 
        className="w-full h-full opacity-40 dark:opacity-60"
        style={{
          backgroundImage: `radial-gradient(rgb(var(--color-primary)) 4px, transparent 4px)`,
          backgroundSize: '80px 80px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-primary/15" />
    </div>
  );
};

/**
 * Color Bends Background
 * Massive, liquid-like moving gradients.
 */
export const ColorBends: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-[-35%] left-[-25%] w-[120%] h-[120%] bg-primary/50 blur-[220px] rounded-full animate-float-slow" />
      <div className="absolute bottom-[-25%] right-[-20%] w-[100%] h-[100%] bg-orange-600/40 blur-[200px] rounded-full animate-float" style={{ animationDelay: '-4s' }} />
      <div className="absolute top-[10%] right-[-5%] w-[80%] h-[80%] bg-amber-400/35 blur-[180px] rounded-full animate-pulse-slow" />
      <div className="absolute inset-0 backdrop-blur-[80px] opacity-30 bg-slate-50/10 dark:bg-slate-900/10" />
    </div>
  );
};

/**
 * Prism Background
 * Sharp, high-contrast geometric shards.
 */
export const Prism: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="opacity-35 dark:opacity-50">
        <polygon points="0,0 90,0 0,90" fill="rgb(var(--color-primary))" className="animate-pulse" style={{ animationDuration: '2s' }} />
        <polygon points="100,0 100,90 10,0" fill="orange" className="animate-pulse" style={{ animationDelay: '0.3s', animationDuration: '3s' }} />
        <polygon points="0,100 0,10 90,100" fill="darkorange" className="animate-pulse" style={{ animationDelay: '0.6s', animationDuration: '4s' }} />
        <polygon points="100,100 10,100 100,10" fill="amber" className="animate-pulse" style={{ animationDelay: '0.9s', animationDuration: '5s' }} />
      </svg>
    </div>
  );
};
