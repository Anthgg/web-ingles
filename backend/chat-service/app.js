const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mime = require('mime-types');
const { randomUUID } = require('crypto');
const { str, num } = require('envalid');
const { createConfig } = require('../config');

const app = express();
const config = createConfig({
  serviceName: 'chat-service',
  serviceRoot: __dirname,
  overrides: {
    AUTH_DB_NAME: str({ default: 'instenglish_auth' }),
    AUTH_JWT_SECRET: str({ default: '' }),
    UPLOAD_MAX_FILES: num({ default: 5 }),
    UPLOAD_MAX_BYTES: num({ default: 25 * 1024 * 1024 }),
  },
  defaults: {
    PORT: 3010,
    DB_NAME: 'instenglish_chat',
  },
});
const { env, corsOrigins } = config;
const EDIT_WINDOW_MS = 10 * 60 * 1000;
const DELETE_EVERYONE_WINDOW_MS = 10 * 60 * 1000;
const DEFAULT_UPLOAD_LIMIT_BYTES = 25 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = Number(env.UPLOAD_MAX_FILES) > 0 ? Number(env.UPLOAD_MAX_FILES) : 5;
const MAX_ATTACHMENT_BYTES = Number(env.UPLOAD_MAX_BYTES) > 0 ? Number(env.UPLOAD_MAX_BYTES) : DEFAULT_UPLOAD_LIMIT_BYTES;

const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const uploadsRoot = path.join(__dirname, 'uploads');
ensureDirectoryExists(uploadsRoot);
const fsPromises = fs.promises;

const deleteRoomUploads = async (roomId) => {
  const roomFolder = path.join(uploadsRoot, String(roomId));
  try {
    await fsPromises.rm(roomFolder, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn(`Failed to remove uploads for room ${roomId}:`, error.message);
    }
  }
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const roomId = Number(req.params?.roomId);
    const roomFolder = Number.isInteger(roomId) ? path.join(uploadsRoot, String(roomId)) : uploadsRoot;
    ensureDirectoryExists(roomFolder);
    callback(null, roomFolder);
  },
  filename: (req, file, callback) => {
    const extension = mime.extension(file.mimetype) || path.extname(file.originalname) || '';
    const uniqueName = `${Date.now()}-${randomUUID()}${extension ? `.${extension.replace(/^\./, '')}` : ''}`;
    callback(null, uniqueName);
  },
});

const ACCEPTED_MIME_ROOT = new Set(['image', 'video', 'audio']);
const ACCEPTED_ADDITIONAL_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
]);

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_ATTACHMENT_BYTES,
    files: MAX_ATTACHMENTS_PER_MESSAGE,
  },
  fileFilter: (req, file, callback) => {
    const [root] = file.mimetype.split('/');
    if (ACCEPTED_MIME_ROOT.has(root) || ACCEPTED_ADDITIONAL_MIMES.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error('Tipo de archivo no permitido'));
  },
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: corsOrigins.length ? corsOrigins : true,
    methods: ["GET", "POST"]
  }
});

app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsRoot));

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

const authDbConfig = {
  ...dbConfig,
  database: env.AUTH_DB_NAME,
};

let authDb;
const getAuthDb = () => {
  if (!authDb) {
    throw new Error('Auth database connection not initialized');
  }
  return authDb;
};

const fetchUsersByIds = async (userIds = []) => {
  const normalizedIds = Array.from(
    new Set(
      (Array.isArray(userIds) ? userIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value))
    )
  );

  if (!normalizedIds.length) {
    return new Map();
  }

  const placeholders = normalizedIds.map(() => '?').join(',');
  const [rows] = await getAuthDb().execute(
    `SELECT id, nombre, rol FROM usuarios WHERE id IN (${placeholders})`,
    normalizedIds
  );

  return new Map(rows.map((row) => [Number(row.id), row]));
};

const STUDENT_ROLES = new Set(['alumno', 'estudiante', 'student']);
const ADMIN_ROLES = new Set(['admin', 'administrativo']);

const isStudentRole = (role) => {
  if (!role) return false;
  return STUDENT_ROLES.has(String(role).toLowerCase());
};

const isAdminRole = (role) => {
  if (!role) return false;
  return ADMIN_ROLES.has(String(role).toLowerCase());
};

const toPlainBool = (value) => value === true || value === 1 || value === '1';

const safeJsonParse = (value, fallback = null) => {
  if (!value) {
    return fallback;
  }
  try {
    if (typeof value === 'object') {
      return value;
    }
    return JSON.parse(value);
  } catch (error) {
    console.warn('Invalid JSON metadata detected:', error.message);
    return fallback;
  }
};

const stringifyMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  const keys = Object.keys(metadata);
  if (!keys.length) {
    return null;
  }
  return JSON.stringify(metadata);
};

const classifyAttachmentType = (mimeType = '') => {
  if (typeof mimeType !== 'string') {
    return 'file';
  }
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return 'audio';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  return 'file';
};

const sanitizeAttachmentPayload = (attachment) => {
  if (!attachment) {
    return null;
  }
  const url = typeof attachment.url === 'string' ? attachment.url.trim() : '';
  if (!url) {
    return null;
  }
  const name = typeof attachment.name === 'string' ? attachment.name : null;
  const mimeType = typeof attachment.mimeType === 'string' ? attachment.mimeType : null;
  const type = classifyAttachmentType(mimeType || '');
  const size = Number(attachment.size);
  return {
    url,
    name,
    mimeType,
    size: Number.isFinite(size) && size >= 0 ? size : null,
    type,
  };
};

const sanitizeStickerPayload = (sticker) => {
  if (!sticker) {
    return null;
  }
  const url = typeof sticker.url === 'string' ? sticker.url.trim() : '';
  if (!url) {
    return null;
  }
  return {
    url,
    alt: typeof sticker.alt === 'string' ? sticker.alt : null,
  };
};

const buildGoogleMapsUrl = (latitude, longitude) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const normalizedLat = Number(latitude).toFixed(6);
  const normalizedLng = Number(longitude).toFixed(6);
  // Usar el formato directo de Google Maps que es más confiable
  // Este formato abre directamente la ubicación exacta con un marcador
  return `https://www.google.com/maps?q=${normalizedLat},${normalizedLng}`;
};

const sanitizeLocationPayload = (location) => {
  if (!location) {
    return null;
  }
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const resolvedMapUrl = typeof location.mapUrl === 'string' && location.mapUrl.trim()
    ? location.mapUrl.trim()
    : buildGoogleMapsUrl(latitude, longitude);
  return {
    latitude,
    longitude,
    label: typeof location.label === 'string' ? location.label : null,
    address: typeof location.address === 'string' ? location.address : null,
    mapUrl: resolvedMapUrl,
  };
};

