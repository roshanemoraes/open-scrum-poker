import { useEffect, useState } from 'react';
import { CloseIcon, ExternalLinkIcon, ChevronRightIcon } from '../Icons.jsx';
import AdfContent from './AdfContent.jsx';
import jiraLogo from '../../assets/icons/jira.png';

const VISIBLE_COUNT = 3;
// postAttributionComment (server/jira.js) always writes a single-paragraph,
// single-text-node comment ending in this suffix. Comments matching that shape
// are ours — render them as plain text plus the "via Planning Poker" pill
// instead of running them through the generic ADF renderer.
const ATTRIBUTION_SUFFIX = ' via Planning Poker';

function attributionText(body) {
  const paragraph = body?.content?.[0];
  const text = paragraph?.content?.[0];
  if (
    body?.content?.length === 1 &&
    paragraph?.type === 'paragraph' &&
    paragraph.content?.length === 1 &&
    text?.type === 'text' &&
    typeof text.text === 'string' &&
    text.text.endsWith(ATTRIBUTION_SUFFIX)
  ) {
    return text.text.slice(0, -ATTRIBUTION_SUFFIX.length);
  }
  return null;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function Sk({ w, h, mb = 0, radius }) {
  return <div className="jira-drawer-skel" style={{ width: w, height: h, marginBottom: mb, borderRadius: radius }} />;
}

function SkeletonBody() {
  return (
    <>
      <Sk w="58%" h={26} mb={22} />

      <Sk w={70} h={11} mb={8} />
      <Sk w={140} h={16} mb={26} />

      <Sk w={110} h={11} mb={16} />
      <Sk w="44%" h={15} mb={10} />
      <Sk w="96%" h={12} mb={8} />
      <Sk w="88%" h={12} mb={8} />
      <Sk w="92%" h={12} mb={22} />
      <Sk w="38%" h={15} mb={10} />
      <Sk w="90%" h={12} mb={8} />
      <Sk w="80%" h={12} mb={34} />

      <Sk w={130} h={11} mb={20} />

      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3.5 mb-[22px]">
          <Sk w={34} h={34} radius="50%" />
          <div className="flex-1">
            <Sk w={120} h={12} mb={9} />
            <Sk w="95%" h={11} mb={6} />
            <Sk w="70%" h={11} />
          </div>
        </div>
      ))}
    </>
  );
}

