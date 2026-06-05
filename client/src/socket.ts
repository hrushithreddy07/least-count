import { io, Socket } from 'socket.io-client';

// Automatically connect to port 3000 on the same host as the client
const protocol = window.location.protocol;
const hostname = window.location.hostname;
const SOCKET_URL = `${protocol}//${hostname}:3000`;

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