const normalizeMessageRow = (row) => {
  if (!row) return null;
  const rawMetadata = safeJsonParse(row.metadata, null) || {};
  const attachments = Array.isArray(rawMetadata.attachments)
    ? rawMetadata.attachments
        .map(sanitizeAttachmentPayload)
        .filter((attachment) => attachment !== null)
    : [];
  const location = sanitizeLocationPayload(rawMetadata.location);
  const sticker = sanitizeStickerPayload(rawMetadata.sticker);
  return {
    id: Number(row.id),
    room_id: Number(row.room_id),
    sender_id: Number(row.sender_id),
    content: row.content,
    message_type: row.message_type,
    file_url: row.file_url,
    sent_at: row.sent_at,
    edited_at: row.edited_at || null,
    is_deleted: toPlainBool(row.is_deleted),
    deleted_at: row.deleted_at || null,
    deleted_by: row.deleted_by ? Number(row.deleted_by) : null,
    metadata: {
      ...rawMetadata,
      attachments,
      location,
      sticker,
    },
    attachments,
    location,
    sticker,
  };
};

const ensureMessageSchema = async () => {
  const pool = getDb();
  const ensureColumn = async (column, ddl) => {
    try {
      const [columns] = await pool.query('SHOW COLUMNS FROM messages LIKE ?', [column]);
      if (!Array.isArray(columns) || !columns.length) {
        await pool.query(ddl);
      }
    } catch (error) {
      console.error(`Error ensuring column ${column}:`, error.message);
    }
  };

  await ensureColumn('is_deleted', 'ALTER TABLE messages ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('edited_at', 'ALTER TABLE messages ADD COLUMN edited_at DATETIME NULL DEFAULT NULL');
  await ensureColumn('deleted_at', 'ALTER TABLE messages ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL');
  await ensureColumn('deleted_by', 'ALTER TABLE messages ADD COLUMN deleted_by INT NULL DEFAULT NULL');
  await ensureColumn('file_url', 'ALTER TABLE messages ADD COLUMN file_url VARCHAR(512) NULL');
  await ensureColumn('message_type', "ALTER TABLE messages ADD COLUMN message_type VARCHAR(32) NOT NULL DEFAULT 'text'");
  await ensureColumn('metadata', 'ALTER TABLE messages ADD COLUMN metadata JSON NULL');
};

const ensureMessageUserStateSchema = async () => {
  const pool = getDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS message_user_states (
      id INT AUTO_INCREMENT PRIMARY KEY,
      message_id INT NOT NULL,
      user_id INT NOT NULL,
      is_deleted TINYINT(1) NOT NULL DEFAULT 0,
      deleted_at DATETIME NULL DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_message_user (message_id, user_id),
      INDEX idx_user_states_user (user_id),
      CONSTRAINT fk_message_user_states_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
};

const resolveToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (req.headers['x-access-token']) {
    return String(req.headers['x-access-token']);
  }
  if (req.query && req.query.token) {
    return String(req.query.token);
  }
  if (req.body && req.body.token) {
    return String(req.body.token);
  }
  return '';
};

let cachedJwtSecret;
const resolveJwtSecret = () => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const primarySecret = env.JWT_SECRET;
  const legacySecret = env.AUTH_JWT_SECRET;

  if (primarySecret && legacySecret && primarySecret !== legacySecret) {
    throw new Error('JWT_SECRET y AUTH_JWT_SECRET no coinciden. Usa un solo secreto compartido.');
  }

  const resolved = primarySecret || legacySecret;

  if (!resolved) {
    throw new Error('JWT_SECRET no configurado. Define una clave compartida para todos los servicios.');
  }

  cachedJwtSecret = resolved;
  return cachedJwtSecret;
};

const verifyJwtToken = (token) => {
  if (!token) {
    throw new Error('Token requerido');
  }
  const secret = resolveJwtSecret();
  return jwt.verify(token, secret, { ignoreExpiration: false });
};

try {
  resolveJwtSecret();
} catch (error) {
  console.error('JWT configuration error:', error.message);
  process.exit(1);
}

const authenticate = (req, res, next) => {
  const token = resolveToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const payload = verifyJwtToken(token);
    if (!payload?.id) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    req.user = payload;
    return next();
  } catch (error) {
    console.warn('Error verifying JWT in chat service:', error.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

const resolveSocketToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) {
    return String(authToken);
  }

  const headerToken = socket.handshake?.headers?.authorization || socket.handshake?.headers?.Authorization;
  if (headerToken && headerToken.startsWith('Bearer ')) {
    return headerToken.slice(7);
  }

  const queryToken = socket.handshake?.query?.token;
  if (Array.isArray(queryToken) && queryToken.length) {
    return String(queryToken[0]);
  }
  if (typeof queryToken === 'string' && queryToken) {
    return queryToken;
  }

  return '';
};

const authenticateSocket = (socket, next) => {
  try {
    const token = resolveSocketToken(socket);
    if (!token) {
      return next(new Error('UNAUTHORIZED'));
    }
    const payload = verifyJwtToken(token);
    if (!payload?.id) {
      return next(new Error('UNAUTHORIZED'));
    }
    socket.data.user = payload;
    return next();
  } catch (error) {
    console.warn('Socket JWT rejected:', error.message);
    return next(new Error('UNAUTHORIZED'));
  }
};

io.use(authenticateSocket);

