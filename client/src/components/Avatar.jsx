import { presetForId } from '../lib/avatarPresets.js';

function Hair({ style, color }) {
  switch (style) {
    case 'bald':
      return null;
    case 'curly':
      return (
        <g fill={color}>
          <circle cx="9" cy="12" r="4.5" />
          <circle cx="14" cy="8.5" r="5" />
          <circle cx="20" cy="7" r="5.2" />
          <circle cx="26" cy="8.5" r="5" />
          <circle cx="31" cy="12" r="4.5" />
        </g>
      );
    case 'bun':
      return (
        <g fill={color}>
          <path d="M6 16C6 8 12.5 3 20 3s14 5 14 13v2H6z" />
          <circle cx="20" cy="3" r="3" />
        </g>
      );
    case 'mohawk':
      return (
        <g fill={color}>
          <path d="M16 2c1 4-1 7-1 10h10c0-3-2-6-1-10-2 1-3 1-4 1s-2 0-4-1z" />
          <path d="M8 14c0-4 2-7 5-8-1 2-1 5-1 8H8z" />
          <path d="M32 14c0-4-2-7-5-8 1 2 1 5 1 8h4z" />
        </g>
      );
    case 'long':
      return (
        <g fill={color}>
          <path d="M6 18C6 9 12 4 20 4s14 5 14 14v10c0 1-1 2-2 2s-2-1-2-2v-6c0-1-1-2-2-2s-2 1-2 2v8c0 1-1 2-2 2H16c-1 0-2-1-2-2v-8c0-1-1-2-2-2s-2 1-2 2v6c0 1-1 2-2 2s-2-1-2-2z" />
        </g>
      );
    case 'short':
    default:
      return (
        <g fill={color}>
          <path d="M6 17C6 8.5 12.3 3 20 3s14 5.5 14 14v1H6z" />
        </g>
      );
  }
}

export default function Avatar({ id, name, size = 40 }) {
  const preset = presetForId(id || name || '');

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-label={name}
      className="shrink-0"
    >
      <title>{name}</title>
      <circle cx="20" cy="20" r="20" fill={preset.bg} />
      {/* shoulders */}
      <path d="M4 40c0-7 7-11 16-11s16 4 16 11z" fill="#64748b" />
      {/* neck */}
      <rect x="17" y="24" width="6" height="7" fill={preset.skin} />
      {/* head */}
      <circle cx="20" cy="18" r="10" fill={preset.skin} />
      {/* eyes */}
      <circle cx="16.5" cy="18" r="1.1" fill="#2b2b2b" />
      <circle cx="23.5" cy="18" r="1.1" fill="#2b2b2b" />
      {/* mouth */}
      <path d="M16.5 22c1.2 1.2 6 1.2 7 0" stroke="#8a4b3b" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {preset.beard && (
        <path d="M11 19c0 5 3.5 9 9 9s9-4 9-9c0 3-2 5-4 5.5.3-1 .3-2 0-2.5-1 1.5-2.7 2-5 2s-4-.5-5-2c-.3.5-.3 1.5 0 2.5-2-.5-4-2.5-4-5.5z" fill={preset.hair} />
      )}
      {preset.glasses && (
        <g stroke="#2b2b2b" strokeWidth="1" fill="none">
          <circle cx="16.5" cy="18" r="2.6" />
          <circle cx="23.5" cy="18" r="2.6" />
          <path d="M19.1 18h1.8" />
        </g>
      )}
      <Hair style={preset.style} color={preset.hair} />
    </svg>
  );
}
