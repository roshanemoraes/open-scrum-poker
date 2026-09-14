export const CUSTOM_OPTION_ID = 'custom';

export const VOTING_PRESETS = [
  { id: 'rci-scale', name: 'RCI Scale', values: ['1', '2', '3', '4', '5'] },
  { id: 'fibonacci', name: 'Fibonacci', values: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89'] },
  { id: 'modified-fibonacci', name: 'Modified Fibonacci', values: ['0', '1/2', '1', '2', '3', '5', '8', '13', '20', '40', '100'] },
  { id: 'tshirts', name: 'T-Shirts', values: ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'] },
  { id: 'power-of-two', name: 'Power of Two', values: ['0', '1', '2', '4', '8', '16', '32'] },
  { id: 'health', name: 'Health', values: ['🤢', '😭', '😐', '😘', '😄', '😍', '🎉'] },
  { id: 'traffic-lights', name: 'Traffic Lights', values: ['🔴', '🟡', '🟢'] },
];

export function presetLabel(preset) {
  return `${preset.name} (${preset.values.join(', ')})`;
}

// Every deck carries an "unsure" card, matching the app's existing card sets.
export function withUnknownCard(values) {
  return values.includes('?') ? values : [...values, '?'];
}

export function parseCustomValues(text) {
  return text.split(',').map((v) => v.trim()).filter(Boolean);
}
