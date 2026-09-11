import { useEffect, useState } from 'react';
import { CloseIcon, ExternalLinkIcon } from './Icons.jsx';
import AdfContent from './AdfContent.jsx';

const STATUS_STYLES = {
  new: 'bg-slate-100 text-slate-600',
  indeterminate: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
};

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function JiraDrawer({ issueKey, open, onClose }) {
  const [state, setState] = useState({ loading: false, error: null, issue: null });

  useEffect(() => {
    if (!open || !issueKey) return;
    let cancelled = false;
    setState({ loading: true, error: null, issue: null });

    fetch(`/api/jira/${encodeURIComponent(issueKey)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load issue');
        return body;
      })
      .then((issue) => !cancelled && setState({ loading: false, error: null, issue }))
      .catch((err) => !cancelled && setState({ loading: false, error: err.message, issue: null }));

    return () => {
      cancelled = true;
    };
  }, [open, issueKey]);

  return (
    <>
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 bg-black/30 transition-opacity z-40',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />
      <div
        className={[
          'fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{issueKey}</h2>
          <div className="flex items-center gap-2">
            {state.issue?.url && (
              <a
                href={state.issue.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-violet-600"
              >
                <ExternalLinkIcon width={14} height={14} /> Open in Jira
              </a>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
              <CloseIcon width={18} height={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {state.loading && <p className="text-sm text-slate-400">Loading…</p>}
          {state.error && <p className="text-sm text-red-500">{state.error}</p>}

          {state.issue && (
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-slate-800">{state.issue.summary}</h3>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Assignee</p>
                  <p className="text-slate-700">{state.issue.assignee}</p>
                </div>
              </div>

              {state.issue.description && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Description</p>
                  <AdfContent doc={state.issue.description} />
                </div>
              )}

              {state.issue.comments?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                    Comments ({state.issue.comments.length})
                  </p>
                  <div className="flex flex-col gap-3">
                    {state.issue.comments.map((c) => (
                      <div key={c.id} className="bg-slate-50 rounded-[10px] p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-600">{c.author}</span>
                          <span className="text-[10px] text-slate-400">{formatDate(c.created)}</span>
                        </div>
                        <AdfContent doc={c.body} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
