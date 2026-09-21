import { useState } from 'react';

// Exact palette/typography from ManageSession.dc.html — kept local to this card
// rather than promoted to the theme, since it's the only place these are used.
const SPACE_GROTESK = { fontFamily: "'Space Grotesk', sans-serif" };
const PLEX_SANS = { fontFamily: "'IBM Plex Sans', sans-serif" };

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5v8M4.5 6.5l3 3 3-3" stroke="#4A4763" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11v1.5A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V11" stroke="#4A4763" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="2.4" stroke="#4A4763" strokeWidth="1.4" />
      <path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.2 4.2l1.4 1.4M12.4 12.4l1.4 1.4M13.8 4.2l-1.4 1.4M5.6 12.4l-1.4 1.4" stroke="#4A4763" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function EndSessionIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2v5.5" stroke="#C43D3D" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4.3 3.8a5 5 0 1 0 6.4 0" stroke="#C43D3D" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ direction }) {
  const d = direction === 'left' ? 'M8 2.5L3.5 6.5L8 10.5' : 'M5 2.5L9.5 6.5L5 10.5';
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="6.3" stroke="#B8860F" strokeWidth="1.3" />
      <path d="M8 5.5v3.2" stroke="#B8860F" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="10.8" r="0.7" fill="#B8860F" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M3 3l7 7M10 3l-7 7" stroke="#8983B0" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function ItemsPanel({
  items,
  currentItemIndex,
  isHost,
  adding,
  itemPrefix = '',
  onAdd,
  onSelect,
  onRemove,
  onPrev,
  onNext,
  onDownloadExcel,
  onEndSession,
  onSettings,
  canNavigate = true,
}) {
  const [newNumber, setNewNumber] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (!newNumber.trim() || adding) return;

    const numbers = newNumber.split(',').map((n) => n.trim()).filter(Boolean);
    const existingNames = new Set(items.map((i) => i.name.toLowerCase()));
    const seen = new Set();
    const duplicates = [];
    const toAdd = [];

    for (const number of numbers) {
      const fullName = itemPrefix + number;
      const key = fullName.toLowerCase();
      if (existingNames.has(key) || seen.has(key)) {
        duplicates.push(fullName);
        continue;
      }
      seen.add(key);
      toAdd.push(fullName);
    }

    if (duplicates.length > 0) {
      setDuplicateError(`Already in this sprint (skipped): ${duplicates.join(', ')}`);
    } else {
      setDuplicateError('');
    }

    if (toAdd.length > 0) onAdd(toAdd);
    setNewNumber('');
  }

  const canPrev = currentItemIndex > 0 && canNavigate;
  const canNext = currentItemIndex < items.length - 1 && canNavigate;
  const navBase = 'flex items-center gap-1 px-3 py-[7px] rounded-[8px] text-[13px] font-semibold transition-colors';

  return (
    <div className="bg-white border border-[#E4E1F2] rounded-[20px] p-[26px_28px_28px] shadow-[0_1px_2px_rgba(27,29,41,0.04)]" style={PLEX_SANS}>
      <div className="flex items-center justify-between pb-[18px] mb-5 border-b border-[#E4E1F2]">
        <span className="text-[19px] font-bold text-[#1B1D29]" style={SPACE_GROTESK}>Manage session</span>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onSettings}
            className="flex items-center gap-[7px] px-[14px] py-2 rounded-[9px] bg-transparent text-[#4A4763] text-[13.5px] font-semibold hover:bg-[#F5F4FB] transition-colors"
          >
            <SettingsIcon /> Settings
          </button>
          <button
            onClick={onDownloadExcel}
            className="flex items-center gap-[7px] px-[14px] py-2 rounded-[9px] bg-transparent text-[#4A4763] text-[13.5px] font-semibold hover:bg-[#F5F4FB] transition-colors"
          >
            <DownloadIcon /> Download Excel
          </button>
          <button
            onClick={onEndSession}
            className="flex items-center gap-[7px] px-[14px] py-2 rounded-[9px] bg-white border-[1.5px] border-[#F3C6C6] text-[#C43D3D] text-[13.5px] font-semibold hover:bg-[#FDECEC] transition-colors"
          >
            <EndSessionIcon /> End session
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold text-[#1B1D29]">Sprint items</span>
          {items.length > 0 && (
            <span className="text-[12px] font-semibold text-[#6E6B85] bg-[#F5F4FB] px-[9px] py-[3px] rounded-full">
              {currentItemIndex + 1} of {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            title={!canNavigate ? 'Set final values for this item before moving on' : undefined}
            className={[navBase, canPrev ? 'text-[#4A4763] hover:bg-[#F5F4FB]' : 'text-[#B4B0C9] cursor-not-allowed'].join(' ')}
          >
            <ChevronIcon direction="left" /> Prev
          </button>
          <button
            onClick={onNext}
            disabled={!canNext}
            title={!canNavigate ? 'Set final values for this item before moving on' : undefined}
            className={[navBase, canNext ? 'text-[#4A4763] hover:bg-[#F5F4FB]' : 'text-[#B4B0C9] cursor-not-allowed'].join(' ')}
          >
            Next <ChevronIcon direction="right" />
          </button>
        </div>
      </div>

      {!canNavigate && (
        <div className="flex items-center gap-2.5 bg-[#FDF6E7] border border-[#F3E3B8] rounded-[10px] px-4 py-[11px] mb-[14px]">
          <WarningIcon />
          <span className="text-[13.5px] text-[#8A6A15]">Set final values for this item before switching items.</span>
        </div>
      )}

      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto mb-4">
        {items.map((item, idx) => {
          const locked = !canNavigate && idx !== currentItemIndex;
          const isCurrent = idx === currentItemIndex;
          return (
            <div
              key={item.id}
              className={[
                'flex items-center justify-between rounded-[12px] px-4 py-3 transition-colors',
                locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                isCurrent ? 'bg-[#EFEDFC]' : 'hover:bg-[#F5F4FB]',
              ].join(' ')}
              onClick={() => !locked && onSelect(idx)}
            >
              <span className={['truncate text-[14.5px]', isCurrent ? 'font-semibold text-[#4038B8]' : 'font-medium text-[#4A4763]'].join(' ')}>
                {idx + 1}. {item.name}
              </span>
              {isHost && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  aria-label={`Remove ${item.name}`}
                  className="shrink-0 w-[26px] h-[26px] rounded-[7px] bg-transparent hover:bg-[#E4E1F2] flex items-center justify-center transition-colors ml-2"
                >
                  <RemoveIcon />
                </button>
              )}
            </div>
          );
        })}
        {items.length === 0 && <p className="text-[13.5px] text-[#6E6B85] px-1">No items yet</p>}
      </div>

      {isHost && (
        <form onSubmit={handleAdd} className="flex gap-2.5">
          <div className="flex-1 flex items-center border border-[#E4E1F2] rounded-[10px] overflow-hidden focus-within:border-[#5B4FE8]">
            {itemPrefix && <span className="pl-4 text-[14px] text-[#6E6B85] select-none">{itemPrefix}</span>}
            <input
              value={newNumber}
              onChange={(e) => {
                const raw = e.target.value;
                setNewNumber(itemPrefix ? raw.replace(/[^\d,\s]/g, '') : raw);
                setDuplicateError('');
              }}
              placeholder={itemPrefix ? '1234, 5678, 9012' : 'ABC-1234, ABC-5678'}
              disabled={adding}
              className={`flex-1 min-w-0 text-[14px] text-[#1B1D29] py-3 pr-4 outline-none disabled:opacity-50 ${itemPrefix ? 'pl-1' : 'pl-4'}`}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-1.5 text-[14px] font-semibold bg-[#5B4FE8] hover:bg-[#4038B8] text-white rounded-[10px] px-6 py-3 disabled:opacity-60 transition-colors"
          >
            {adding && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}
      {duplicateError && (
        <p className="text-[12.5px] text-[#C43D3D] mt-1.5">{duplicateError}</p>
      )}
    </div>
  );
}
