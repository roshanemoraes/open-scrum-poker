import { presetById, presetForSeed } from './avatarPresets.js';
import AvatarFace from './AvatarFace.jsx';

export default function Avatar({ avatarId, id, name, size = 40 }) {
  const preset = (avatarId != null && presetById(avatarId)) || presetForSeed(id || name || '');
  return <AvatarFace preset={preset} size={size} title={name} />;
}
