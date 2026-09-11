import { useEffect, useState } from 'react';
import { EyeIcon, ExternalLinkIcon } from './Icons.jsx';
import { getJiraBaseUrl } from '../lib/jiraConfig.js';
import JiraDrawer from './JiraDrawer.jsx';
import jiraLogo from '../assets/jira.png';
import eyeLogo from '../assets/eye.png'
import openInBrowserLogo from '../assets/open-in-browser.png'

const TITLE_CHAR_LIMIT = 50;

function truncateTitle(title) {
  if (!title || title.length <= TITLE_CHAR_LIMIT) return title;
  return `${title.slice(0, TITLE_CHAR_LIMIT).trimEnd()}…`;
}

export default function ItemHeader({ item, index, total, isHost, onNext, canNavigate = true }) {
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
      <div className="bg-white rounded-2xl shadow-sm p-4 text-center text-slate-400 text-sm">
        No active item yet.
      </div>
    );
  }

  async function openInJira() {
    const baseUrl = await getJiraBaseUrl();
    if (!baseUrl) return;
    window.open(`${baseUrl}/browse/${encodeURIComponent(item.name)}`, '_blank', 'noopener');
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between gap-2">
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
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-3 py-1.5"
        >
          <img src={eyeLogo} alt="eyeLogo" className="w-5 h-5 shrink-0" />
          View
        </button>
        <button
          onClick={openInJira}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-3 py-1.5"
        >
          {/* <ExternalLinkIcon width={14} height={14} /> */}
          <img src={openInBrowserLogo} alt="eyeLogo" className="w-5 h-5 shrink-0" />
          Open in Jira
        </button>
      </div>

      {isHost && (
        <button
          onClick={onNext}
          disabled={index >= total - 1 || !canNavigate}
          title={!canNavigate ? 'Set both RCI and Effort final values before moving on' : undefined}
          className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 disabled:opacity-30 shrink-0"
        >
          Next →
        </button>
      )}

      <JiraDrawer issueKey={item.name} open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
