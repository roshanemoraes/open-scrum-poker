const COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#22c55e', '#eab308', '#ef4444', '#3b82f6'];

function colorFor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({ id, name, size = 40 }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: colorFor(id || name || ''), fontSize: size * 0.4 }}
      title={name}
    >
      {initials}
    </div>
  );
}
