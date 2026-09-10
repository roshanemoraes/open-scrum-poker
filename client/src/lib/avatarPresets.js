// 20 fixed cartoon-avatar presets, grouped by gender for the picker UI.
// No images are stored or fetched — everything renders as inline SVG.
export const AVATAR_PRESETS = [
  { id: 0, gender: 'male', bg: '#e9edf6', skin: '#f1c27d', hair: '#3b2417', style: 'short', beard: false, glasses: false },
  { id: 1, gender: 'male', bg: '#fdeee0', skin: '#ffdbac', hair: '#b5651d', style: 'curly', beard: true, glasses: false },
  { id: 2, gender: 'female', bg: '#e6f4ea', skin: '#8d5524', hair: '#1a1a1a', style: 'bun', beard: false, glasses: false },
  { id: 3, gender: 'male', bg: '#eef1fb', skin: '#f1c27d', hair: '#5c3b1e', style: 'bald', beard: true, glasses: true },
  { id: 4, gender: 'female', bg: '#fdeaf0', skin: '#ffdbac', hair: '#d4a017', style: 'long', beard: false, glasses: false },
  { id: 5, gender: 'neutral', bg: '#e8f6f5', skin: '#c68642', hair: '#0d0d0d', style: 'short', beard: false, glasses: true },
  { id: 6, gender: 'female', bg: '#f3ecfb', skin: '#8d5524', hair: '#6b3f1d', style: 'curly', beard: false, glasses: false },
  { id: 7, gender: 'male', bg: '#fef3e2', skin: '#ffdbac', hair: '#8a4b08', style: 'mohawk', beard: true, glasses: false },
  { id: 8, gender: 'neutral', bg: '#e7f0fd', skin: '#f1c27d', hair: '#222222', style: 'bun', beard: false, glasses: true },
  { id: 9, gender: 'female', bg: '#fdecec', skin: '#c68642', hair: '#c96f2a', style: 'long', beard: false, glasses: false },
  { id: 10, gender: 'male', bg: '#eafaf1', skin: '#ffdbac', hair: '#4a3222', style: 'short', beard: true, glasses: false },
  { id: 11, gender: 'neutral', bg: '#f0eefb', skin: '#8d5524', hair: '#0d0d0d', style: 'bald', beard: false, glasses: false },
  { id: 12, gender: 'female', bg: '#fef0f0', skin: '#f1c27d', hair: '#a45a2a', style: 'curly', beard: false, glasses: true },
  { id: 13, gender: 'neutral', bg: '#e9f6fb', skin: '#c68642', hair: '#2b1c11', style: 'mohawk', beard: false, glasses: false },
  { id: 14, gender: 'female', bg: '#f6f0fb', skin: '#ffdbac', hair: '#d9b382', style: 'long', beard: false, glasses: false },
  { id: 15, gender: 'male', bg: '#eef7ec', skin: '#8d5524', hair: '#111111', style: 'short', beard: true, glasses: true },
  { id: 16, gender: 'neutral', bg: '#fdf1e6', skin: '#f1c27d', hair: '#733e1a', style: 'bun', beard: false, glasses: false },
  { id: 17, gender: 'male', bg: '#ecf1fd', skin: '#ffdbac', hair: '#5a3a22', style: 'bald', beard: true, glasses: false },
  { id: 18, gender: 'female', bg: '#fbeef4', skin: '#c68642', hair: '#0f0f0f', style: 'curly', beard: false, glasses: false },
  { id: 19, gender: 'neutral', bg: '#eef8f6', skin: '#f1c27d', hair: '#9a6a2f', style: 'short', beard: false, glasses: false },
];

export function presetById(id) {
  return AVATAR_PRESETS.find((p) => p.id === id);
}

export function presetsForGender(gender) {
  return AVATAR_PRESETS.filter((p) => p.gender === gender);
}

// Deterministic fallback for anyone rendered without a chosen avatarId
// (e.g. bot/legacy participants).
export function presetForSeed(seed) {
  let hash = 0;
  const str = seed || '';
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PRESETS[Math.abs(hash) % AVATAR_PRESETS.length];
}
