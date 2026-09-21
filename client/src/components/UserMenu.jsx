import { useEffect, useRef, useState } from 'react';
import Switch from './Switch.jsx';

// Exact palette/typography from UserDropdown.dc.html.
const PLEX_SANS = { fontFamily: "'IBM Plex Sans', sans-serif" };

function initials(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="#6E6B85" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke="#4A4763" strokeWidth="1.4" />
      <path d="M7 6.8c0-1.2 1-2 2-2s2 .7 2 1.8c0 1.3-2 1.5-2 3.2" stroke="#4A4763" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="12.6" r="0.8" fill="#4A4763" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <path d="M7.5 2.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 15.5h3.5" stroke="#C43D3D" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.5 12.2l3.2-3.2-3.2-3.2M14.5 9H6.5" stroke="#C43D3D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ObserverIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="4.2" r="1.6" fill="#4A4763" />
      <path
        d="M9 6.2c-2.6 0-4.7 1.7-5.5 4 .6.5 1.4.8 2.2.8.5 0 1-.1 1.4-.3L9 15.5l1.9-4.8c.4.2.9.3 1.4.3.8 0 1.6-.3 2.2-.8-.8-2.3-2.9-4-5.5-4z"
        fill="#4A4763"
      />
    </svg>
  );
}

export default function UserMenu({ name, email, isObserver, onToggleObserver, showObserverToggle, onSignOut }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const displayEmail = email || '';

  return (
    <div ref={rootRef} className="relative shrink-0" style={PLEX_SANS}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-[#EDEBF8] border-none cursor-pointer"
      >
        <div className="w-7 h-7 rounded-full bg-[#5B4FE8] text-white text-[12px] font-semibold flex items-center justify-center shrink-0">
          {initials(name)}
        </div>
        <span className="text-[13px] font-medium text-[#1B1D29] truncate max-w-[160px]">{displayEmail || name}</span>
        <span className={open ? 'rotate-180 transition-transform' : 'transition-transform'}>
          <ChevronIcon />
        </span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+10px)] right-0 w-[260px] bg-white rounded-2xl shadow-[0_12px_32px_rgba(27,29,41,0.14),0_1px_2px_rgba(27,29,41,0.06)] border border-[#ECEAF6] overflow-hidden z-50">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-[#5B4FE8] text-white text-[15px] font-semibold flex items-center justify-center shrink-0">
              {initials(name)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-semibold text-[#1B1D29] truncate">{name}</span>
              {displayEmail && (
                <span className="text-[12.5px] text-[#6E6B85] truncate">{displayEmail}</span>
              )}
            </div>
          </div>

          {showObserverToggle && (
            <>
              <div className="h-px bg-[#ECEAF6]" />
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ObserverIcon />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13.5px] font-medium text-[#1B1D29]">Observer mode</span>
                    <span className="text-[12px] text-[#6E6B85]">
                      {isObserver ? 'You are not voting' : 'You are voting'}
                    </span>
                  </div>
                </div>
                <Switch checked={isObserver} onChange={onToggleObserver} label="Observer mode" />
              </div>
            </>
          )}

          <div className="h-px bg-[#ECEAF6]" />

          <div className="p-2">
            <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-[10px] cursor-pointer hover:bg-[#F5F4FB]">
              <HelpIcon />
              <span className="text-[13.5px] font-medium text-[#1B1D29]">Help &amp; feedback</span>
            </div>
          </div>

          <div className="h-px bg-[#ECEAF6]" />

          <div className="p-2">
            <div
              onClick={onSignOut}
              className="flex items-center gap-3 px-2.5 py-2.5 rounded-[10px] cursor-pointer hover:bg-[#FDECEC]"
            >
              <SignOutIcon />
              <span className="text-[13.5px] font-semibold text-[#C43D3D]">Sign out</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
