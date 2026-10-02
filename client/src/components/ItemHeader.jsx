import { useState } from 'react';
import JiraDrawer from './jira/JiraDrawer.jsx';
import jiraLogo from '../assets/icons/jira.png';
import viewLogo from '../assets/icons/view.png'
import openExternalLogo from '../assets/icons/open-external.png'
import chevronRightLogo from '../assets/icons/chevron-right.png'

const TITLE_CHAR_LIMIT = 50;

function truncateTitle(title) {
  if (!title || title.length <= TITLE_CHAR_LIMIT) return title;
  return `${title.slice(0, TITLE_CHAR_LIMIT).trimEnd()}…`;
}

function ImportedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0">
      <rect x="2" y="2" width="16" height="16" rx="4" fill="#EEEDFB" />
      <path d="M10 6.5v6M7.5 9.5l2.5 2.5 2.5-2.5" stroke="#5B4FE8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ItemHeader({ item, index, total, isHost, onNext, onManageItems }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!item) {
    return (
      <div className="bg-white border border-[#E4E1F2] rounded-[20px] shadow-[0_1px_2px_rgba(27,29,41,0.04)] p-10 flex flex-col items-center justify-center text-center gap-2 min-h-[360px]">
        <div className="flex items-center justify-center -space-x-4 mb-5">
          <div className="relative w-14 h-20 bg-violet-500 rounded-xl -rotate-12 shadow-md" />
          <div className="relative z-10 w-14 h-20 bg-violet-600 rounded-xl shadow-lg flex items-center justify-center">
            <span className="w-3 h-3 rounded-sm bg-amber-400 rotate-45" />
          </div>
          <div className="relative w-14 h-20 bg-violet-700 rounded-xl rotate-12 shadow-md" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">The table's ready</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          {isHost
            ? 'Pull in a story from the backlog and everyone can flip their estimate at once.'
            : 'Waiting for the host to add the first item.'}
        </p>
        {isHost && (
          <button onClick={onManageItems} className="btn-primary mt-3">
            Add an item to estimate
          </button>
        )}
      </div>
    );
  }

  // No live Jira fetch of any kind, for anyone — every item's data (if any) was
  // fetched once by the host at add-time and persisted on the item itself.
  const isImported = item.source === 'import';
  const title = item.imported?.title || null;
  const jiraUrl = item.imported?.url || null;

  return (
    <div className="bg-white border border-[#E4E1F2] rounded-[20px] shadow-[0_1px_2px_rgba(27,29,41,0.04)] p-4 flex items-center justify-between gap-2">
      <div className="flex-1 min-w-0 flex items-center justify-start gap-3">
        {isImported ? <ImportedIcon /> : <img src={jiraLogo} alt="Jira" className="w-5 h-5 shrink-0" />}
        <h2 className="text-lg font-semibold text-slate-700 truncate flex items-center gap-2" title={title || undefined}>
          <span>{item.name}</span>
          {title && <span className="font-semibold text-slate-700 truncate">: {truncateTitle(title)}</span>}
        </h2>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => setDrawerOpen(true)} className="btn-secondary shrink-0">
          <img src={viewLogo} alt="" className="w-5 h-5 shrink-0" />
          View
        </button>
        {!isImported && jiraUrl && (
          <a href={jiraUrl} target="_blank" rel="noreferrer" className="btn-secondary shrink-0 no-underline">
            <img src={openExternalLogo} alt="" className="w-5 h-5 shrink-0" />
            Open in Jira
          </a>
        )}
      </div>

      {isHost && (
        <button
          onClick={onNext}
          disabled={index >= total - 1}
          className="btn-primary shrink-0 disabled:opacity-30"
        >
          Next <img src={chevronRightLogo} alt="" className="w-5 h-5 shrink-0" />
        </button>
      )}

      <JiraDrawer item={item} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
