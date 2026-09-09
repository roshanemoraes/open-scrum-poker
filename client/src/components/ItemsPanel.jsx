import { useState } from 'react';

const ITEM_PREFIX = 'PRB-';

export default function ItemsPanel({ items, currentItemIndex, isHost, onAdd, onSelect, onRemove, onPrev, onNext }) {
  const [newNumber, setNewNumber] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (!newNumber.trim()) return;
    onAdd(ITEM_PREFIX + newNumber.trim());
    setNewNumber('');
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase">
          Sprint items {items.length > 0 && `(${currentItemIndex + 1}/${items.length})`}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onPrev}
            disabled={currentItemIndex <= 0}
            className="text-xs px-2 py-1 rounded-lg bg-slate-100 disabled:opacity-30"
          >
            ← Prev
          </button>
          <button
            onClick={onNext}
            disabled={currentItemIndex >= items.length - 1}
            className="text-xs px-2 py-1 rounded-lg bg-slate-100 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto mb-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={[
              'flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer',
              idx === currentItemIndex ? 'bg-violet-100 text-violet-800 font-medium' : 'hover:bg-slate-50 text-slate-600',
            ].join(' ')}
            onClick={() => onSelect(idx)}
          >
            <span className="truncate">{idx + 1}. {item.name}</span>
            {isHost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                className="text-slate-300 hover:text-red-500 ml-2"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-300 px-1">No items yet</p>}
      </div>

      {isHost && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <div className="flex-1 flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:border-violet-400">
            <span className="pl-3 text-sm text-slate-400 select-none">{ITEM_PREFIX}</span>
            <input
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
              inputMode="numeric"
              className="flex-1 min-w-0 text-sm py-1.5 pr-3 pl-1 outline-none"
            />
          </div>
          <button type="submit" className="text-sm bg-violet-600 text-white rounded-lg px-3 py-1.5">
            Add
          </button>
        </form>
      )}
    </div>
  );
}
