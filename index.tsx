import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', logger(console.log));
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

interface Player {
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  health: number;
}

interface Room {
  code: string;
  host: string;
  players: Record<string, Player>;
  createdAt: number;
}

// Create a new room
app.post('/make-server-472de917/create-room', async (c) => {
  try {
    const { roomCode, hostUsername } = await c.req.json();

    if (!roomCode || !hostUsername) {
      return c.json({ error: 'Missing roomCode or hostUsername' }, 400);
    }

    const room: Room = {
      code: roomCode,
      host: hostUsername,
      players: {},
      createdAt: Date.now(),
    };

    await kv.set(`room:${roomCode}`, room);

    console.log(`Room created: ${roomCode} by ${hostUsername}`);

    return c.json({ success: true, roomCode });
  } catch (error) {
    console.error('Error creating room:', error);
    return c.json({ error: 'Failed to create room' }, 500);
  }
});

// Join a room
app.post('/make-server-472de917/join-room', async (c) => {
  try {
    const { roomCode, username } = await c.req.json();

    if (!roomCode || !username) {
      return c.json({ error: 'Missing roomCode or username' }, 400);
    }

    const room = await kv.get<Room>(`room:${roomCode}`);

    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    console.log(`Player ${username} joined room ${roomCode}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error joining room:', error);
    return c.json({ error: 'Failed to join room' }, 500);
  }
});

// Update player position
app.post('/make-server-472de917/update-player', async (c) => {
  try {
    const { roomCode, playerId, playerData } = await c.req.json();

    if (!roomCode || !playerId || !playerData) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const room = await kv.get<Room>(`room:${roomCode}`);

    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    room.players[playerId] = {
      ...playerData,
      lastUpdate: Date.now(),
    };

    await kv.set(`room:${roomCode}`, room);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating player:', error);
    return c.json({ error: 'Failed to update player' }, 500);
  }
});

// Get all players in a room
app.get('/make-server-472de917/get-players', async (c) => {
  try {
    const roomCode = c.req.query('roomCode');

    if (!roomCode) {
      return c.json({ error: 'Missing roomCode' }, 400);
    }

    const room = await kv.get<Room>(`room:${roomCode}`);

    if (!room) {
      return c.json({ error: 'Room not found' }, 404);
    }

    // Remove stale players (not updated in 5 seconds)
    const now = Date.now();
    Object.keys(room.players).forEach((playerId) => {
      if (now - (room.players[playerId] as any).lastUpdate > 5000) {
        delete room.players[playerId];
      }
    });

    await kv.set(`room:${roomCode}`, room);

    return c.json({ players: room.players });
  } catch (error) {
    console.error('Error getting players:', error);
    return c.json({ error: 'Failed to get players' }, 500);
  }
});

// Leave room
app.post('/make-server-472de917/leave-room', async (c) => {
  try {
    const { roomCode, playerId } = await c.req.json();

    if (!roomCode || !playerId) {
      return c.json({ error: 'Missing roomCode or playerId' }, 400);
    }

    const room = await kv.get<Room>(`room:${roomCode}`);

    if (room && room.players[playerId]) {
      delete room.players[playerId];
      await kv.set(`room:${roomCode}`, room);
      console.log(`Player ${playerId} left room ${roomCode}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error leaving room:', error);
    return c.json({ error: 'Failed to leave room' }, 500);
  }
});

// Health check
app.get('/make-server-472de917/health', (c) => {
  return c.json({ status: 'ok', game: 'jarzd.io' });
});

Deno.serve(app.fetch);
