// Parses a Jira "Export Issues (CSV, all fields)" export into plain item rows for the
// Import Items flow. Column names repeat for multi-value Jira fields (Comment x10,
// Components x4, etc.), so we index columns by name -> array of positions rather than
// assuming uniqueness, and only read the handful of columns this feature actually uses.

// Jira's CSV comment cells are "date;accountId;body" — split on the first two
// semicolons only, since the body itself may contain ';' (URLs, prose, code).
function parseCommentCell(cell) {
  if (!cell || !cell.trim()) return null;
  const first = cell.indexOf(';');
  if (first === -1) return null;
  const second = cell.indexOf(';', first + 1);
  if (second === -1) return null;
  const date = cell.slice(0, first).trim();
  const body = cell.slice(second + 1).trim();
  if (!body) return null;
  return { date, body };
}

// Quote-aware CSV parser: handles quoted fields containing commas, newlines, and
// escaped ("") quotes — all present in real Jira exports (multi-line descriptions,
// comments with embedded punctuation).
function parseCsvText(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\r') {
      // ignore — paired \n (or lone \r) handled below
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Returns { items, skipped } — items ready to send via the "import-items" socket
// event; skipped is a list of { row, reason } for rows that couldn't be used (mainly
// a missing Issue key), so the modal can tell the host what didn't make it in.
export function parseJiraExportCsv(text) {
  const stripped = text.replace(/^﻿/, ''); // Excel/Jira exports are UTF-8 BOM-prefixed
  const rows = parseCsvText(stripped).filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
  if (rows.length === 0) return { items: [], skipped: [] };

  const header = rows[0];
  const colIndexes = (name) => {
    const idxs = [];
    header.forEach((h, i) => { if (h === name) idxs.push(i); });
    return idxs;
  };

  const keyIdx = colIndexes('Issue key')[0];
  const summaryIdx = colIndexes('Summary')[0];
  const assigneeIdx = colIndexes('Assignee')[0];
  const acIdx = colIndexes('Custom field (Acceptance Criteria)')[0];
  const commentIdxs = colIndexes('Comment');

  if (keyIdx == null) {
    return { items: [], skipped: [{ row: 0, reason: 'No "Issue key" column found in this file.' }] };
  }

  const items = [];
  const skipped = [];

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const name = cells[keyIdx]?.trim();
    if (!name) {
      skipped.push({ row: r + 1, reason: 'Missing Issue key' });
      continue;
    }

    const comments = commentIdxs
      .map((i) => parseCommentCell(cells[i]))
      .filter(Boolean);

    items.push({
      name,
      title: summaryIdx != null ? (cells[summaryIdx] || '').trim() : '',
      assignee: assigneeIdx != null ? (cells[assigneeIdx] || '').trim() : '',
      acceptanceCriteria: acIdx != null ? (cells[acIdx] || '').trim() : '',
      comments,
    });
  }

  return { items, skipped };
}
