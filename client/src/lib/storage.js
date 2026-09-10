export const getHostToken = () => localStorage.getItem('osp_host_token');
export const setHostToken = (token) => localStorage.setItem('osp_host_token', token);
export const clearHostToken = () => localStorage.removeItem('osp_host_token');

export const getName = () => localStorage.getItem('osp_name') || '';
export const setName = (name) => localStorage.setItem('osp_name', name);

export const getParticipantId = (roomId) => localStorage.getItem(`osp_pid_${roomId}`);
export const setParticipantId = (roomId, id) => localStorage.setItem(`osp_pid_${roomId}`, id);

export const getAvatarId = () => {
  const raw = localStorage.getItem('osp_avatar_id');
  return raw == null ? null : Number(raw);
};
export const setAvatarId = (id) => localStorage.setItem('osp_avatar_id', String(id));
