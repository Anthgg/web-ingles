const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { createConfig } = require('../config');

const app = express();
const config = createConfig({
  serviceName: 'chat-service',
  serviceRoot: __dirname,
  defaults: {
    PORT: 3010,
    DB_NAME: 'instenglish_chat',
  },
});
const { env, corsOrigins } = config;
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: corsOrigins.length ? corsOrigins : true,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(express.json());

// Database connection
const dbConfig = {
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  waitForConnections: true,
  connectionLimit: env.DB_POOL_SIZE,
  queueLimit: 0,
};

let db;
const getDb = () => {
  if (!db) {
    throw new Error('Database connection not initialized');
  }
  return db;
};

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { roomId, senderId, content, messageType = 'text', fileUrl } = data;
      const connectionPool = getDb();
      
      // Save message to DB
      const [result] = await connectionPool.execute(
        'INSERT INTO messages (room_id, sender_id, content, message_type, file_url) VALUES (?, ?, ?, ?, ?)',
        [roomId, senderId, content, messageType, fileUrl]
      );
      
      const message = {
        id: result.insertId,
        roomId,
        senderId,
        content,
        messageType,
        fileUrl,
        sentAt: new Date()
      };
      
      // Emit to room
      io.to(roomId).emit('receive_message', message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API routes
app.get('/rooms/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [rooms] = await getDb().execute(`
      SELECT r.*, p.role FROM chat_rooms r
      JOIN chat_participants p ON r.id = p.room_id
      WHERE p.user_id = ?
    `, [userId]);
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/rooms', async (req, res) => {
  try {
    const { name, type, participants } = req.body;
    const connectionPool = getDb();
    const [result] = await connectionPool.execute(
      'INSERT INTO chat_rooms (name, type) VALUES (?, ?)',
      [name, type]
    );
    const roomId = result.insertId;
    
    // Add participants
    for (const participant of participants) {
      await connectionPool.execute(
        'INSERT INTO chat_participants (room_id, user_id, role) VALUES (?, ?, ?)',
        [roomId, participant.userId, participant.role || 'member']
      );
    }
    
    res.json({ id: roomId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/messages/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const [messages] = await getDb().execute(`
      SELECT * FROM messages WHERE room_id = ? ORDER BY sent_at ASC
    `, [roomId]);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = env.PORT;
server.listen(PORT, async () => {
  console.log(`Chat service running on port ${PORT}`);
  try {
    // Reuse shared pool configuration for consistency across services.
    db = mysql.createPool(dbConfig);
    const connection = await db.getConnection();
    connection.release();
    console.log('Connected to chat database');
  } catch (error) {
    console.error('Database connection error:', error);
  }
});