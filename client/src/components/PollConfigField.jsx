import { CUSTOM_OPTION_ID, VOTING_PRESETS, presetLabel } from '../lib/votingSystems.js';

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
        checked ? 'bg-violet-600' : 'bg-slate-300',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

export default function PollConfigField({ label, enabled, onToggle, presetId, onPresetChange, customName, onCustomNameChange, customValues, onCustomValuesChange }) {
  return (
    <div className="border border-slate-200 rounded-xl p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <Switch checked={enabled} onChange={onToggle} label={`${label} voting`} />
      </div>

      {enabled && (
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-500">Voting system</label>
          <select
            value={presetId}
            onChange={(e) => onPresetChange(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus:border-violet-400 bg-white"
          >
            {VOTING_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>{presetLabel(preset)}</option>
            ))}
            <option value={CUSTOM_OPTION_ID}>Create custom system…</option>
          </select>

          {presetId === CUSTOM_OPTION_ID && (
            <div className="flex flex-col gap-2 pt-1">
              <input
                value={customName}
                onChange={(e) => onCustomNameChange(e.target.value)}
                placeholder="System name (optional)"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus:border-violet-400"
              />
              <input
                value={customValues}
                onChange={(e) => onCustomValuesChange(e.target.value)}
                placeholder="Comma-separated values, e.g. 1, 2, 3, 5, 8"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus:border-violet-400"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
