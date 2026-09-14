import { useState } from 'react';
import { presetsForGender } from './avatarPresets.js';
import AvatarFace from './AvatarFace.jsx';

const TABS = [
  { key: 'male', label: 'Male' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'female', label: 'Female' },
];

export default function AvatarPicker({ selectedId, onSelect }) {
  const [gender, setGender] = useState('male');
  const options = presetsForGender(gender);

  function shuffle() {
    const pick = options[Math.floor(Math.random() * options.length)];
    if (pick) onSelect(pick.id);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-700 text-sm">Select an avatar</h3>
        <button
          type="button"
          onClick={shuffle}
          className="text-xs font-medium text-violet-600 hover:text-violet-700"
        >
          ⟳ Shuffle
        </button>
      </div>

      <div className="flex bg-slate-100 rounded-lg p-1 mb-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setGender(tab.key)}
            className={[
              'flex-1 text-sm py-1.5 rounded-md transition',
              gender === tab.key ? 'bg-white shadow-sm text-violet-700 font-medium' : 'text-slate-500',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {options.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelect(preset.id)}
            className={[
              'rounded-lg p-1 border-2 transition',
              selectedId === preset.id ? 'border-violet-500' : 'border-transparent hover:border-slate-200',
            ].join(' ')}
          >
            <AvatarFace preset={preset} size={48} />
          </button>
        ))}
      </div>
    </div>
  );
}
