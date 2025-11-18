const mysql = require('mysql2/promise');
const { createConfig } = require('../config');
const { str } = require('envalid');

const config = createConfig({
  serviceName: 'chat-service',
  serviceRoot: __dirname,
  overrides: {
    AUTH_DB_NAME: str({ default: 'instenglish_auth' }),
  },
  defaults: {
    PORT: 3010,
    DB_NAME: 'instenglish_chat',
  },
});

const { env } = config;

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

const sanitizeLocationPayload = (location) => {
  if (!location) {
    return null;
  }
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return {
    latitude,
    longitude,
    label: typeof location.label === 'string' ? location.label : null,
    address: typeof location.address === 'string' ? location.address : null,
    mapUrl: typeof location.mapUrl === 'string' ? location.mapUrl : `https://www.google.com/maps?q=${latitude},${longitude}`,
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

async function testNormalizeMessage() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: env.DB_PORT,
  });

  try {
    console.log('✅ Conectado a la base de datos:', env.DB_NAME);
    
    // Obtener un mensaje con metadata
    const [messages] = await connection.execute(
      'SELECT * FROM messages WHERE metadata IS NOT NULL LIMIT 1'
    );

    if (messages.length === 0) {
      console.log('⚠️ No hay mensajes con metadata para probar');
      return;
    }

    const rawMessage = messages[0];
    console.log('\n📨 Mensaje RAW de la BD:');
    console.log('  ID:', rawMessage.id);
    console.log('  Type:', rawMessage.message_type);
    console.log('  File URL:', rawMessage.file_url);
    console.log('  Metadata (raw):', rawMessage.metadata);
    console.log('  Metadata (type):', typeof rawMessage.metadata);

    console.log('\n🔄 Normalizando con normalizeMessageRow...');
    const normalized = normalizeMessageRow(rawMessage);
    
    console.log('\n✅ Mensaje NORMALIZADO:');
    console.log(JSON.stringify(normalized, null, 2));

    console.log('\n📎 Attachments extraídos:');
    if (normalized.attachments && normalized.attachments.length > 0) {
      console.log('  ✅ Se encontraron', normalized.attachments.length, 'attachment(s)');
      normalized.attachments.forEach((att, i) => {
        console.log(`\n  Attachment ${i + 1}:`);
        console.log('    URL:', att.url);
        console.log('    Name:', att.name);
        console.log('    Type:', att.type);
        console.log('    MimeType:', att.mimeType);
        console.log('    Size:', att.size);
      });
    } else {
      console.log('  ❌ No se encontraron attachments en el mensaje normalizado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

testNormalizeMessage().catch(console.error);
