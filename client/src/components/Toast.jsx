import { useEffect, useState } from 'react';
import { CheckIcon, CloseIcon } from './Icons.jsx';

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
