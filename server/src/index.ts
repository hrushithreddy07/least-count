import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './game';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for local dev
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// In-memory rooms database
const rooms = new Map<string, GameRoom>();

// Map to track which socket belongs to which player and room
// SocketId -> { roomId, playerId }
const socketToPlayerMap = new Map<string, { roomId: string; playerId: string }>();

// Generate a random 4-letter room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

// Broadcast personalized game state updates to everyone in a room
function broadcastGameState(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  room.state.players.forEach(player => {
    const personalizedState = room.getClientState(player.id);
    io.to(player.socketId).emit('gameStateUpdate', personalizedState);
  });
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Create Room
  socket.on('createRoom', ({ name }, callback) => {
    try {
      if (!name || name.trim() === '') {
        return callback({ error: 'Name is required' });
      }

      const roomId = generateRoomCode();
      const playerId = `player_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const room = new GameRoom(roomId);
      room.addPlayer(playerId, name.trim(), socket.id);
      
      rooms.set(roomId, room);
      socketToPlayerMap.set(socket.id, { roomId, playerId });
      
      socket.join(roomId);
      
      callback({ roomId, playerId });
      broadcastGameState(roomId);
    } catch (err: any) {
      console.error(err);
      callback({ error: err.message || 'Failed to create room' });
    }
  });

  // Join Room
  socket.on('joinRoom', ({ roomId, name }, callback) => {
    try {
      if (!roomId || roomId.trim() === '') {
        return callback({ error: 'Room ID is required' });
      }
      if (!name || name.trim() === '') {
        return callback({ error: 'Name is required' });
      }

      const cleanRoomId = roomId.trim().toUpperCase();
      const room = rooms.get(cleanRoomId);

      if (!room) {
        return callback({ error: 'Room not found' });
      }

      // Check if player is reconnecting
      // Search by name in existing player list
      let player = room.state.players.find(p => p.name.toLowerCase() === name.trim().toLowerCase());
      let playerId = player ? player.id : null;

      if (!player) {
        if (room.state.gameStarted) {
          return callback({ error: 'Game has already started in this room!' });
        }
        if (room.state.players.length >= 6) {
          return callback({ error: 'Room is full! Max 6 players.' });
        }
        playerId = `player_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        player = room.addPlayer(playerId, name.trim(), socket.id);
      } else {
        // Player reconnecting
        player.socketId = socket.id;
        room.state.history.push(`${player.name} reconnected.`);
      }

      socketToPlayerMap.set(socket.id, { roomId: cleanRoomId, playerId });
      socket.join(cleanRoomId);

      callback({ roomId: cleanRoomId, playerId });
      broadcastGameState(cleanRoomId);
    } catch (err: any) {
      console.error(err);
      callback({ error: err.message || 'Failed to join room' });
    }
  });

  // Start Game
  socket.on('startGame', ({ roomId, playerId }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return callback?.({ error: 'Room not found' });

    const player = room.state.players.find(p => p.id === playerId);
    if (!player || !player.isHost) {
      return callback?.({ error: 'Only the host can start the game' });
    }

    try {
      room.startGame();
      broadcastGameState(roomId);
      callback?.({ success: true });
    } catch (err: any) {
      callback?.({ error: err.message });
    }
  });

  // Discard Cards
  socket.on('discard', ({ roomId, playerId, cardIds }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return callback?.({ error: 'Room not found' });

    try {
      room.handleDiscard(playerId, cardIds);
      broadcastGameState(roomId);
      callback?.({ success: true });
    } catch (err: any) {
      callback?.({ error: err.message });
    }
  });

  // Draw Card
  socket.on('draw', ({ roomId, playerId, source }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return callback?.({ error: 'Room not found' });

    try {
      room.handleDraw(playerId, source);
      broadcastGameState(roomId);
      callback?.({ success: true });
    } catch (err: any) {
      callback?.({ error: err.message });
    }
  });

  // Declare Show
  socket.on('declareShow', ({ roomId, playerId }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return callback?.({ error: 'Room not found' });

    try {
      room.handleDeclareShow(playerId);
      broadcastGameState(roomId);
      callback?.({ success: true });
    } catch (err: any) {
      callback?.({ error: err.message });
    }
  });

  // Next Round
  socket.on('nextRound', ({ roomId, playerId }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return callback?.({ error: 'Room not found' });

    try {
      room.handleNextRound(playerId);
      broadcastGameState(roomId);
      callback?.({ success: true });
    } catch (err: any) {
      callback?.({ error: err.message });
    }
  });

  // Reconnect / Sync State
  socket.on('syncState', ({ roomId, playerId }, callback) => {
    const room = rooms.get(roomId);
    if (!room) return callback?.({ error: 'Room not found' });

    const player = room.state.players.find(p => p.id === playerId);
    if (!player) return callback?.({ error: 'Player not found in this room' });

    // Update socket ID on reconnect
    player.socketId = socket.id;
    socketToPlayerMap.set(socket.id, { roomId, playerId });
    socket.join(roomId);

    callback?.({ success: true });
    broadcastGameState(roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const mapping = socketToPlayerMap.get(socket.id);
    if (mapping) {
      const { roomId, playerId } = mapping;
      const room = rooms.get(roomId);
      if (room) {
        room.removePlayer(socket.id);
        
        // If all players left, delete the room
        const allDisconnected = room.state.players.every(p => p.socketId === '');
        if (room.state.players.length === 0 || allDisconnected) {
          // Keep it for a few minutes or delete if empty
          if (room.state.players.length === 0) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} deleted because it was empty.`);
          }
        } else {
          broadcastGameState(roomId);
        }
      }
      socketToPlayerMap.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Least Count server is running on port ${PORT}`);
});
