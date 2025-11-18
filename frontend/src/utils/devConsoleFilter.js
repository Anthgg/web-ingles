// Filters noisy console errors in development caused by browser extensions
// that try to JSON.parse arbitrary storage changes (e.g., content.js).
// This NEVER runs in production builds.

/* eslint-disable no-console */
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
  const suspects = ['content.js', 'content-all.js'];
  const textMatches = [
    'is not valid JSON',
    '[object Object]',
    '_storageChangeDispatcher',
    'Error verificando 2FA',
  ];

  const containsAny = (str = '', parts = []) => parts.some((p) => str.includes(p));

  const shouldSuppress = (args = [], source = '', err = null) => {
    try {
      const msg = args.map((a) => (typeof a === 'string' ? a : (a && a.message) || '')).join(' | ');
      const stack = (err && err.stack) || (args.find((a) => a && a.stack)?.stack) || '';
      const looksLikeJsonNoise = msg.includes('[object Object]') && msg.includes('not valid JSON');
      if (looksLikeJsonNoise) {
        return true;
      }
      const suspectSource =
        containsAny(source || '', suspects) || containsAny(stack, suspects) || containsAny(msg, suspects);
      return (containsAny(msg, textMatches) || containsAny(stack, textMatches)) && suspectSource;
    } catch (_) {
      return false;
    }
  };

  try {
    const originalError = console.error.bind(console);
    console.error = (...args) => {
      if (shouldSuppress(args)) return;
      originalError(...args);
    };
  } catch (_) {}

  try {
    const originalWarn = console.warn.bind(console);
    console.warn = (...args) => {
      if (shouldSuppress(args)) return;
      originalWarn(...args);
    };
  } catch (_) {}

  try {
    window.addEventListener(
      'error',
      (e) => {
        if (shouldSuppress([e.message], e.filename, e.error)) {
          e.preventDefault();
        }
      },
      true
    );

    window.addEventListener(
      'unhandledrejection',
      (e) => {
        const msg = (e.reason && (e.reason.message || String(e.reason))) || '';
        if (shouldSuppress([msg], '', e.reason)) {
          e.preventDefault();
        }
      },
      true
    );
  } catch (_) {}
}
