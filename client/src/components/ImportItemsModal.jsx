import { useState } from 'react';
import { parseJiraExportCsv } from '../lib/csvImport.js';

// Exact palette/typography from ManageSession.dc.html, reused here for visual
// consistency with the rest of the Manage session card.
const SPACE_GROTESK = { fontFamily: "'Space Grotesk', sans-serif" };
const PLEX_SANS = { fontFamily: "'IBM Plex Sans', sans-serif" };

export default function ImportItemsModal({ open, onClose, onImport }) {
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState(null); // { items, skipped }
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  if (!open) return null;

  function reset() {
    setFileName('');
    setParsed(null);
    setError('');
    setImporting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setParsed(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const result = parseJiraExportCsv(text);
      if (result.items.length === 0) {
        setError('No importable rows found — make sure this is a Jira "Export Issues (CSV, all fields)" file.');
        return;
      }
      setParsed(result);
    } catch {
      setError("Couldn't read that file.");
    }
  }

  function handleImport() {
    if (!parsed || parsed.items.length === 0) return;
    setImporting(true);
    onImport(parsed.items);
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={handleClose}>
      <div
        className="bg-white border border-[#E4E1F2] rounded-[20px] shadow-[0_12px_32px_rgba(27,29,41,0.14),0_1px_2px_rgba(27,29,41,0.06)] w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={PLEX_SANS}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4E1F2]">
          <h2 className="text-[18px] font-bold text-[#1B1D29]" style={SPACE_GROTESK}>Import items</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-[#F5F4FB] flex items-center justify-center text-[#6E6B85] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="#6E6B85" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3 p-6">
          <p className="text-[13.5px] text-[#6E6B85]">
            Upload a Jira "Export Issues (CSV, all fields)" file to add its items without needing a live Jira
            connection. Descriptions come from each issue's Acceptance Criteria field.
          </p>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#E4E1F2] rounded-[14px] py-8 cursor-pointer hover:bg-[#F5F4FB] transition-colors">
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            <span className="text-[14px] font-semibold text-[#4A4763]">
              {fileName || 'Choose a CSV file'}
            </span>
            <span className="text-[12.5px] text-[#9CA0AE]">Click to browse</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {parsed && (
            <div className="rounded-[10px] bg-[#F5F4FB] px-4 py-3 text-[13.5px]">
              <p className="font-semibold text-[#1B1D29]">{parsed.items.length} item{parsed.items.length === 1 ? '' : 's'} ready to import</p>
              {parsed.skipped.length > 0 && (
                <p className="text-[#8A6A15] mt-1">{parsed.skipped.length} row{parsed.skipped.length === 1 ? '' : 's'} skipped (missing Issue key).</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="text-[13.5px] font-semibold text-[#4A4763] px-[14px] py-2 rounded-[9px] hover:bg-[#F5F4FB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!parsed || parsed.items.length === 0 || importing}
              className="text-[13.5px] font-semibold bg-[#5B4FE8] hover:bg-[#4038B8] text-white px-[18px] py-2 rounded-[9px] disabled:opacity-50 transition-colors"
            >
              Import{parsed ? ` ${parsed.items.length} item${parsed.items.length === 1 ? '' : 's'}` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
