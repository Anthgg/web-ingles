const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { str, num } = require('envalid');
const { createConfig } = require('../config');
let twilioClient = null;
let nodemailer = null;

const app = express();
const config = createConfig({
  serviceName: 'auth-service',
  serviceRoot: __dirname,
  overrides: {
    TWO_FA_ISSUER: str({ default: 'GoEnglish' }),
    OTP_IP_RATE_MAX: num({ default: 10 }),
    OTP_IP_RATE_WINDOW_MS: num({ default: 15 * 60 * 1000 }),
    TEST_SMS_TO: str({ default: '' }),
  },
  defaults: {
    DB_NAME: 'instenglish_auth',
    PORT: 3001,
  },
});

const { env, corsOrigins } = config;

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  }),
);
app.use(express.json());

let cachedJwtSecret;
const resolveJwtSecret = () => {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const candidate = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : env.JWT_SECRET;

  if (!candidate) {
    throw new Error('JWT_SECRET no configurado. Define una clave compartida para todos los servicios.');
  }

  cachedJwtSecret = candidate;
  return cachedJwtSecret;
};

let SECRET_KEY;
try {
  SECRET_KEY = resolveJwtSecret();
} catch (error) {
  console.error('JWT configuration error:', error.message);
  process.exit(1);
}
const TWO_FA_ENCRYPTION_KEY = env.TWO_FA_ENCRYPTION_KEY || 'cambia_esta_clave_para_2fa_seguro';
const TWO_FACTOR_LOGIN_ENABLED = env.TWO_FACTOR_LOGIN_ENABLED; // Activo por defecto; poner en 'false' para desactivar temporalmente

const ENCRYPTION_KEY = crypto.createHash('sha256').update(TWO_FA_ENCRYPTION_KEY).digest();
const IV_LENGTH = 16;

const connection = mysql.createConnection({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
});

