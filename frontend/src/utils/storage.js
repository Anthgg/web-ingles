import { secureStoreToken } from './secureAuth';

const isLikelyJson = (value) => {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  return (
    (s.startsWith('{') && s.endsWith('}')) ||
    (s.startsWith('[') && s.endsWith(']')) ||
    (s.startsWith('"') && s.endsWith('"'))
  );
};

export const safeStorageSet = (storage, key, value) => {
  try {
    const serialized = JSON.stringify(value);
    storage.setItem(key, serialized);
  } catch (e) {
    try { storage.setItem(key, String(value)); } catch (_) {}
  }
};

export const safeStorageGet = (storage, key, defaultValue = '') => {
  try {
    const raw = storage.getItem(key);
    if (raw == null) return defaultValue;
    const s = raw.trim();
    if (s === '[object Object]') {
      try { storage.removeItem(key); } catch (_) {}
      return defaultValue;
    }
    if (isLikelyJson(s)) {
      try {
        return JSON.parse(s);
      } catch (_) {
        try { storage.removeItem(key); } catch (_) {}
        return defaultValue;
      }
    }
    return raw;
  } catch (_) {
    return defaultValue;
  }
};

export const safeStorageGetString = (storage, key, defaultValue = '') => {
  const v = safeStorageGet(storage, key, defaultValue);
  return typeof v === 'string' ? v : defaultValue;
};

export const sanitizeWebStorage = () => {
  const sanitize = (storage) => {
    try {
      for (let i = storage.length - 1; i >= 0; i--) {
        const k = storage.key(i);
        if (!k) continue;
        const v = storage.getItem(k);
        if (v == null) continue;
        const s = String(v).trim();
        if (s === '[object Object]') {
          storage.removeItem(k);
          continue;
        }
        if (isLikelyJson(s)) {
          try { JSON.parse(s); } catch (_) { storage.removeItem(k); }
        }
      }
    } catch (_) {}
  };
  try { sanitize(window.localStorage); } catch (_) {}
  try { sanitize(window.sessionStorage); } catch (_) {}
};

export const removeLegacyStorageKeys = () => {
  const legacyKeys = ['authToken', 'app-theme'];
  try {
    legacyKeys.forEach((k) => {
      try { window.localStorage.removeItem(k); } catch (_) {}
      try { window.sessionStorage.removeItem(k); } catch (_) {}
    });
  } catch (_) {}
};

export const patchStorageWriters = () => {
  try {
    const orig = Storage.prototype.setItem;
    if (!orig.__wrapped) {
      const wrapped = function patchedSetItem(key, value) {
        try {
          if (value && typeof value === 'object') {
            return orig.call(this, key, JSON.stringify(value));
          }
          const s = String(value);
          if (s === '[object Object]') {
            return orig.call(this, key, JSON.stringify({}));
          }
        } catch (_) {}
        return orig.call(this, key, value);
      };
      wrapped.__wrapped = true;
      Storage.prototype.setItem = wrapped;
    }
  } catch (_) {}
};

export const persistTokenSafely = async (token) => {
  try {
    await secureStoreToken(token);
  } catch (_) {}
};