function CommentRow({ comment }) {
  const attributed = attributionText(comment.body);
  return (
    <div className="flex gap-3.5 mb-5">
      <div
        className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
        style={{ background: 'var(--accent)' }}
      >
        {(comment.author || '?').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-[3px]">
          <span className="text-[13.5px] font-bold">{comment.author}</span>
          <span className="text-xs" style={{ color: '#B3B6C2' }}>{formatDate(comment.created)}</span>
        </div>
        <div className="text-[13.5px] leading-[1.5]" style={{ color: '#4B4F5E' }}>
          {attributed != null ? attributed : <AdfContent doc={comment.body} />}
          {attributed != null && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full ml-1.5 px-2 py-0.5"
              style={{ color: 'var(--accent)', background: '#EEF0FF' }}
            >
              via Planning Poker
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JiraDrawer({ issueKey, open, onClose }) {
  const [state, setState] = useState({ loading: false, error: null, issue: null });
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  useEffect(() => {
    if (!open || !issueKey) return;
    let cancelled = false;
    setState({ loading: true, error: null, issue: null });
    setCommentsOpen(false);
    setShowAllComments(false);

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

  const comments = state.issue?.comments || [];
  const visibleComments = showAllComments ? comments : comments.slice(0, VISIBLE_COUNT);
  const remaining = comments.length - visibleComments.length;

  return (
    <>
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 z-40 transition-opacity',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        style={{ background: 'rgba(20,20,30,0.32)' }}
      />
      <div
        className={[
          'fixed top-0 right-0 bottom-0 w-full max-w-xl bg-white z-50 transition-transform duration-300 ease-in-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        style={{ boxShadow: '-8px 0 32px rgba(20,20,40,0.14)' }}
      >
        <div className="flex items-center justify-between px-7 py-[18px] border-b shrink-0" style={{ borderColor: '#EEEFF4' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: '#EEF0FF' }}>
              <img src={jiraLogo} alt="" className="w-3.5 h-3.5" />
            </span>
            <span className="text-[15px] font-bold truncate" style={{ color: '#6B6F80' }}>{issueKey}</span>
          </div>
          <div className="flex items-center gap-[18px] shrink-0">
            {state.issue?.url && (
              <a href={state.issue.url} target="_blank" rel="noreferrer" className="btn-secondary no-underline">
                <ExternalLinkIcon width={14} height={14} strokeWidth={2.2} /> Open in Jira
              </a>
            )}
            <button onClick={onClose} aria-label="Close" className="w-[30px] h-[30px] rounded-lg flex items-center justify-center hover:bg-slate-100">
              <CloseIcon width={17} height={17} style={{ color: '#6B6F80' }} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        <div className="jira-drawer-scroll flex-1 overflow-y-auto px-7 pt-[26px] pb-[60px]">
          {state.loading && <SkeletonBody />}
          {state.error && <p className="text-sm text-red-500">{state.error}</p>}

          {state.issue && !state.loading && (
            <>
              <h1 className="text-2xl font-semibold mb-5" style={{ color: '#1E2130' }}>{state.issue.summary}</h1>

              <div
                className="flex items-center gap-7 px-4 py-3.5 rounded-xl mb-7"
                style={{ background: '#FAFAFD', border: '1px solid #EEEFF4' }}
              >
                <div>
                  <div className="text-[11px] font-bold uppercase mb-1" style={{ color: '#9CA0AE', letterSpacing: '0.04em' }}>
                    Assignee
                  </div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: state.issue.assignee === 'Unassigned' ? '#B3B6C2' : '#1E2130' }}
                  >
                    {state.issue.assignee}
                  </div>
                </div>
              </div>

              {state.issue.description && (
                <>
                  <div className="text-xs font-extrabold mb-3.5" style={{ color: '#6B6F80', letterSpacing: '0.05em' }}>
                    DESCRIPTION
                  </div>
                  <AdfContent doc={state.issue.description} />
                </>
              )}

              <div className="h-px my-7" style={{ background: '#EEEFF4' }} />

              <button
                type="button"
                onClick={() => setCommentsOpen((v) => !v)}
                className="w-full bg-none border-none p-0 flex items-center justify-between cursor-pointer"
                style={{ marginBottom: commentsOpen ? 18 : 0 }}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-xs font-extrabold" style={{ color: '#6B6F80', letterSpacing: '0.05em' }}>COMMENTS</span>
                  <span className="text-[11px] font-bold rounded-full px-[9px] py-0.5" style={{ background: '#EEEFF4', color: '#6B6F80' }}>
                    {comments.length}
                  </span>
                </span>
                <ChevronRightIcon
                  width={16}
                  height={16}
                  strokeWidth={2.4}
                  style={{ color: '#9CA0AE', transform: `rotate(${commentsOpen ? 90 : 0}deg)`, transition: 'transform .15s' }}
                />
              </button>

              {commentsOpen && comments.length > 0 && (
                <div>
                  {visibleComments.map((c) => <CommentRow key={c.id} comment={c} />)}

                  {remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllComments(true)}
                      className="w-full rounded-[10px] py-[11px] text-[13.5px] font-bold"
                      style={{ background: '#F8F7FD', border: '1px solid #EEEFF4', color: 'var(--accent)' }}
                    >
                      Load all comments ({remaining} more)
                    </button>
                  )}
                  {showAllComments && remaining === 0 && comments.length > VISIBLE_COUNT && (
                    <button
                      type="button"
                      onClick={() => setShowAllComments(false)}
                      className="w-full bg-none border-none text-[13px] font-bold py-1.5"
                      style={{ color: '#9CA0AE' }}
                    >
                      Show latest {VISIBLE_COUNT} only
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
