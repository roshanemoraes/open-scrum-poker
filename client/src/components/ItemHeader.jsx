import { useEffect, useState } from 'react';
import { getJiraBaseUrl } from './jira/jiraConfig.js';
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

export default function ItemHeader({ item, index, total, isHost, onNext, onManageItems, canNavigate = true }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [title, setTitle] = useState(null);

  useEffect(() => {
    setTitle(null);
    if (!item) return;
    let cancelled = false;

    fetch(`/api/jira/${encodeURIComponent(item.name)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => !cancelled && setTitle(data?.summary || null))
      .catch(() => !cancelled && setTitle(null));

    return () => {
      cancelled = true;
    };
  }, [item?.name]);

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

  async function openInJira() {
    const baseUrl = await getJiraBaseUrl();
    if (!baseUrl) return;
    window.open(`${baseUrl}/browse/${encodeURIComponent(item.name)}`, '_blank', 'noopener');
  }

  return (
    <div className="bg-white border border-[#E4E1F2] rounded-[20px] shadow-[0_1px_2px_rgba(27,29,41,0.04)] p-4 flex items-center justify-between gap-2">
      <div className="flex-1 min-w-0 flex items-center justify-start gap-3">
        <img src={jiraLogo} alt="Jira" className="w-5 h-5 shrink-0" />
        <h2 className="text-lg font-semibold text-slate-700 truncate" title={title || undefined}>
          {item.name}
          {title && <span className="font-semibold text-slate-700">: {truncateTitle(title)}</span>}
        </h2>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setDrawerOpen(true)}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium bg-[#F5F4FB] hover:bg-[#EFEDFC] text-[#4A4763] rounded-lg px-3 py-1.5"
        >
          <img src={viewLogo} alt="" className="w-5 h-5 shrink-0" />
          View
        </button>
        <button
          onClick={openInJira}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium bg-[#F5F4FB] hover:bg-[#EFEDFC] text-[#4A4763] rounded-lg px-3 py-1.5"
        >
          {/* <ExternalLinkIcon width={14} height={14} /> */}
          <img src={openExternalLogo} alt="" className="w-5 h-5 shrink-0" />
          Open in Jira
        </button>
      </div>

      {isHost && (
        <button
          onClick={onNext}
          disabled={index >= total - 1 || !canNavigate}
          title={!canNavigate ? 'Set final values for this item before moving on' : undefined}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 shrink-0"
        >
          Next <img src={chevronRightLogo} alt="" className="w-5 h-5 shrink-0" />
        </button>
      )}

      <JiraDrawer issueKey={item.name} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
