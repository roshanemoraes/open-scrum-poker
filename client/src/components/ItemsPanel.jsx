import { useState } from 'react';

export default function ItemsPanel({ items, currentItemIndex, isHost, onAdd, onSelect, onRemove, onPrev, onNext }) {
  const [newName, setNewName] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName('');
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
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add sprint item…"
            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-violet-400"
          />
          <button type="submit" className="text-sm bg-violet-600 text-white rounded-lg px-3 py-1.5">
            Add
          </button>
        </form>
      )}
    </div>
  );
}
