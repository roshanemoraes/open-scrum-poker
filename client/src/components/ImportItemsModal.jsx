import { useRef, useState } from 'react';
import { parseJiraExportCsv } from '../lib/csvImport.js';
import { searchJiraIssues } from '../lib/api.js';
import { getJiraBaseUrl } from './jira/jiraConfig.js';

// Exact palette/typography from "Import items – JQL tab".dc.html.
const NUNITO = { fontFamily: "'Nunito Sans', 'Segoe UI', system-ui, sans-serif" };
const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };

const RECENTS_KEY = 'osp_recent_jql';
const MAX_RECENTS = 5;
const MAX_RESULTS = 100;
const MAX_CSV_BYTES = 5 * 1024 * 1024;

const ISSUE_SEARCH_JQL = 'project = "PRB" AND sprint IN (EMPTY)\nORDER BY key ASC, status DESC, "cf[10812]" ASC, created DESC';

function loadRecents() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((q) => typeof q === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecent(jql) {
  try {
    const trimmed = jql.trim();
    const next = [trimmed, ...loadRecents().filter((q) => q !== trimmed)].slice(0, MAX_RECENTS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadRecents();
  }
}

// Exact status -> color mapping from the mock. Anything else falls back to neutral.
function statusColors(status) {
  if (status === 'READY FOR SPRINT') return ['#E3F4EA', '#1C6B3D'];
  if (status === 'Dev in Progress') return ['#E4ECFF', '#2A48A8'];
  if (status === 'GROOMING') return ['#FDF1DC', '#8A5A00'];
  return ['#EEF0F9', '#3A3F5C'];
}

const tabBase = { height: 44, padding: '0 16px', border: 0, background: 'transparent', font: 'inherit', fontSize: 15, marginBottom: -1 };
const tabOn = { ...tabBase, fontWeight: 800, color: '#3F37C9', borderBottom: '3px solid #5046E5' };
const tabOff = { ...tabBase, fontWeight: 600, color: '#5A6080', borderBottom: '3px solid transparent', cursor: 'pointer' };

export default function ImportItemsModal({ open, onClose, onImportCsv, onAddJiraItems, hostToken, roomItems }) {
  const [tab, setTab] = useState('jql');

  const [jql, setJql] = useState('');
  const [recents, setRecents] = useState(loadRecents);
  const [showRecent, setShowRecent] = useState(false);
  const [searching, setSearching] = useState(false);
  const [jqlError, setJqlError] = useState('');
  const [results, setResults] = useState(null); // array | null
  const [selected, setSelected] = useState(new Set());

  const [fileName, setFileName] = useState('');
  const [parsedCsv, setParsedCsv] = useState(null); // { items, skipped }
  const [csvError, setCsvError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const existingNames = new Set((roomItems || []).map((i) => i.name.toLowerCase()));

  function resetJql() {
    setJqlError('');
    setResults(null);
    setSelected(new Set());
    setShowRecent(false);
  }

  function resetCsv() {
    setFileName('');
    setParsedCsv(null);
    setCsvError('');
    setDragOver(false);
  }

  function handleClose() {
    resetJql();
    resetCsv();
    setJql('');
    onClose();
  }

  async function runQuery() {
    const trimmed = jql.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    setJqlError('');
    try {
      const items = await searchJiraIssues(hostToken, trimmed);
      setResults(items);
      const selectable = items.filter((it) => !existingNames.has(it.key.toLowerCase()));
      setSelected(new Set(selectable.map((it) => it.key)));
      setRecents(saveRecent(trimmed));
    } catch (err) {
      setJqlError(err.message);
      setResults(null);
    } finally {
      setSearching(false);
      setShowRecent(false);
    }
  }

  function toggleOne(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const selectableResults = (results || []).filter((it) => !existingNames.has(it.key.toLowerCase()));
  const allSelected = selectableResults.length > 0 && selected.size === selectableResults.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectableResults.map((it) => it.key)));
  }

  async function openJiraIssueSearch(e) {
    e.preventDefault();
    const baseUrl = await getJiraBaseUrl();
    if (!baseUrl) return;
    window.open(`${baseUrl}/issues/?jql=${encodeURIComponent(ISSUE_SEARCH_JQL)}`, '_blank', 'noopener');
  }

  function handleJqlKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runQuery();
    }
  }

  async function handleCsvFile(file) {
    if (!file) return;
    setCsvError('');
    setParsedCsv(null);
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Please choose a .csv file.');
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setCsvError('That file is larger than 5 MB.');
      return;
    }

    try {
      const text = await file.text();
      const result = parseJiraExportCsv(text);
      if (result.items.length === 0) {
        setCsvError('No importable rows found — make sure this is a Jira "Export Issues (CSV, all fields)" file.');
        return;
      }
      setParsedCsv(result);
    } catch {
      setCsvError("Couldn't read that file.");
    }
  }

  function handleAdd() {
    if (tab === 'jql') {
      if (selected.size === 0) return;
      onAddJiraItems(Array.from(selected));
    } else {
      if (!parsedCsv || parsedCsv.items.length === 0) return;
      onImportCsv(parsedCsv.items);
    }
    handleClose();
  }

  const showResults = tab === 'jql' && results != null && !jqlError;
  const dupCount = results ? results.length - selectableResults.length : 0;
  const addDisabled = tab === 'jql' ? selected.size === 0 : !parsedCsv || parsedCsv.items.length === 0;
  const addLabel =
    tab === 'jql'
      ? showResults
        ? `Add ${selected.size} item${selected.size === 1 ? '' : 's'}`
        : 'Add items'
      : parsedCsv
        ? `Add ${parsedCsv.items.length} item${parsedCsv.items.length === 1 ? '' : 's'}`
        : 'Add items';
  const footerNote =
    tab === 'jql'
      ? showResults
        ? `${selected.size} selected`
        : 'Run the query to preview issues'
      : parsedCsv
        ? `${parsedCsv.items.length} item${parsedCsv.items.length === 1 ? '' : 's'} ready`
        : 'Upload a file to preview issues';

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(20,22,48,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 56, zIndex: 1000 }}
      onClick={handleClose}
    >
      <section
        aria-label="Import items"
        style={{ width: 860, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 80px)', background: '#fff', borderRadius: 18, boxShadow: '0 24px 64px rgba(15,17,40,0.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...NUNITO, color: '#1F2340' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px 0 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Import items</h2>
            <span style={{ fontSize: 14, color: '#5A6080' }}>New items are added to the end of the list. The current item stays selected.</span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={handleClose}
            style={{ width: 44, height: 44, border: 0, background: 'transparent', borderRadius: 10, color: '#5A6080', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div role="tablist" style={{ display: 'flex', gap: 4, padding: '18px 28px 0 28px', borderBottom: '1px solid #E3E6F2' }}>
          <button type="button" role="tab" aria-selected={tab === 'jql'} onClick={() => setTab('jql')} style={tab === 'jql' ? tabOn : tabOff}>
            Jira query (JQL)
          </button>
          <button type="button" role="tab" aria-selected={tab === 'csv'} onClick={() => setTab('csv')} style={tab === 'csv' ? tabOn : tabOff}>
            Upload CSV
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'jql' && (
            <>
              <div style={{ padding: '22px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="jql" style={{ fontWeight: 700, fontSize: 15 }}>JQL query</label>
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setShowRecent((v) => !v)}
                      style={{ height: 36, padding: '0 12px', border: '1px solid #DCDFEB', background: '#fff', borderRadius: 8, font: 'inherit', fontSize: 13, fontWeight: 600, color: '#3A3F5C', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                      Recent queries
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {showRecent && (
                      <div style={{ position: 'absolute', right: 0, top: 42, width: 420, background: '#fff', border: '1px solid #DCDFEB', borderRadius: 10, boxShadow: '0 12px 32px rgba(15,17,40,0.16)', padding: 6, display: 'flex', flexDirection: 'column', zIndex: 5 }}>
                        {recents.length === 0 ? (
                          <span style={{ padding: '10px 12px', fontSize: 13, color: '#9098B8' }}>No recent queries yet.</span>
                        ) : (
                          recents.map((q, i) => (
                            <button
                              type="button"
                              key={i}
                              onClick={() => { setJql(q); setShowRecent(false); }}
                              style={{ textAlign: 'left', border: 0, background: 'transparent', padding: '10px 12px', borderRadius: 8, font: 'inherit', cursor: 'pointer' }}
                            >
                              <span style={{ fontSize: 13, ...MONO, color: '#3A3F5C', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                {q.split('\n')[0]}{q.includes('\n') ? ' …' : ''}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <textarea
                  id="jql"
                  value={jql}
                  onChange={(e) => setJql(e.target.value)}
                  onKeyDown={handleJqlKeyDown}
                  spellCheck={false}
                  placeholder={'project = "PRB" AND sprint = 6103\nORDER BY key ASC'}
                  style={{
                    width: '100%', boxSizing: 'border-box', minHeight: 132, resize: 'vertical', padding: '14px 16px', borderRadius: 10,
                    ...MONO, fontSize: 13.5, lineHeight: 1.6, color: '#1F2340', background: '#FBFBFE',
                    border: `1px solid ${jqlError ? '#D6454B' : '#DCDFEB'}`,
                  }}
                />
                {jqlError && (
                  <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FDECEC', border: '1px solid #F2B8BA', borderRadius: 10, padding: '12px 14px', color: '#8E1C21', fontSize: 14 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontWeight: 700 }}>Jira couldn't run this query</span>
                      <span style={{ ...MONO, fontSize: 13 }}>{jqlError}</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#5A6080' }}>
                    Build or test it in{' '}
                    <a
                      href="#jira-issue-search"
                      onClick={openJiraIssueSearch}
                      style={{ color: '#4338CA', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      Jira issue search
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <path d="M15 3h6v6" />
                        <path d="M10 14L21 3" />
                      </svg>
                    </a>
                    {' '}· Ctrl + Enter to run
                  </span>
                  <button
                    type="button"
                    onClick={runQuery}
                    disabled={!jql.trim() || searching}
                    style={{ height: 44, padding: '0 20px', border: '1px solid #5046E5', background: '#fff', color: '#4338CA', borderRadius: 10, font: 'inherit', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: !jql.trim() || searching ? 0.5 : 1 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5l12 7-12 7z" /></svg>
                    {searching ? 'Running…' : 'Run query'}
                  </button>
                </div>
              </div>

              {showResults && (
                <div style={{ margin: '18px 28px 0 28px', border: '1px solid #E3E6F2', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#F6F7FC', borderBottom: '1px solid #E3E6F2' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, cursor: selectableResults.length ? 'pointer' : 'default' }}>
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={selectableResults.length === 0} style={{ width: 18, height: 18, accentColor: '#5046E5' }} />
                      {results.length} issue{results.length === 1 ? '' : 's'} found · {dupCount} already in session
                    </label>
                    <span style={{ fontSize: 13, color: '#5A6080' }}>Order follows your ORDER BY · max {MAX_RESULTS} results</span>
                  </div>
                  <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {results.map((it) => {
                      const dup = existingNames.has(it.key.toLowerCase());
                      const checked = !dup && selected.has(it.key);
                      const [bg, color] = statusColors(it.status);
                      return (
                        <label
                          key={it.key}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px', borderBottom: '1px solid #EEF0F6',
                            cursor: dup ? 'default' : 'pointer', opacity: dup ? 0.5 : 1, background: dup ? '#FAFAFC' : checked ? '#fff' : '#FAFBFE',
                          }}
                        >
                          <input type="checkbox" checked={checked} disabled={dup} onChange={() => toggleOne(it.key)} style={{ width: 18, height: 18, accentColor: '#5046E5', flexShrink: 0 }} />
                          <span style={{ width: 72, flexShrink: 0, ...MONO, fontSize: 13, fontWeight: 500 }}>{it.key}</span>
                          <span style={{ flex: 1, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.summary}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#3A3F5C', background: '#EEF0F9', padding: '3px 9px', borderRadius: 10, flexShrink: 0 }}>{it.type}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 10, flexShrink: 0, background: bg, color }}>{it.status}</span>
                          {dup && <span style={{ fontSize: 12, fontWeight: 700, color: '#5A6080', flexShrink: 0 }}>Already added</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'csv' && (
            <div style={{ padding: '22px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleCsvFile(e.dataTransfer.files?.[0]);
                }}
                style={{
                  border: `2px dashed ${dragOver ? '#5046E5' : '#C9CDE3'}`, borderRadius: 14, padding: '48px 24px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
                  background: dragOver ? '#F6F7FC' : 'transparent', transition: 'background-color .15s, border-color .15s',
                }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5046E5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{fileName || 'Drop a Jira CSV export here'}</span>
                <span style={{ fontSize: 14, color: '#5A6080' }}>
                  or{' '}
                  <a href="#browse" onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}>
                    browse your files
                  </a>{' '}
                  · .csv up to 5 MB
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleCsvFile(e.target.files?.[0])}
                  style={{ display: 'none' }}
                />
              </div>
              {csvError && <p style={{ color: '#D6454B', fontSize: 14, margin: 0 }}>{csvError}</p>}
              {parsedCsv && !csvError && (
                <p style={{ fontSize: 13, color: '#5A6080', margin: 0 }}>
                  {parsedCsv.items.length} item{parsedCsv.items.length === 1 ? '' : 's'} ready to import
                  {parsedCsv.skipped.length > 0 && ` · ${parsedCsv.skipped.length} row${parsedCsv.skipped.length === 1 ? '' : 's'} skipped (missing Issue key)`}
                </p>
              )}
              <span style={{ fontSize: 13, color: '#5A6080' }}>Export from Jira → Issue search → Export → CSV (current fields).</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', marginTop: 22, borderTop: '1px solid #E3E6F2', background: '#FAFBFE' }}>
          <span style={{ fontSize: 14, color: '#5A6080' }}>{footerNote}</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={handleClose}
              style={{ height: 48, padding: '0 22px', border: '1px solid #DCDFEB', background: '#fff', borderRadius: 10, font: 'inherit', fontWeight: 700, fontSize: 15, color: '#3A3F5C', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={addDisabled}
              style={{ height: 48, padding: '0 24px', border: 0, borderRadius: 10, font: 'inherit', fontWeight: 800, fontSize: 15, color: '#fff', background: addDisabled ? '#A9A6E8' : '#4A40D9', cursor: addDisabled ? 'default' : 'pointer' }}
            >
              {addLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