// Socket.IO connection
io.on('connection', (socket) => {
  const connectedUserId = Number(socket.data?.user?.id);
  console.log('User connected:', socket.id, 'userId:', Number.isInteger(connectedUserId) ? connectedUserId : 'unknown');

  socket.on('join_room', async (roomId) => {
    const numericRoomId = Number(roomId);
    const userId = Number(socket.data?.user?.id);

    if (!Number.isInteger(numericRoomId) || !Number.isInteger(userId)) {
      return;
    }

    try {
      const participates = await userParticipatesInRoom({ roomId: numericRoomId, userId });
      if (!participates) {
        socket.emit('room_error', { roomId: numericRoomId, error: 'No autorizado' });
        console.warn(`User ${userId} attempted to join unauthorized room ${numericRoomId}`);
        return;
      }
      socket.join(numericRoomId);
      console.log(`User ${socket.id} (${userId}) joined room ${numericRoomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('room_error', { roomId: numericRoomId, error: 'Error al unirse a la sala' });
    }
  });

  socket.on('leave_room', (roomId) => {
    const numericRoomId = Number(roomId);
    if (!Number.isInteger(numericRoomId)) {
      return;
    }
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${numericRoomId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const {
        roomId,
        senderId,
        content,
        messageType,
        fileUrl,
        attachments,
        metadata,
        sticker,
        location,
      } = data || {};

      const normalizedRoomId = Number(roomId);
      const normalizedSenderId = Number(socket.data?.user?.id);

      if (!Number.isInteger(normalizedRoomId) || !Number.isInteger(normalizedSenderId)) {
        console.warn('Invalid message payload, missing roomId or senderId', data);
        return;
      }

      if (senderId && Number(senderId) !== normalizedSenderId) {
        console.warn(`Sender ${senderId} attempted to spoof identity. Using authenticated sender ${normalizedSenderId}.`);
      }

      const sanitizedContent = typeof content === 'string' ? content.trim() : '';
      const baseMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? { ...metadata } : {};
      const sanitizedAttachments = Array.isArray(attachments)
        ? attachments.map(sanitizeAttachmentPayload).filter((attachment) => attachment !== null)
        : [];
      const sanitizedSticker = sanitizeStickerPayload(sticker || baseMetadata.sticker);
      const sanitizedLocation = sanitizeLocationPayload(location || baseMetadata.location);

      if (sanitizedAttachments.length) {
        baseMetadata.attachments = sanitizedAttachments;
      }
      if (sanitizedSticker) {
        baseMetadata.sticker = sanitizedSticker;
      }
      if (sanitizedLocation) {
        baseMetadata.location = sanitizedLocation;
      }

      const metadataJson = stringifyMetadata(baseMetadata);

      if (
        !sanitizedContent &&
        !sanitizedAttachments.length &&
        !sanitizedSticker &&
        !sanitizedLocation &&
        !fileUrl
      ) {
        return;
      }

      const derivedType = (() => {
        if (sanitizedAttachments.length) {
          return sanitizedAttachments[0].type || 'file';
        }
        if (sanitizedSticker) {
          return 'sticker';
        }
        if (sanitizedLocation) {
          return 'location';
        }
        if (messageType) {
          return String(messageType).toLowerCase();
        }
        return 'text';
      })();

      const connectionPool = getDb();
      const [membershipRows] = await connectionPool.execute(
        'SELECT 1 FROM chat_participants WHERE room_id = ? AND user_id = ? LIMIT 1',
        [normalizedRoomId, normalizedSenderId]
      );

      if (!membershipRows.length) {
        console.warn(`Sender ${normalizedSenderId} is not a member of room ${normalizedRoomId}`);
        socket.emit('room_error', { roomId: normalizedRoomId, error: 'No autorizado' });
        return;
      }

      const [result] = await connectionPool.execute(
        'INSERT INTO messages (room_id, sender_id, content, message_type, file_url, metadata) VALUES (?, ?, ?, ?, ?, ?)',
        [
          normalizedRoomId,
          normalizedSenderId,
          sanitizedContent,
          derivedType,
          sanitizedAttachments[0]?.url || (typeof fileUrl === 'string' ? fileUrl : null),
          metadataJson,
        ]
      );

      const [rows] = await connectionPool.execute('SELECT * FROM messages WHERE id = ?', [result.insertId]);
      if (!rows.length) {
        return;
      }
      const message = normalizeMessageRow(rows[0]);
      io.to(normalizedRoomId).emit('receive_message', message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const buildParticipantMap = (participants, userLookup) => {
  return participants.reduce((acc, participant) => {
    const roomId = participant.room_id;
    if (!acc[roomId]) {
      acc[roomId] = [];
    }
    const userId = Number(participant.user_id);
    const userInfo = userLookup.get(userId) || {};
    acc[roomId].push({
      userId,
      role: participant.role,
      userRole: userInfo.rol || null,
      userName: userInfo.nombre || null,
    });
    return acc;
  }, {});
};

const userParticipatesInRoom = async ({ roomId, userId }) => {
  const numericRoomId = Number(roomId);
  const numericUserId = Number(userId);

  if (!Number.isInteger(numericRoomId) || !Number.isInteger(numericUserId)) {
    return false;
  }

  const [membership] = await getDb().execute(
    'SELECT 1 FROM chat_participants WHERE room_id = ? AND user_id = ? LIMIT 1',
    [numericRoomId, numericUserId]
  );
  return membership.length > 0;
};

const fetchRoomWithParticipants = async (roomId) => {
  const numericRoomId = Number(roomId);
  if (!Number.isInteger(numericRoomId)) {
    return null;
  }

  const [rooms] = await getDb().execute(
    'SELECT id, name, type, description, group_photo FROM chat_rooms WHERE id = ? LIMIT 1',
    [numericRoomId]
  );

  if (!rooms.length) {
    return null;
  }

  const [participants] = await getDb().execute(
    'SELECT user_id, role FROM chat_participants WHERE room_id = ?',
    [numericRoomId]
  );

  return {
    id: numericRoomId,
    name: rooms[0].name,
    type: rooms[0].type,
    description: rooms[0].description,
    group_photo: rooms[0].group_photo,
    participants: participants.map((participant) => ({
      user_id: Number(participant.user_id),
      role: participant.role,
    })),
  };
};

const promoteNextGroupOwner = async ({ roomId }) => {
  const numericRoomId = Number(roomId);
  if (!Number.isInteger(numericRoomId)) {
    return;
  }

  const pool = getDb();

  // Verificar si ya existe un owner
  const [existingOwners] = await pool.execute(
    'SELECT user_id FROM chat_participants WHERE room_id = ? AND role = ? LIMIT 1',
    [numericRoomId, 'owner']
  );

  if (existingOwners.length) {
    return; // Ya hay un owner
  }

  // Buscar candidato para ser owner
  const [candidates] = await pool.execute(
    'SELECT user_id FROM chat_participants WHERE room_id = ? ORDER BY user_id ASC LIMIT 1',
    [numericRoomId]
  );

  if (!candidates.length) {
    return; // No hay participantes restantes
  }

  // Promover al primer participante como owner
  const newOwnerId = candidates[0].user_id;
  console.log(`Promoting user ${newOwnerId} to owner of room ${numericRoomId}`);
  
  await pool.execute(
    'UPDATE chat_participants SET role = ? WHERE room_id = ? AND user_id = ?',
    ['owner', numericRoomId, newOwnerId]
  );
  
  console.log(`User ${newOwnerId} is now owner of room ${numericRoomId}`);
};

const deleteRoomCascade = async (roomId) => {
  const numericRoomId = Number(roomId);
  if (!Number.isInteger(numericRoomId)) {
    return;
  }

  const pool = getDb();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [messageRows] = await connection.execute(
      'SELECT id FROM messages WHERE room_id = ?',
      [numericRoomId]
    );

    if (messageRows.length) {
      const messageIds = messageRows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id));
      if (messageIds.length) {
        const placeholders = messageIds.map(() => '?').join(',');
        await connection.execute(
          `DELETE FROM message_user_states WHERE message_id IN (${placeholders})`,
          messageIds
        );
      }
    }

    await connection.execute('DELETE FROM messages WHERE room_id = ?', [numericRoomId]);
    await connection.execute('DELETE FROM chat_participants WHERE room_id = ?', [numericRoomId]);
    await connection.execute('DELETE FROM chat_rooms WHERE id = ?', [numericRoomId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await deleteRoomUploads(numericRoomId);
};

const fetchMessageById = async (messageId, options = {}) => {
  const numericMessageId = Number(messageId);
  if (!Number.isInteger(numericMessageId)) {
    return null;
  }
  const [rows] = await getDb().execute(
    `SELECT m.*, mus.is_deleted AS user_hidden
     FROM messages m
     LEFT JOIN message_user_states mus ON mus.message_id = m.id AND mus.user_id = ?
     WHERE m.id = ?
     LIMIT 1`,
    [Number(options.userId) || 0, numericMessageId]
  );
  if (!rows.length) {
    return null;
  }
  return normalizeMessageRow(rows[0]);
};

const isWithinWindow = (timestamp, windowMs) => {
  if (!timestamp || !windowMs) {
    return false;
  }
  const sentAt = new Date(timestamp).getTime();
  if (Number.isNaN(sentAt)) {
    return false;
  }
  return Date.now() - sentAt <= windowMs;
};

const isWithinEditWindow = (message) => isWithinWindow(message?.sent_at, EDIT_WINDOW_MS);
const isWithinDeleteWindow = (message) => isWithinWindow(message?.sent_at, DELETE_EVERYONE_WINDOW_MS);

app.get('/rooms/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = Number(req.user.id);
    const currentUserRole = req.user?.rol;
    const targetUserId = Number(userId);

    if (!Number.isInteger(targetUserId) || currentUserId !== targetUserId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const [rooms] = await getDb().execute(
      `SELECT r.id, r.name, r.type, r.description, r.group_photo, r.created_at
       FROM chat_rooms r
       JOIN chat_participants p ON r.id = p.room_id
       WHERE p.user_id = ? AND (p.archived IS NULL OR p.archived = 0)
       ORDER BY r.id DESC`,
      [currentUserId]
    );

    console.log('🔍 Backend - Rooms query result:', rooms.length, 'rooms');
    if (rooms.length > 0) {
      console.log('🔍 Backend - First room sample:', {
        id: rooms[0].id,
        name: rooms[0].name,
        type: rooms[0].type,
        description: rooms[0].description,
        group_photo: rooms[0].group_photo
      });
    }

    if (!rooms.length) {
      return res.json([]);
    }

    const roomIds = rooms.map((room) => room.id);
    const placeholders = roomIds.map(() => '?').join(',');
    const [participantsRaw] = await getDb().execute(
      `SELECT room_id, user_id, role
       FROM chat_participants
       WHERE room_id IN (${placeholders})`,
      roomIds
    );

    const uniqueUserIds = new Set(
      participantsRaw
        .map((participant) => Number(participant.user_id))
        .filter((participantId) => Number.isInteger(participantId))
    );

    let lastMessagesMap = new Map();

    if (roomIds.length) {
      const roomPlaceholders = roomIds.map(() => '?').join(',');
      const [lastMessageRows] = await getDb().execute(
        `SELECT m.*
         FROM messages m
         LEFT JOIN message_user_states mus ON mus.message_id = m.id AND mus.user_id = ?
         INNER JOIN (
           SELECT m2.room_id, MAX(m2.sent_at) AS last_sent_at
           FROM messages m2
           LEFT JOIN message_user_states mus2 ON mus2.message_id = m2.id AND mus2.user_id = ?
           WHERE m2.room_id IN (${roomPlaceholders}) AND (mus2.is_deleted IS NULL OR mus2.is_deleted = 0)
           GROUP BY m2.room_id
         ) latest ON latest.room_id = m.room_id AND latest.last_sent_at = m.sent_at
         WHERE m.room_id IN (${roomPlaceholders})`,
        [currentUserId, currentUserId, ...roomIds, ...roomIds]
      );

      lastMessagesMap = new Map(
        lastMessageRows
          .map((row) => {
            const normalized = normalizeMessageRow(row);
            if (!normalized) {
              return null;
            }
            const senderId = Number(normalized.sender_id);
            if (Number.isInteger(senderId)) {
              uniqueUserIds.add(senderId);
            }
            return [Number(row.room_id), normalized];
          })
          .filter((entry) => entry !== null)
      );
    }

    const userLookup = await fetchUsersByIds(Array.from(uniqueUserIds));

    const participantMap = buildParticipantMap(participantsRaw, userLookup);

    const normalizedRooms = rooms.map((room) => {
      const roomId = Number(room.id);
      const lastMessage = lastMessagesMap.get(roomId) || null;
      const senderDetails =
        lastMessage && Number.isInteger(lastMessage.sender_id)
          ? userLookup.get(Number(lastMessage.sender_id)) || null
          : null;
      const rawGroupPhoto = typeof room.group_photo === 'string' ? room.group_photo.trim() : '';
      let normalizedGroupPhoto = null;

      if (rawGroupPhoto) {
        if (/^https?:\/\//i.test(rawGroupPhoto)) {
          try {
            const parsedUrl = new URL(rawGroupPhoto);
            const pathname = parsedUrl.pathname || '';
            const search = parsedUrl.search || '';
            const resolved = `${pathname}${search}`;
            normalizedGroupPhoto = resolved ? resolved : null;
          } catch (parseError) {
            console.warn('Invalid absolute group photo URL encountered:', rawGroupPhoto, parseError.message);
            normalizedGroupPhoto = rawGroupPhoto;
          }
        } else {
          normalizedGroupPhoto = rawGroupPhoto.startsWith('/')
            ? rawGroupPhoto
            : `/${rawGroupPhoto}`;
        }

        if (normalizedGroupPhoto) {
          normalizedGroupPhoto = normalizedGroupPhoto.replace(/\\/g, '/');
          if (!normalizedGroupPhoto.startsWith('/') && !/^https?:\/\//i.test(normalizedGroupPhoto)) {
            normalizedGroupPhoto = `/${normalizedGroupPhoto}`;
          }
        }
      }

      return {
        id: roomId,
        name: room.name,
        type: room.type,
        description: room.description || null,
        group_photo: normalizedGroupPhoto,
        participants: participantMap[roomId] || [],
        lastMessage,
        lastMessageAt: lastMessage?.sent_at || null,
        lastMessageSender: senderDetails
          ? {
              id: Number(senderDetails.id),
              nombre: senderDetails.nombre || null,
              rol: senderDetails.rol || null,
            }
          : null,
      };
    });

    const filteredRooms = isStudentRole(currentUserRole)
      ? normalizedRooms.filter((room) => !room.participants.some(
          (participant) => participant.userId !== currentUserId && isAdminRole(participant.userRole)
        ))
      : normalizedRooms;

    res.json(filteredRooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener chats archivados del usuario
app.get('/rooms/:userId/archived', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = Number(req.user.id);
    const targetUserId = Number(userId);

    if (!Number.isInteger(targetUserId) || currentUserId !== targetUserId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const [rooms] = await getDb().execute(
      `SELECT r.id, r.name, r.type, r.description, r.group_photo, r.created_at
       FROM chat_rooms r
       JOIN chat_participants p ON r.id = p.room_id
       WHERE p.user_id = ? AND p.archived = 1
       ORDER BY r.id DESC`,
      [currentUserId]
    );

    if (!rooms.length) {
      return res.json([]);
    }

    const roomIds = rooms.map((room) => room.id);
    const placeholders = roomIds.map(() => '?').join(',');
    const [participantsRaw] = await getDb().execute(
      `SELECT room_id, user_id, role
       FROM chat_participants
       WHERE room_id IN (${placeholders})`,
      roomIds
    );

    const uniqueUserIds = new Set(
      participantsRaw
        .map((participant) => Number(participant.user_id))
        .filter((participantId) => Number.isInteger(participantId))
    );

    const userLookup = await fetchUsersByIds(Array.from(uniqueUserIds));
    const participantMap = buildParticipantMap(participantsRaw, userLookup);

    const normalizedRooms = rooms.map((room) => {
      const roomId = Number(room.id);
      return {
        id: roomId,
        name: room.name,
        type: room.type,
        description: room.description || null,
        group_photo: room.group_photo,
        participants: participantMap[roomId] || [],
        archived: true
      };
    });

    res.json(normalizedRooms);
  } catch (error) {
    console.error('Error fetching archived rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

const isDirectType = (value) => {
  if (!value) return false;
  const normalized = String(value).toLowerCase();
  return normalized === 'direct' || normalized === 'private';
};

const isGroupType = (value) => {
  if (!value) return false;
  return String(value).toLowerCase() === 'group';
};

const resolveParticipantRole = ({ isCreator = false } = {}) => {
  return isCreator ? 'owner' : 'member';
};

const attachmentFieldName = 'files';
const uploadAttachmentsMiddleware = upload.array(attachmentFieldName, MAX_ATTACHMENTS_PER_MESSAGE);

app.post('/rooms/:roomId/attachments', authenticate, (req, res) => {
  uploadAttachmentsMiddleware(req, res, async (uploadError) => {
    if (uploadError) {
      console.error('Error uploading attachments:', uploadError);
      return res.status(400).json({ error: uploadError.message || 'Error al subir archivos' });
    }

    try {
      const { roomId } = req.params;
      const currentUserId = Number(req.user?.id);
      const numericRoomId = Number(roomId);

      if (!Number.isInteger(numericRoomId)) {
        return res.status(400).json({ error: 'Sala inválida' });
      }

      const isParticipant = await userParticipatesInRoom({ roomId: numericRoomId, userId: currentUserId });
      if (!isParticipant) {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const uploadedFiles = Array.isArray(req.files) ? req.files : [];
      const attachments = uploadedFiles.map((file) => {
        const relativePath = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');
        const publicUrl = `/uploads/${relativePath}`;
        return {
          url: publicUrl,
          name: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          type: classifyAttachmentType(file.mimetype),
          uploadedAt: new Date().toISOString(),
        };
      });

      res.json({ attachments });
    } catch (error) {
      console.error('Unexpected attachments upload error:', error);
      res.status(500).json({ error: 'No se pudieron subir los archivos' });
    }
  });
});

// Endpoint para subir foto de grupo
app.post('/upload-group-photo', authenticate, (req, res) => {
  const singleUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, callback) => {
        const groupsFolder = path.join(uploadsRoot, 'groups');
        ensureDirectoryExists(groupsFolder);
        callback(null, groupsFolder);
      },
      filename: (req, file, callback) => {
        const extension = mime.extension(file.mimetype) || path.extname(file.originalname) || '';
        const uniqueName = `group-${Date.now()}-${randomUUID()}${extension ? `.${extension.replace(/^\./, '')}` : ''}`;
        callback(null, uniqueName);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req, file, callback) => {
      if (file.mimetype.startsWith('image/')) {
        callback(null, true);
      } else {
        callback(new Error('Solo se permiten imágenes'));
      }
    },
  }).single('photo');

  singleUpload(req, res, async (uploadError) => {
    if (uploadError) {
      console.error('Error uploading group photo:', uploadError);
      return res.status(400).json({ error: uploadError.message || 'Error al subir la foto' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ninguna foto' });
      }

      const relativePath = path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/');
      const publicUrl = `/uploads/${relativePath}`;

      res.json({ 
        url: publicUrl,
        filename: req.file.filename,
        size: req.file.size
      });
    } catch (error) {
      console.error('Unexpected group photo upload error:', error);
      res.status(500).json({ error: 'No se pudo subir la foto' });
    }
  });
});

app.post('/rooms', authenticate, async (req, res) => {
  try {
    const { name, type, participants } = req.body;
    const connectionPool = getDb();
    const authPool = getAuthDb();
    const currentUser = req.user;
    const currentUserId = Number(currentUser?.id);

    if (!currentUserId) {
      return res.status(400).json({ error: 'Usuario inválido' });
    }

    const normalizedType = isDirectType(type) ? 'private' : type;

    const uniqueParticipants = new Map();
    (Array.isArray(participants) ? participants : []).forEach((participant) => {
      if (!participant || participant.userId === undefined) {
        return;
      }
      const participantId = Number(participant.userId);
      if (!Number.isInteger(participantId)) {
        return;
      }
      const role = resolveParticipantRole();
      uniqueParticipants.set(participantId, {
        userId: participantId,
        role,
      });
    });

    if (!uniqueParticipants.has(currentUserId)) {
      uniqueParticipants.set(currentUserId, {
        userId: currentUserId,
        role: resolveParticipantRole(),
      });
    }

    const participantList = Array.from(uniqueParticipants.values()).map((participantEntry) => {
      const isCreator = participantEntry.userId === currentUserId && isGroupType(normalizedType);
      return {
        userId: participantEntry.userId,
        role: resolveParticipantRole({ isCreator }),
      };
    });
    const participantIds = participantList.map((p) => p.userId);
    const userLookup = await fetchUsersByIds(participantIds);
    const hasStudent = participantIds.some((id) => isStudentRole(userLookup.get(id)?.rol));
    const hasAdmin = participantIds.some((id) => isAdminRole(userLookup.get(id)?.rol));

    if (isDirectType(normalizedType) && hasStudent && hasAdmin) {
      return res.status(400).json({ error: 'No se permite chat directo entre estudiantes y administradores' });
    }

    if (isDirectType(normalizedType) && participantList.length === 2) {
  const sortedIds = participantIds.slice().sort((a, b) => a - b);
  const placeholders = sortedIds.map(() => '?').join(',');
      const [existingRooms] = await connectionPool.execute(
        `SELECT r.id
         FROM chat_rooms r
         JOIN chat_participants cp ON r.id = cp.room_id
         WHERE r.type IN ('direct', 'private') AND cp.user_id IN (${placeholders})
         GROUP BY r.id
         HAVING COUNT(DISTINCT cp.user_id) = ?
         LIMIT 1`,
        [...sortedIds, sortedIds.length]
      );

      if (existingRooms.length) {
        return res.json({ id: existingRooms[0].id, existing: true });
      }
    }

    const [result] = await connectionPool.execute(
      'INSERT INTO chat_rooms (name, type, description, group_photo) VALUES (?, ?, ?, ?)',
      [name, normalizedType, req.body.description || null, req.body.groupPhoto || null]
    );
    const roomId = result.insertId;

    for (const participant of participantList) {
      await connectionPool.execute(
        'INSERT INTO chat_participants (room_id, user_id, role) VALUES (?, ?, ?)',
        [roomId, participant.userId, participant.role || 'member']
      );
    }

    // Si es un grupo, emitir evento a todos los participantes
    if (isGroupType(normalizedType)) {
      const [creatorRows] = await authPool.execute('SELECT nombre FROM usuarios WHERE id = ?', [currentUserId]);
      const creatorName = creatorRows.length > 0 ? creatorRows[0].nombre : 'Usuario';

      // Emitir a todos los participantes
      participantIds.forEach(participantId => {
        io.to(`user_${participantId}`).emit('group_created', {
          roomId: roomId,
          roomName: name,
          createdBy: currentUserId,
          creatorName: creatorName
        });
      });
    }

    res.json({ id: roomId });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/rooms/:roomId/leave', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const numericRoomId = Number(roomId);
    const currentUserId = Number(req.user?.id);

    if (!Number.isInteger(numericRoomId)) {
      return res.status(400).json({ error: 'Sala inválida' });
    }

    const room = await fetchRoomWithParticipants(numericRoomId);
    if (!room) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }

    const participant = room.participants.find((entry) => entry.user_id === currentUserId);
    if (!participant) {
      return res.status(403).json({ error: 'No perteneces a esta sala' });
    }

    // Obtener nombre del usuario que sale
    const pool = getDb();
    const authPool = getAuthDb();
    const [userRows] = await authPool.execute('SELECT nombre FROM usuarios WHERE id = ?', [currentUserId]);
    const userName = userRows.length > 0 ? userRows[0].nombre : 'Usuario';

    // SOLO eliminar al participante del grupo (el usuario abandona el chat)
    await pool.execute('DELETE FROM chat_participants WHERE room_id = ? AND user_id = ?', [numericRoomId, currentUserId]);

    const isGroup = isGroupType(room.type);
    let roomDeleted = false;

    const [remainingParticipants] = await pool.execute(
      'SELECT user_id, role FROM chat_participants WHERE room_id = ?',
      [numericRoomId]
    );

    // Emitir evento a todos los participantes del grupo
    if (isGroup && remainingParticipants.length > 0) {
      io.to(`room_${numericRoomId}`).emit('user_left_group', {
        userId: currentUserId,
        userName: userName,
        roomId: numericRoomId,
        roomName: room.name
      });
    }

    if (!remainingParticipants.length) {
      await deleteRoomCascade(numericRoomId);
      roomDeleted = true;
    } else if (isGroup && participant.role === 'owner') {
      await promoteNextGroupOwner({ roomId: numericRoomId });
    } else if (!isGroup) {
      await deleteRoomCascade(numericRoomId);
      roomDeleted = true;
    }

    res.json({ ok: true, roomDeleted });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'No se pudo abandonar la sala' });
  }
});

// Archivar/ocultar chat para el usuario actual
app.post('/rooms/:roomId/archive', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const numericRoomId = Number(roomId);
    const currentUserId = Number(req.user?.id);

    if (!Number.isInteger(numericRoomId)) {
      return res.status(400).json({ error: 'ID de sala inválido' });
    }

    const pool = getDb();

    // Verificar que el usuario es participante
    const [participants] = await pool.execute(
      'SELECT * FROM chat_participants WHERE room_id = ? AND user_id = ?',
      [numericRoomId, currentUserId]
    );

    if (!participants.length) {
      return res.status(403).json({ error: 'No perteneces a esta sala' });
    }

    // Marcar como archivado para el usuario actual
    await pool.execute(
      'UPDATE chat_participants SET archived = 1 WHERE room_id = ? AND user_id = ?',
      [numericRoomId, currentUserId]
    );

    res.json({ ok: true, message: 'Chat archivado correctamente' });
  } catch (error) {
    console.error('Error archiving room:', error);
    res.status(500).json({ error: 'No se pudo archivar el chat' });
  }
});

// Desarchivar/restaurar chat para el usuario actual
app.post('/rooms/:roomId/unarchive', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const numericRoomId = Number(roomId);
    const currentUserId = Number(req.user?.id);

    if (!Number.isInteger(numericRoomId)) {
      return res.status(400).json({ error: 'ID de sala inválido' });
    }

    const pool = getDb();

    // Verificar que el usuario es participante
    const [participants] = await pool.execute(
      'SELECT * FROM chat_participants WHERE room_id = ? AND user_id = ?',
      [numericRoomId, currentUserId]
    );

    if (!participants.length) {
      return res.status(403).json({ error: 'No perteneces a esta sala' });
    }

    // Marcar como NO archivado para el usuario actual
    await pool.execute(
      'UPDATE chat_participants SET archived = 0 WHERE room_id = ? AND user_id = ?',
      [numericRoomId, currentUserId]
    );

    res.json({ ok: true, message: 'Chat restaurado correctamente' });
  } catch (error) {
    console.error('Error unarchiving room:', error);
    res.status(500).json({ error: 'No se pudo restaurar el chat' });
  }
});

// Agregar participantes a un grupo
app.post('/rooms/:roomId/participants', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { participantIds } = req.body;
    const numericRoomId = Number(roomId);
    const currentUserId = Number(req.user?.id);
    const currentUserRole = req.user?.rol;

    if (!Number.isInteger(numericRoomId) || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const pool = getDb();
    const authPool = getAuthDb();

    // Verificar que el room existe y es un grupo
    const [rooms] = await pool.execute(
      'SELECT id, name, type FROM chat_rooms WHERE id = ?',
      [numericRoomId]
    );

    if (!rooms.length) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    const room = rooms[0];

    if (!isGroupType(room.type)) {
      return res.status(400).json({ error: 'Solo se pueden agregar participantes a grupos' });
    }

    // Verificar que el usuario actual es participante y tiene permisos
    const [currentParticipants] = await pool.execute(
      'SELECT user_id, role FROM chat_participants WHERE room_id = ? AND user_id = ?',
      [numericRoomId, currentUserId]
    );

    if (!currentParticipants.length && !isAdminRole(currentUserRole)) {
      return res.status(403).json({ error: 'No perteneces a este grupo' });
    }

    const currentParticipant = currentParticipants[0];
    const isOwner = currentParticipant?.role === 'owner';
    const isAdmin = isAdminRole(currentUserRole);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Solo el propietario o administradores pueden agregar participantes' });
    }

    // Agregar cada participante
    const addedParticipants = [];
    for (const participantId of participantIds) {
      const numericParticipantId = Number(participantId);
      
      if (!Number.isInteger(numericParticipantId)) {
        continue;
      }

      // Verificar que el usuario no está ya en el grupo
      const [existing] = await pool.execute(
        'SELECT user_id FROM chat_participants WHERE room_id = ? AND user_id = ?',
        [numericRoomId, numericParticipantId]
      );

      if (existing.length > 0) {
        continue; // Ya está en el grupo
      }

      // Agregar participante
      await pool.execute(
        'INSERT INTO chat_participants (room_id, user_id, role) VALUES (?, ?, ?)',
        [numericRoomId, numericParticipantId, 'member']
      );

      // Obtener nombre del usuario agregado
      const [userRows] = await authPool.execute(
        'SELECT nombre FROM usuarios WHERE id = ?',
        [numericParticipantId]
      );

      const userName = userRows.length > 0 ? userRows[0].nombre : 'Usuario';

      addedParticipants.push({
        userId: numericParticipantId,
        userName
      });

      // Emitir evento al usuario agregado
      io.to(`user_${numericParticipantId}`).emit('added_to_group', {
        roomId: numericRoomId,
        roomName: room.name,
        addedBy: currentUserId
      });
    }

    // Emitir evento a todos los participantes del grupo
    if (addedParticipants.length > 0) {
      io.to(`room_${numericRoomId}`).emit('participants_added', {
        roomId: numericRoomId,
        roomName: room.name,
        participants: addedParticipants,
        addedBy: currentUserId
      });
    }

    res.json({ 
      ok: true, 
      added: addedParticipants.length,
      participants: addedParticipants
    });
  } catch (error) {
    console.error('Error adding participants:', error);
    res.status(500).json({ error: 'No se pudieron agregar los participantes' });
  }
});

app.delete('/rooms/:roomId/participants/:participantId', authenticate, async (req, res) => {
  try {
    const { roomId, participantId } = req.params;
    const numericRoomId = Number(roomId);
    const targetUserId = Number(participantId);
    const currentUserId = Number(req.user?.id);
    const currentUserRole = req.user?.rol;

    if (!Number.isInteger(numericRoomId) || !Number.isInteger(targetUserId)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ error: 'Usa la opción de abandonar grupo para salir' });
    }

    const room = await fetchRoomWithParticipants(numericRoomId);
    if (!room) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }

    if (!isGroupType(room.type)) {
      return res.status(400).json({ error: 'Solo los grupos permiten gestionar participantes' });
    }

    const requester = room.participants.find((entry) => entry.user_id === currentUserId);
    if (!requester && !isAdminRole(currentUserRole)) {
      return res.status(403).json({ error: 'No perteneces a esta sala' });
    }

    const target = room.participants.find((entry) => entry.user_id === targetUserId);
    if (!target) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }

    const requesterIsOwner = requester?.role === 'owner';
    const requesterIsAdmin = isAdminRole(currentUserRole);

    if (!requesterIsOwner && !requesterIsAdmin) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar integrantes' });
    }

    if (target.role === 'owner' && !requesterIsAdmin) {
      return res.status(400).json({ error: 'No puedes eliminar al propietario del grupo' });
    }

    // Obtener nombres de usuarios (usar authDb para tabla usuarios)
    const pool = getDb();
    const authPool = getAuthDb();
    const [targetUserRows] = await authPool.execute('SELECT nombre FROM usuarios WHERE id = ?', [targetUserId]);
    const targetUserName = targetUserRows.length > 0 ? targetUserRows[0].nombre : 'Usuario';

    // SOLO eliminar al participante del grupo (NO elimina el usuario de la base de datos)
    await pool.execute('DELETE FROM chat_participants WHERE room_id = ? AND user_id = ?', [numericRoomId, targetUserId]);

    // Emitir evento a todos los participantes del grupo
    io.to(`room_${numericRoomId}`).emit('user_removed_from_group', {
      userId: targetUserId,
      userName: targetUserName,
      roomId: numericRoomId,
      roomName: room.name,
      removedBy: currentUserId
    });

    const [remainingParticipants] = await pool.execute(
      'SELECT user_id, role FROM chat_participants WHERE room_id = ?',
      [numericRoomId]
    );

    let roomDeleted = false;

    if (!remainingParticipants.length) {
      await deleteRoomCascade(numericRoomId);
      roomDeleted = true;
    } 
    // TEMPORAL: Comentado hasta verificar estructura de tabla chat_participants
    // else if (!remainingParticipants.some((entry) => entry.role === 'owner')) {
    //   await promoteNextGroupOwner({ roomId: numericRoomId });
    // }

    res.json({ ok: true, roomDeleted });
  } catch (error) {
    console.error('Error removing participant:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      roomId: req.params.roomId,
      participantId: req.params.participantId
    });
    res.status(500).json({ error: 'No se pudo eliminar al participante', details: error.message });
  }
});

app.delete('/rooms/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const numericRoomId = Number(roomId);
    const currentUserId = Number(req.user?.id);
    const currentUserRole = req.user?.rol;

    if (!Number.isInteger(numericRoomId)) {
      return res.status(400).json({ error: 'Sala inválida' });
    }

    const room = await fetchRoomWithParticipants(numericRoomId);
    if (!room) {
      return res.status(404).json({ error: 'Sala no encontrada' });
    }

    const requester = room.participants.find((entry) => entry.user_id === currentUserId);
    const requesterIsAdmin = isAdminRole(currentUserRole);

    if (!requester && !requesterIsAdmin) {
      return res.status(403).json({ error: 'No perteneces a esta sala' });
    }

    if (isGroupType(room.type) && !requesterIsAdmin && requester?.role !== 'owner') {
      return res.status(403).json({ error: 'Solo el propietario puede eliminar el grupo' });
    }

    await deleteRoomCascade(numericRoomId);

    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'No se pudo eliminar la sala' });
  }
});

app.get('/messages/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const currentUserId = Number(req.user?.id);
    const numericRoomId = Number(roomId);

    if (!Number.isInteger(numericRoomId)) {
      return res.status(400).json({ error: 'Sala inválida' });
    }

    const isParticipant = await userParticipatesInRoom({ roomId: numericRoomId, userId: currentUserId });
    if (!isParticipant) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const [messages] = await getDb().execute(
      `SELECT m.*
       FROM messages m
       LEFT JOIN message_user_states mus ON mus.message_id = m.id AND mus.user_id = ?
       WHERE m.room_id = ? AND (mus.is_deleted IS NULL OR mus.is_deleted = 0)
       ORDER BY m.sent_at ASC`,
      [currentUserId, numericRoomId]
    );
    const normalizedMessages = messages
      .map(normalizeMessageRow)
      .filter((message) => message !== null);
    res.json(normalizedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/messages/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = Number(req.user?.id);
    const message = await fetchMessageById(messageId, { userId: currentUserId });

    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    if (message.sender_id !== currentUserId) {
      return res.status(403).json({ error: 'Solo puedes editar tus mensajes' });
    }

    if (message.is_deleted) {
      return res.status(400).json({ error: 'No puedes editar un mensaje eliminado' });
    }

    if (!isWithinEditWindow(message)) {
      return res.status(400).json({ error: 'El periodo de edición de 10 minutos ha expirado' });
    }

    const nextContent = typeof req.body?.content === 'string' ? req.body.content.trim() : '';
    const hasRichPayload = Boolean(
      (Array.isArray(message.attachments) && message.attachments.length) ||
        message.location ||
        message.sticker
    );

    if (!nextContent && !hasRichPayload) {
      return res.status(400).json({ error: 'El mensaje no puede quedar vacío' });
    }

    const isParticipant = await userParticipatesInRoom({ roomId: message.room_id, userId: currentUserId });
    if (!isParticipant) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await getDb().execute('UPDATE messages SET content = ?, edited_at = NOW() WHERE id = ?', [nextContent, message.id]);

    const updated = await fetchMessageById(message.id, { userId: currentUserId });
    if (!updated) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    io.to(updated.room_id).emit('message_updated', updated);
    res.json(updated);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'No se pudo editar el mensaje' });
  }
});

app.post('/messages/:messageId/delete', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { scope = 'me' } = req.body || {};
    const normalizedScope = scope === 'everyone' ? 'everyone' : 'me';
    const currentUserId = Number(req.user?.id);

    const message = await fetchMessageById(messageId, { userId: currentUserId });
    if (!message) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }

    const isParticipant = await userParticipatesInRoom({ roomId: message.room_id, userId: currentUserId });
    if (!isParticipant) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (normalizedScope === 'me') {
      await getDb().execute(
        `INSERT INTO message_user_states (message_id, user_id, is_deleted, deleted_at)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE is_deleted = VALUES(is_deleted), deleted_at = VALUES(deleted_at)`,
        [message.id, currentUserId]
      );
      return res.json({ id: message.id, scope: 'me' });
    }

    if (message.sender_id !== currentUserId) {
      return res.status(403).json({ error: 'Solo puedes eliminar para todos tus mensajes' });
    }

    if (message.is_deleted) {
      return res.status(400).json({ error: 'El mensaje ya fue eliminado' });
    }

    if (!isWithinDeleteWindow(message)) {
      return res.status(400).json({ error: 'El periodo de eliminación de 10 minutos ha expirado' });
    }

    await getDb().execute(
      'UPDATE messages SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ?',
      [currentUserId, message.id]
    );

    const updated = await fetchMessageById(message.id, { userId: currentUserId });
    if (updated) {
      io.to(updated.room_id).emit('message_deleted', {
        message: updated,
        scope: 'everyone',
        deletedBy: currentUserId,
      });
    }

    return res.json({ id: message.id, scope: 'everyone' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'No se pudo eliminar el mensaje' });
  }
});

app.get('/contacts', authenticate, async (req, res) => {
  try {
    const currentUserId = Number(req.user?.id);
    const currentUserRole = req.user?.rol;
    const [rows] = await getAuthDb().execute(
      `SELECT id, nombre, email, rol
       FROM usuarios
       WHERE (activo IS NULL OR activo = 1) AND id <> ?
       ORDER BY nombre ASC`,
      [currentUserId]
    );
    const sanitizedRows = isStudentRole(currentUserRole)
      ? rows.filter((row) => !isAdminRole(row.rol))
      : rows;
    res.json(sanitizedRows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
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
    await ensureMessageSchema();
    await ensureMessageUserStateSchema();
  } catch (error) {
    console.error('Database connection error:', error);
  }
  try {
    authDb = mysql.createPool(authDbConfig);
    const authConnection = await authDb.getConnection();
    authConnection.release();
    console.log('Connected to auth database');
  } catch (error) {
    console.error('Auth database connection error:', error);
  }
});