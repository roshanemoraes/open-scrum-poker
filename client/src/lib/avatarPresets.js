// 20 fixed cartoon-avatar presets. Each participant is deterministically
// assigned one of these based on their id, so avatars stay stable and the
// app never needs to fetch or store real images.
export const AVATAR_PRESETS = [
  { bg: '#e9edf6', skin: '#f1c27d', hair: '#3b2417', style: 'short', beard: false, glasses: false },
  { bg: '#fdeee0', skin: '#ffdbac', hair: '#b5651d', style: 'curly', beard: true, glasses: false },
  { bg: '#e6f4ea', skin: '#8d5524', hair: '#1a1a1a', style: 'bun', beard: false, glasses: false },
  { bg: '#eef1fb', skin: '#f1c27d', hair: '#5c3b1e', style: 'bald', beard: true, glasses: true },
  { bg: '#fdeaf0', skin: '#ffdbac', hair: '#d4a017', style: 'long', beard: false, glasses: false },
  { bg: '#e8f6f5', skin: '#c68642', hair: '#0d0d0d', style: 'short', beard: false, glasses: true },
  { bg: '#f3ecfb', skin: '#8d5524', hair: '#6b3f1d', style: 'curly', beard: false, glasses: false },
  { bg: '#fef3e2', skin: '#ffdbac', hair: '#8a4b08', style: 'mohawk', beard: true, glasses: false },
  { bg: '#e7f0fd', skin: '#f1c27d', hair: '#222222', style: 'bun', beard: false, glasses: true },
  { bg: '#fdecec', skin: '#c68642', hair: '#c96f2a', style: 'long', beard: false, glasses: false },
  { bg: '#eafaf1', skin: '#ffdbac', hair: '#4a3222', style: 'short', beard: true, glasses: false },
  { bg: '#f0eefb', skin: '#8d5524', hair: '#0d0d0d', style: 'bald', beard: false, glasses: false },
  { bg: '#fef0f0', skin: '#f1c27d', hair: '#a45a2a', style: 'curly', beard: false, glasses: true },
  { bg: '#e9f6fb', skin: '#c68642', hair: '#2b1c11', style: 'mohawk', beard: false, glasses: false },
  { bg: '#f6f0fb', skin: '#ffdbac', hair: '#d9b382', style: 'long', beard: false, glasses: false },
  { bg: '#eef7ec', skin: '#8d5524', hair: '#111111', style: 'short', beard: true, glasses: true },
  { bg: '#fdf1e6', skin: '#f1c27d', hair: '#733e1a', style: 'bun', beard: false, glasses: false },
  { bg: '#ecf1fd', skin: '#ffdbac', hair: '#5a3a22', style: 'bald', beard: true, glasses: false },
  { bg: '#fbeef4', skin: '#c68642', hair: '#0f0f0f', style: 'curly', beard: false, glasses: false },
  { bg: '#eef8f6', skin: '#f1c27d', hair: '#9a6a2f', style: 'short', beard: false, glasses: false },
];

export function presetForId(id) {
  let hash = 0;
  const str = id || '';
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PRESETS[Math.abs(hash) % AVATAR_PRESETS.length];
}
