import { io } from 'socket.io-client';

// Single shared socket instance for the whole app.
export const socket = io({ autoConnect: false });
