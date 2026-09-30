// Renders Jira's legacy wiki markup (used in CSV-exported "Acceptance Criteria" and
// comment bodies — a different format from the ADF the live Jira REST API returns,
// see AdfContent.jsx for that one). Covers what actually shows up in a Jira export:
// headings (h1.-h6.), nested bullet/numbered lists (*, **, #, #*, ...), code blocks
// ({code}...{code}), and inline bold/italic/monospace, links, and @mentions.
//
// This is a best-effort line-based parser, not a full grammar — real Jira markup has
// ambiguities (e.g. "_" for italic vs. underscores inside identifiers) this doesn't
// perfectly resolve. Good enough for rendering exported content readably.

function renderInline(text, keyPrefix) {
  const nodes = [];
  let buf = '';
  let key = 0;
  const flush = () => {
    if (buf) {
      nodes.push(<span key={`${keyPrefix}-t${key++}`}>{buf}</span>);
      buf = '';
    }
  };

  let i = 0;
  while (i < text.length) {
    // Monospace: {{code}}
    if (text[i] === '{' && text[i + 1] === '{') {
      const end = text.indexOf('}}', i + 2);
      if (end !== -1) {
        flush();
        nodes.push(
          <code key={`${keyPrefix}-c${key++}`} className="bg-slate-100 rounded px-1 py-0.5 text-[0.9em]">
            {text.slice(i + 2, end)}
          </code>
        );
        i = end + 2;
        continue;
      }
    }

    // Mention: [~accountid:XXXX] — no display name available offline, so just a chip.
    if (text[i] === '[' && text.startsWith('[~accountid:', i)) {
      const end = text.indexOf(']', i);
      if (end !== -1) {
        flush();
        nodes.push(
          <span
            key={`${keyPrefix}-m${key++}`}
            className="inline-flex items-center text-[0.9em] font-medium rounded px-1"
            style={{ color: 'var(--accent)', background: '#EEF0FF' }}
          >
            @mention
          </span>
        );
        i = end + 1;
        continue;
      }
    }

    // Link: [text|url] or [text|url|smart-link] or bare [url]
    if (text[i] === '[') {
      const end = text.indexOf(']', i);
      if (end !== -1) {
        const inner = text.slice(i + 1, end);
        const parts = inner.split('|');
        flush();
        if (parts.length >= 2) {
          nodes.push(
            <a key={`${keyPrefix}-l${key++}`} href={parts[1]} target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>
              {parts[0]}
            </a>
          );
        } else if (/^https?:\/\//.test(inner)) {
          nodes.push(
            <a key={`${keyPrefix}-l${key++}`} href={inner} target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>
              {inner}
            </a>
          );
        } else {
          nodes.push(<span key={`${keyPrefix}-t${key++}`}>[{inner}]</span>);
        }
        i = end + 1;
        continue;
      }
    }

    // Bold: *text*
    if (text[i] === '*') {
      const end = text.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        flush();
        nodes.push(<strong key={`${keyPrefix}-b${key++}`}>{text.slice(i + 1, end)}</strong>);
        i = end + 1;
        continue;
      }
    }

    // Italic: _text_ (only when hugging non-space content, to avoid catching stray
    // underscores inside identifiers like "SBI_UI_Revamp")
    if (text[i] === '_' && /\S/.test(text[i + 1] || '')) {
      const end = text.indexOf('_', i + 1);
      if (end !== -1 && end > i + 1 && /\S/.test(text[end - 1])) {
        flush();
        nodes.push(<em key={`${keyPrefix}-i${key++}`}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }

    buf += text[i];
    i++;
  }
  flush();
  return nodes;
}

// Groups a run of list-marker lines into a (possibly nested) list. entries:
// [{ depth, ordered, text }]. Returns [listNode, nextIndex].
function buildList(entries, startIndex, depth, keyPrefix) {
  const ordered = entries[startIndex].ordered;
  const items = [];
  let i = startIndex;

  while (i < entries.length && entries[i].depth === depth && entries[i].ordered === ordered) {
    const li = { text: entries[i].text, children: null };
    i++;
    if (i < entries.length && entries[i].depth > depth) {
      const [child, nextI] = buildList(entries, i, entries[i].depth, keyPrefix);
      li.children = child;
      i = nextI;
    }
    items.push(li);
  }

  const Tag = ordered ? 'ol' : 'ul';
  const node = (
    <Tag key={`${keyPrefix}-l${startIndex}`} className={ordered ? 'list-decimal pl-5 space-y-1' : 'list-disc pl-5 space-y-1'}>
      {items.map((li, idx) => (
        <li key={idx} className="text-[14.5px] leading-[1.6]" style={{ color: '#33364A' }}>
          {renderInline(li.text, `${keyPrefix}-l${startIndex}-${idx}`)}
          {li.children}
        </li>
      ))}
    </Tag>
  );
  return [node, i];
}

function renderListRun(entries, keyPrefix) {
  const blocks = [];
  let i = 0;
  while (i < entries.length) {
    const [node, nextI] = buildList(entries, i, entries[i].depth, `${keyPrefix}-${i}`);
    blocks.push(node);
    i = nextI;
  }
  return blocks;
}

const LIST_RE = /^([*#]+)\s+(.*)$/;
const HEADING_RE = /^h([1-6])\.\s*(.*)$/;
// {code} (optionally {code:lang}) and {noformat} both render as a plain monospace
// block with no inline formatting applied inside — {noformat} shows up a lot in
// comments pasting raw JSON/logs, where bold/italic/link parsing would just mangle it.
const CODE_START_RE = /^\{(code(?::[\w+-]*)?|noformat)\}$/;

export default function WikiMarkupContent({ text }) {
  if (!text || !text.trim()) return null;

  const lines = text.split('\n');
  const blocks = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const codeStart = line.trim().match(CODE_START_RE);
    if (codeStart) {
      const closeTag = `{${codeStart[1].split(':')[0]}}`;
      const codeLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== closeTag) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip the closing tag
      blocks.push(
        <pre key={`b${key++}`} className="bg-slate-100 rounded-[10px] p-3 text-xs overflow-x-auto">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      const Tag = `h${heading[1]}`;
      blocks.push(
        <Tag key={`b${key++}`} className="font-bold mt-2" style={{ color: '#1E2130' }}>
          {renderInline(heading[2], `b${key}`)}
        </Tag>
      );
      i++;
      continue;
    }

    if (LIST_RE.test(line)) {
      const entries = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (!m) break;
        entries.push({ depth: m[1].length, ordered: m[1][m[1].length - 1] === '#', text: m[2] });
        i++;
      }
      blocks.push(...renderListRun(entries, `b${key++}`));
      continue;
    }

    // Plain paragraph: consume consecutive non-blank, non-list, non-heading lines.
    const paraLines = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !LIST_RE.test(lines[i]) &&
      !HEADING_RE.test(lines[i]) &&
      !CODE_START_RE.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={`b${key++}`} className="text-[14.5px] leading-[1.65]" style={{ color: '#33364A' }}>
        {paraLines.map((l, idx) => (
          <span key={idx}>
            {renderInline(l, `b${key}-${idx}`)}
            {idx < paraLines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }

  return <div className="flex flex-col gap-2">{blocks}</div>;
}
