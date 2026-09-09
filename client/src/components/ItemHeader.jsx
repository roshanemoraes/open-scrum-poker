const JIRA_BASE = 'https://synergenhealth.atlassian.net/browse/';

export default function ItemHeader({ item, index, total, isHost, onPrev, onNext }) {
  if (!item) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4 text-center text-slate-400 text-sm">
        No active item yet.
      </div>
    );
  }

  const jiraUrl = JIRA_BASE + encodeURIComponent(item.name);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-3">
      {isHost && (
        <button
          onClick={onPrev}
          disabled={index <= 0}
          className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 disabled:opacity-30 shrink-0"
        >
          ← Prev
        </button>
      )}

      <div className="flex-1 min-w-0 flex items-center justify-center gap-3">
        <h2 className="text-lg font-semibold text-slate-700 truncate">{item.name}</h2>
        <a
          href={jiraUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-3 py-1.5"
        >
          View ↗
        </a>
      </div>

      {isHost && (
        <button
          onClick={onNext}
          disabled={index >= total - 1}
          className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 disabled:opacity-30 shrink-0"
        >
          Next →
        </button>
      )}
    </div>
  );
}
