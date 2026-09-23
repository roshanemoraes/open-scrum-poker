// Renders Atlassian Document Format (Jira's rich-text JSON) as real
// nested HTML, so descriptions/comments look like they do in Jira —
// numbered/bulleted lists nest correctly, bold/italic/links work, etc.
// Only the node types Jira commonly uses in descriptions are covered;
// anything unrecognized just renders its children (or is skipped).

function renderMarks(text, marks, key) {
  let node = text;
  for (const mark of marks || []) {
    switch (mark.type) {
      case 'strong':
        node = <strong key={key}>{node}</strong>;
        break;
      case 'em':
        node = <em key={key}>{node}</em>;
        break;
      case 'underline':
        node = <u key={key}>{node}</u>;
        break;
      case 'strike':
        node = <s key={key}>{node}</s>;
        break;
      case 'code':
        node = <code key={key} className="bg-slate-100 rounded px-1 py-0.5 text-[0.9em]">{node}</code>;
        break;
      case 'link':
        node = (
          <a key={key} href={mark.attrs?.href} target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--accent)' }}>
            {node}
          </a>
        );
        break;
      default:
        break;
    }
  }
  return node;
}

function renderInline(nodes) {
  return (nodes || []).map((node, i) => {
    if (node.type === 'text') return <span key={i}>{renderMarks(node.text, node.marks, i)}</span>;
    if (node.type === 'hardBreak') return <br key={i} />;
    if (node.type === 'mention') return <span key={i} className="font-medium" style={{ color: 'var(--accent)' }}>@{node.attrs?.text}</span>;
    if (node.type === 'emoji') return <span key={i}>{node.attrs?.text || ''}</span>;
    return null;
  });
}

// Collapses a list whose only content is a single textless listItem that
// itself contains nothing but another list — an indentation-only wrapper
// (seen when content is pasted/authored a certain way) that Jira's own
// renderer visually collapses into one bullet level instead of two.
function resolveList(node) {
  while (
    (node.type === 'bulletList' || node.type === 'orderedList') &&
    node.content?.length === 1 &&
    node.content[0].type === 'listItem' &&
    node.content[0].content?.length === 1 &&
    (node.content[0].content[0].type === 'bulletList' || node.content[0].content[0].type === 'orderedList')
  ) {
    node = node.content[0].content[0];
  }
  return node;
}

function AdfNode({ node, index }) {
  if (!node) return null;

  switch (node.type) {
    case 'doc':
      return <>{(node.content || []).map((n, i) => <AdfNode key={i} node={n} index={i} />)}</>;

    case 'paragraph':
      return <p className="text-[14.5px] leading-[1.65]" style={{ color: '#33364A' }}>{renderInline(node.content)}</p>;

    case 'heading': {
      const level = Math.min(Math.max(node.attrs?.level || 3, 1), 6);
      const Tag = `h${level}`;
      return <Tag className="font-bold mt-2" style={{ color: '#1E2130' }}>{renderInline(node.content)}</Tag>;
    }

    case 'bulletList': {
      const resolved = resolveList(node);
      if (resolved.type === 'orderedList') return <AdfNode node={resolved} />;
      return (
        <ul className="list-disc pl-11 mb-[22px] marker:text-[#9CA0AE]">
          {(resolved.content || []).map((n, i) => <AdfNode key={i} node={n} index={i} />)}
        </ul>
      );
    }

    case 'orderedList': {
      const resolved = resolveList(node);
      if (resolved.type === 'bulletList') return <AdfNode node={resolved} />;
      return (
        <ol start={resolved.attrs?.order || 1} className="list-decimal pl-5 space-y-1.5 marker:text-slate-400 marker:font-semibold">
          {(resolved.content || []).map((n, i) => <AdfNode key={i} node={n} index={i} />)}
        </ol>
      );
    }

    case 'listItem':
      return (
        <li className="text-[14.5px] leading-[1.65] mb-2" style={{ color: '#33364A' }}>
          {(node.content || []).map((n, i) => <AdfNode key={i} node={n} index={i} />)}
        </li>
      );

    case 'codeBlock':
      return (
        <pre className="bg-slate-100 rounded-[10px] p-3 text-xs overflow-x-auto">
          <code>{(node.content || []).map((n) => n.text).join('')}</code>
        </pre>
      );

    case 'blockquote':
      return (
        <blockquote className="border-l-2 border-violet-300 pl-3 text-slate-600 italic">
          {(node.content || []).map((n, i) => <AdfNode key={i} node={n} index={i} />)}
        </blockquote>
      );

    case 'rule':
      return <hr className="border-slate-200" />;

    case 'panel':
      return (
        <div className="bg-violet-50 border border-violet-100 rounded-[10px] p-3">
          {(node.content || []).map((n, i) => <AdfNode key={i} node={n} index={i} />)}
        </div>
      );

    default:
      return node.content ? <>{node.content.map((n, i) => <AdfNode key={i} node={n} index={i} />)}</> : null;
  }
}

export default function AdfContent({ doc }) {
  if (!doc) return null;
  return (
    <div className="flex flex-col gap-2">
      <AdfNode node={doc} />
    </div>
  );
}
