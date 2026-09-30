import { useEffect, useState } from 'react';
import { CheckIcon, CloseIcon } from './Icons.jsx';

function InfoIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" {...props}>
      <circle cx="8" cy="8" r="6.3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="4.9" r="0.75" fill="currentColor" />
    </svg>
  );
}

const VARIANTS = {
  success: {
    bg: 'bg-emerald-500',
    track: 'bg-emerald-400/50',
    bar: 'bg-emerald-100',
    iconColor: 'text-emerald-500',
    icon: CheckIcon,
    defaultTitle: 'Synced!',
  },
  error: {
    bg: 'bg-red-500',
    track: 'bg-red-400/50',
    bar: 'bg-red-100',
    iconColor: 'text-red-500',
    icon: CloseIcon,
    defaultTitle: 'Error!',
  },
  info: {
    bg: 'bg-slate-600',
    track: 'bg-slate-400/50',
    bar: 'bg-slate-100',
    iconColor: 'text-slate-600',
    icon: InfoIcon,
    defaultTitle: 'Heads up',
  },
};

export default function Toast({ type = 'error', title, message, duration = 6000, onClose }) {
  const [shrink, setShrink] = useState(false);
  const variant = VARIANTS[type] || VARIANTS.error;
  const Icon = variant.icon;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShrink(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`relative overflow-hidden w-full max-w-sm rounded-[10px] shadow-xl text-white ${variant.bg}`}>
      <div className="flex items-start gap-3 pl-4 pr-3 pt-4 pb-3">
        <span className={`shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center ${variant.iconColor}`}>
          <Icon width={16} height={16} strokeWidth={3} />
        </span>
        <div className="flex-1 min-w-0 pt-0.5">
          <p className="font-bold leading-tight">{title || variant.defaultTitle}</p>
          {message && <p className="text-sm text-white/90 mt-0.5">{message}</p>}
        </div>
        <button onClick={onClose} className="shrink-0 text-white/80 hover:text-white p-0.5">
          <CloseIcon width={16} height={16} />
        </button>
      </div>
      <div className={`h-1.5 w-full ${variant.track}`}>
        <div
          className={`h-full ${variant.bar} transition-[width] ease-linear`}
          style={{ width: shrink ? '0%' : '100%', transitionDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}
