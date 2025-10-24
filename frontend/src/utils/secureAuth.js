// Simple AES-GCM encryption for auth token using Web Crypto API
// Note: Client-side encryption with a static passphrase only obfuscates the token.
// Do not rely on this as a security boundary.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const PASSPHRASE = 'goenglish_ui_secret_2025';
const SALT_STR = 'goenglish_salt_v1';
const SALT = encoder.encode(SALT_STR);

async function getKeyMaterial() {
  return await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(PASSPHRASE),
    'PBKDF2',
    false,
    ['deriveKey']
  );
}

async function getAesKey() {
  const keyMaterial = await getKeyMaterial();
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 150000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

function b64ToBuf(b64) {
  const str = atob(b64);
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
  return buf.buffer;
}

export async function encryptToken(token) {
  const key = await getAesKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ct = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(token)
  );
  const payload = new Uint8Array(iv.length + new Uint8Array(ct).length);
  payload.set(iv, 0);
  payload.set(new Uint8Array(ct), iv.length);
  return bufToB64(payload.buffer);
}

export async function decryptToken(encB64) {
  const bytes = new Uint8Array(b64ToBuf(encB64));
  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);
  const key = await getAesKey();
  const pt = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return decoder.decode(pt);
}

const STORAGE_KEY = 'goenglish:authToken';
const LEGACY_KEYS = ['authToken'];

export async function secureStoreToken(token) {
  try {
    const enc = await encryptToken(token);
    window.localStorage.setItem(STORAGE_KEY, 'ENC:' + enc);
  } catch (e) {
    // Fallback to plain string if WebCrypto fails
    try { window.localStorage.setItem(STORAGE_KEY, token); } catch (_) {}
  }
}

export async function secureReadToken() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || '';
    if (raw.startsWith('ENC:')) {
      const enc = raw.slice(4);
      try { return await decryptToken(enc); } catch (_) { return ''; }
    }
    return raw;
  } catch (_) {
    return '';
  }
}

export async function migrateStoredTokenIfNeeded() {
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current && current.startsWith('ENC:')) return;
    if (current && !current.startsWith('ENC:')) {
      await secureStoreToken(current);
      return;
    }
    // migrate legacy keys
    for (const k of LEGACY_KEYS) {
      const legacy = window.localStorage.getItem(k);
      if (legacy) {
        await secureStoreToken(legacy);
        try { window.localStorage.removeItem(k); } catch (_) {}
        break;
      }
    }
  } catch (_) {}
}