const encrypt = (text) => {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

const decrypt = (value) => {
  if (!value) return '';
  try {
    const [ivHex, encrypted] = value.split(':');
    if (!ivHex || !encrypted) return '';
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Error decrypting 2FA secret:', err);
    return '';
  }
};

connection.connect((err) => {
  if (err) {
    console.error('Error DB Auth:', err);
  } else {
    console.log('Auth Service DB conectado');
    // Crear tabla OTP si no existe (idempotente)
    const createOtpTable = `
      CREATE TABLE IF NOT EXISTS user_otp (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        code_hash VARCHAR(128) NOT NULL,
        channel ENUM('sms','email') NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 5,
        sent_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        INDEX (user_id),
        INDEX (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    connection.query(createOtpTable, (e) => {
      if (e) console.error('Error creando tabla user_otp:', e.message);
    });
  }
});

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Token inv?lido' });
    }
    req.user = decoded;
    next();
  });
};

const buildAuthPayload = (user) => ({
  id: user.id,
  nombre: user.nombre,
  rol: user.rol,
  email: user.email,
  twoFactorEnabled: Boolean(user.two_fa_secret),
});

const isValidEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// ====== OTP helpers (SMS/Email) ======
const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');
const now = () => new Date();
const addMinutes = (date, mins) => new Date(date.getTime() + mins * 60000);

const SEND_COOLDOWN_SECONDS = env.OTP_SEND_COOLDOWN;
const OTP_TTL_MINUTES = env.OTP_TTL_MINUTES;
const MAX_ATTEMPTS = env.OTP_MAX_ATTEMPTS;

const ipWindow = new Map();
const RATE_LIMIT_MAX = config.get('OTP_IP_RATE_MAX', 10);
const RATE_LIMIT_WINDOW_MS = config.get('OTP_IP_RATE_WINDOW_MS', 15 * 60 * 1000);

function rateLimitIp(ip) {
  const nowTs = Date.now();
  const entry = ipWindow.get(ip) || { count: 0, start: nowTs };
  if (nowTs - entry.start > RATE_LIMIT_WINDOW_MS) {
    entry.count = 0; entry.start = nowTs;
  }
  entry.count += 1;
  ipWindow.set(ip, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    connection.query('SELECT id, nombre, rol, email, telefono FROM usuarios WHERE email = ? LIMIT 1', [email], (err, results) => {
      if (err) return reject(err);
      if (!Array.isArray(results) || results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
}

async function ensureProviders() {
  const twilioSid = env.TWILIO_ACCOUNT_SID?.trim();
  const twilioToken = env.TWILIO_AUTH_TOKEN?.trim();
  
  if (!twilioClient && twilioSid && twilioToken) {
    try {
      twilioClient = require('twilio')(twilioSid, twilioToken);
      console.log('[Auth Service] Twilio SMS configurado correctamente');
    } catch (e) {
      console.error('[Auth Service] Error inicializando Twilio:', e.message);
    }
  }
  
  if (!nodemailer) {
    try { 
      nodemailer = require('nodemailer');
      console.log('[Auth Service] Nodemailer configurado correctamente');
    } catch (e) {
      console.error('[Auth Service] Error cargando nodemailer:', e.message);
    }
  }
}

async function sendSms(to, body) {
  await ensureProviders();
  if (!twilioClient) throw new Error('Servicio SMS no configurado');
  if (!env.TWILIO_FROM) throw new Error('Número de origen SMS no configurado');
  if (!to) throw new Error('Número de destino no proporcionado');
  return await twilioClient.messages.create({ from: env.TWILIO_FROM, to, body });
}

async function sendEmail(to, subject, text) {
  await ensureProviders();
  if (!nodemailer) throw new Error('Email no disponible');
  
  // Convertir puerto a número y secure a boolean
  const port = env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587;
  const secure = env.SMTP_SECURE === 'true' || env.SMTP_SECURE === true;
  
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: env.SMTP_USER ? { 
      user: env.SMTP_USER, 
      pass: env.SMTP_PASS?.replace(/\s+/g, '') // Remover espacios de la contraseña
    } : undefined,
  });
  
  try {
    return await transporter.sendMail({ 
      from: env.FROM_EMAIL || env.SMTP_USER, 
      to, 
      subject, 
      text 
    });
  } catch (err) {
    console.error('[Auth Service] Error enviando email:', err.message);
    throw new Error(`Error enviando email: ${err.message}`);
  }
}

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';

  if (!trimmedEmail || !password) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  if (!isValidEmail(trimmedEmail)) {
    return res.status(400).json({ error: 'Correo electronico invalido' });
  }

  connection.query(
    'SELECT id, nombre, rol, email, password, two_fa_secret, activo FROM usuarios WHERE email = ? LIMIT 1',
    [trimmedEmail],
    async (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!Array.isArray(results) || results.length === 0) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }

      const user = results[0];
      
      // Verificar si el usuario está activo
      if (user.activo === false || user.activo === 0) {
        return res.status(403).json({ 
          error: 'Usuario desactivado',
          message: 'Tu cuenta ha sido desactivada. Contacta al administrador para más información.'
        });
      }
      
      const valid = await bcrypt.compare(password, user.password || '');
      if (!valid) {
        return res.status(401).json({ error: 'Contrase?a incorrecta' });
      }

      const hasTwoFA = Boolean(user.two_fa_secret);

      if (TWO_FACTOR_LOGIN_ENABLED && hasTwoFA) {
        const tempToken = jwt.sign(
          {
            id: user.id,
            email: user.email,
            twoFactorPending: true,
          },
          SECRET_KEY,
          { expiresIn: '5m' }
        );

        return res.json({
          twoFARequired: true,
          tempToken,
          message: 'Se requiere autenticaci?n de dos factores',
        });
      }

      const payload = buildAuthPayload(user);
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '8h' });
      return res.json({ token, nombre: user.nombre, rol: user.rol, twoFactorEnabled: false });
    }
  );
});

app.post('/2fa/generate-secret', authenticate, (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(400).json({ error: 'Usuario inv?lido' });
  }

  connection.query(
    'SELECT email, two_fa_secret FROM usuarios WHERE id = ? LIMIT 1',
    [userId],
    async (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!Array.isArray(results) || results.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const user = results[0];
      if (user.two_fa_secret) {
        return res.status(400).json({ error: 'La autenticacion de dos factores ya esta habilitada' });
      }

  const issuer = config.get('TWO_FA_ISSUER', 'GoEnglish');
      const labelEmail = user.email || req.user.email || `usuario-${userId}`;
      const secret = speakeasy.generateSecret({
        name: `${issuer}:${labelEmail}`,
        issuer,
        length: 20,
      });

      try {
        const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);
        return res.json({
          secret: secret.base32,
          otpauthUrl: secret.otpauth_url,
          qrCodeDataURL,
        });
      } catch (qrError) {
        console.error('Error generating QR code:', qrError);
        return res.status(500).json({ error: 'No se pudo generar el codigo QR' });
      }
    }
  );
});

app.post('/2fa/verify-and-enable', authenticate, (req, res) => {
  const userId = req.user?.id;
  const { secret, code } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'Usuario inv?lido' });
  }

  if (!secret || !code) {
    return res.status(400).json({ error: 'Se requieren el secreto y el codigo de verificaci?n' });
  }

  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    // allow slight time drift
    window: 2,
  });

  if (!isValid) {
    return res.status(400).json({ error: 'Codigo de verificacion invalido' });
  }

  const encryptedSecret = encrypt(secret);

  connection.query(
    'UPDATE usuarios SET two_fa_secret = ? WHERE id = ?',
    [encryptedSecret, userId],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      return res.json({ success: true, message: 'Autenticacion de dos factores habilitada' });
    }
  );
});

app.get('/2fa/status', authenticate, (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(400).json({ error: 'Usuario invilido' });
  }

  connection.query(
    'SELECT two_fa_secret FROM usuarios WHERE id = ? LIMIT 1',
    [userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!Array.isArray(results) || results.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const hasTwoFA = Boolean(results[0].two_fa_secret);
      return res.json({ enabled: hasTwoFA });
    }
  );
});

// ====== OTP endpoints ======
// POST /auth/otp/send { channel: 'sms'|'email', email?, tempToken? }
app.post('/auth/otp/send', async (req, res) => {
  try {
    const { channel, email, tempToken } = req.body || {};
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';
    if (!rateLimitIp(String(ip))) {
      return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta luego.' });
    }
    if (!['sms', 'email'].includes(channel)) {
      return res.status(400).json({ error: 'Canal inválido' });
    }

    let user = null;
    if (tempToken) {
      try {
        const decoded = jwt.verify(tempToken, SECRET_KEY);
        const [u] = await new Promise((resolve, reject) => {
          connection.query('SELECT id, nombre, rol, email, telefono FROM usuarios WHERE id = ? LIMIT 1', [decoded.id], (err, results) => {
            if (err) return reject(err);
            resolve(results || []);
          });
        });
        user = u || null;
      } catch (e) {
        return res.status(401).json({ error: 'Sesion OTP inválida' });
      }
    } else if (email && isValidEmail(email)) {
      user = await getUserByEmail(email);
    }
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Validate phone number if SMS channel
    if (channel === 'sms') {
      if (!user.telefono || user.telefono.trim() === '') {
        return res.status(400).json({ 
          error: 'Número de teléfono no configurado',
          needsPhone: true,
          message: 'Debes configurar tu número de teléfono antes de recibir SMS'
        });
      }
    }

    // cooldown
    const [last] = await new Promise((resolve, reject) => {
      connection.query('SELECT sent_at FROM user_otp WHERE user_id = ? ORDER BY id DESC LIMIT 1', [user.id], (err, results) => (err ? reject(err) : resolve(results || [])));
    });
    if (last && last.sent_at) {
      const diff = (Date.now() - new Date(last.sent_at).getTime()) / 1000;
      if (diff < SEND_COOLDOWN_SECONDS) {
        return res.status(429).json({ error: `Espera ${Math.ceil(SEND_COOLDOWN_SECONDS - diff)}s para reenviar` });
      }
    }

    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const codeHash = hashCode(code);
    const sentAt = new Date();
    const expiresAt = addMinutes(sentAt, OTP_TTL_MINUTES);

    await new Promise((resolve, reject) => {
      connection.query('INSERT INTO user_otp (user_id, code_hash, channel, attempts, max_attempts, sent_at, expires_at) VALUES (?, ?, ?, 0, ?, ?, ?)',
        [user.id, codeHash, channel, MAX_ATTEMPTS, sentAt, expiresAt], (err) => (err ? reject(err) : resolve()));
    });

    try {
      if (channel === 'sms') {
        // El teléfono ya fue validado antes, podemos usarlo directamente
        await sendSms(user.telefono, `Tu código OTP es: ${code}. Expira en ${OTP_TTL_MINUTES} min.`);
      } else {
        await sendEmail(user.email, 'Tu código OTP', `Tu código OTP es: ${code}. Expira en ${OTP_TTL_MINUTES} min.`);
      }
    } catch (deliverErr) {
      console.error('OTP delivery error:', deliverErr.message);
      return res.status(503).json({ error: `No se pudo enviar por ${channel}: ${deliverErr.message}` });
    }

    res.json({ ok: true, ttlMinutes: OTP_TTL_MINUTES, cooldownSeconds: SEND_COOLDOWN_SECONDS });
  } catch (e) {
    console.error('OTP send error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /auth/otp/verify { code, email?, tempToken? }
app.post('/auth/otp/verify', async (req, res) => {
  try {
    const { code, email, tempToken } = req.body || {};
    if (!code || String(code).length < 4) return res.status(400).json({ error: 'Código requerido' });

    let user = null;
    if (tempToken) {
      try {
        const decoded = jwt.verify(tempToken, SECRET_KEY);
        const [u] = await new Promise((resolve, reject) => {
          connection.query('SELECT id, nombre, rol, email FROM usuarios WHERE id = ? LIMIT 1', [decoded.id], (err, results) => (err ? reject(err) : resolve(results || [])));
        });
        user = u || null;
      } catch (e) {
        return res.status(401).json({ error: 'Sesion OTP inválida' });
      }
    } else if (email && isValidEmail(email)) {
      user = await getUserByEmail(email);
    }
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const rows = await new Promise((resolve, reject) => {
      connection.query('SELECT id, code_hash, attempts, max_attempts, expires_at FROM user_otp WHERE user_id = ? ORDER BY id DESC LIMIT 1', [user.id], (err, results) => (err ? reject(err) : resolve(results || [])));
    });
    if (!rows.length) return res.status(400).json({ error: 'Código OTP inválido' });
    const otp = rows[0];
    const nowDt = new Date();
    if (new Date(otp.expires_at) < nowDt) return res.status(400).json({ error: 'Código OTP vencido' });
    if (otp.attempts >= otp.max_attempts) return res.status(429).json({ error: 'Demasiados intentos' });

    const ok = hashCode(code) === otp.code_hash;
    if (!ok) {
      await new Promise((resolve, reject) => {
        connection.query('UPDATE user_otp SET attempts = attempts + 1 WHERE id = ?', [otp.id], (err) => (err ? reject(err) : resolve()));
      });
      return res.status(400).json({ error: 'Código OTP inválido' });
    }

    await new Promise((resolve, reject) => {
      connection.query('DELETE FROM user_otp WHERE id = ?', [otp.id], (err) => (err ? reject(err) : resolve()));
    });

    if (tempToken) {
      const payload = buildAuthPayload(user);
      const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '8h' });
      return res.json({ success: true, token, nombre: user.nombre, rol: user.rol });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('OTP verify error:', e);
    res.status(500).json({ error: 'Error interno' });
  }
});
// Deshabilitar 2FA (requiere codigo de verificacion valido)
app.post('/2fa/disable', authenticate, (req, res) => {
  const userId = req.user?.id;
  const { code } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: 'Usuario invalido' });
  }
  if (!code) {
    return res.status(400).json({ error: 'Codigo requerido' });
  }

  connection.query(
    'SELECT two_fa_secret FROM usuarios WHERE id = ? LIMIT 1',
    [userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!Array.isArray(results) || results.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const encrypted = results[0].two_fa_secret;
      if (!encrypted) {
        return res.status(400).json({ error: 'El usuario no tiene 2FA habilitado' });
      }

      const secret = decrypt(encrypted);
      if (!secret) {
        return res.status(400).json({ error: 'No se pudo validar el secreto 2FA' });
      }

      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 1,
      });

      if (!isValid) {
        return res.status(400).json({ error: 'Codigo 2FA invalido' });
      }

      connection.query(
        'UPDATE usuarios SET two_fa_secret = NULL WHERE id = ?',
        [userId],
        (upErr) => {
          if (upErr) {
            return res.status(500).json({ error: upErr.message });
          }
          return res.json({ success: true, message: 'Autenticacion de dos factores deshabilitada' });
        }
      );
    }
  );
});

app.post('/2fa/verify-login', (req, res) => {
  const { tempToken, code } = req.body || {};

  if (!tempToken || !code) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  jwt.verify(tempToken, SECRET_KEY, (err, decoded) => {
    if (err || !decoded?.twoFactorPending || !decoded?.id) {
      return res.status(401).json({ error: 'Sesi?n de verificaci?n inv?lida o expirada' });
    }

    connection.query(
      'SELECT id, nombre, rol, email, two_fa_secret FROM usuarios WHERE id = ? LIMIT 1',
      [decoded.id],
      (dbErr, results) => {
        if (dbErr) {
          return res.status(500).json({ error: dbErr.message });
        }
        if (!Array.isArray(results) || results.length === 0) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = results[0];
        const storedSecret = decrypt(user.two_fa_secret);
        if (!storedSecret) {
          return res.status(400).json({ error: 'El usuario no tiene 2FA configurado' });
        }

        const isValid = speakeasy.totp.verify({
          secret: storedSecret,
          encoding: 'base32',
          token: code,
          // allow slight time drift
          window: 2,
        });

        if (!isValid) {
          return res.status(400).json({ error: 'C?digo 2FA inv?lido' });
        }

        const payload = buildAuthPayload(user);
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '8h' });

        return res.json({
          token,
          nombre: user.nombre,
          rol: user.rol,
          twoFactorEnabled: true,
        });
      }
    );
  });
});

// PUT /user/phone - Actualizar teléfono del usuario
app.put('/user/phone', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { telefono } = req.body || {};

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!telefono || typeof telefono !== 'string') {
      return res.status(400).json({ error: 'Número de teléfono requerido' });
    }

    // Validar formato internacional básico (+1234567890)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleanPhone = telefono.trim();
    
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        error: 'Formato de teléfono inválido',
        message: 'Usa formato internacional: +1234567890'
      });
    }

    // Actualizar en la base de datos
    await new Promise((resolve, reject) => {
      connection.query(
        'UPDATE usuarios SET telefono = ? WHERE id = ?',
        [cleanPhone, userId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    res.json({ 
      ok: true, 
      message: 'Teléfono actualizado correctamente',
      telefono: cleanPhone
    });
  } catch (error) {
    console.error('Error actualizando teléfono:', error);
    res.status(500).json({ error: 'Error interno al actualizar teléfono' });
  }
});

// GET /user/phone - Obtener teléfono del usuario
app.get('/user/phone', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const [user] = await new Promise((resolve, reject) => {
      connection.query(
        'SELECT telefono FROM usuarios WHERE id = ? LIMIT 1',
        [userId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        }
      );
    });

    res.json({ 
      telefono: user?.telefono || null,
      hasTelefono: Boolean(user?.telefono)
    });
  } catch (error) {
    console.error('Error obteniendo teléfono:', error);
    res.status(500).json({ error: 'Error interno al obtener teléfono' });
  }
});

// Health + routes debug helpers
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'auth-service' });
});

app.get('/_debug/routes', (req, res) => {
  try {
    const routes = [];
    app._router.stack.forEach((m) => {
      if (m.route) {
        routes.push({ path: m.route.path, methods: Object.keys(m.route.methods || {}) });
      } else if (m.name === 'router' && m.handle && m.handle.stack) {
        m.handle.stack.forEach((h) => {
          if (h.route) {
            routes.push({ path: h.route.path, methods: Object.keys(h.route.methods || {}) });
          }
        });
      }
    });
    res.json(routes);
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron listar rutas', message: e.message });
  }
});

app.listen(3001, async () => {
  console.log('Auth Service corriendo en http://localhost:3001');
  
  // Inicializar proveedores y mostrar configuración
  await ensureProviders();
  
  // Verificar configuración de Twilio
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM) {
    console.log('[Auth Service] ✓ Twilio SMS: Configurado');
    console.log(`[Auth Service]   - Account SID: ${env.TWILIO_ACCOUNT_SID.substring(0, 10)}...`);
    console.log(`[Auth Service]   - From Number: ${env.TWILIO_FROM}`);
  } else {
    console.log('[Auth Service] ⚠ Twilio SMS: NO configurado (las variables están vacías)');
  }
  
  // Verificar configuración de SMTP
  if (env.SMTP_HOST && env.SMTP_USER) {
    console.log('[Auth Service] ✓ SMTP Email: Configurado');
    console.log(`[Auth Service]   - Host: ${env.SMTP_HOST}:${env.SMTP_PORT}`);
    console.log(`[Auth Service]   - User: ${env.SMTP_USER}`);
  } else {
    console.log('[Auth Service] ⚠ SMTP Email: NO configurado');
  }
});
