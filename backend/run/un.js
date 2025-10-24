// Simple orchestrator to start all backend services
// backend/run/un.js
// Simple orchestrator to start all backend services
// Usage: node backend/run/un.js

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Discover service folders dynamically (everything under backend/ except this run/ folder)
const servicesDir = path.join(__dirname, '..');
let services = [];
try {
  services = fs.readdirSync(servicesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'run')
    .map((d) => d.name);
} catch (e) {
  console.error('[run][ERR] Failed to read services directory:', e.message);
}

// Primary Node executable (the current process.execPath). We'll attempt to spawn using it
// but catch synchronous spawn failures and fall back to "node" from PATH (using a shell on Windows).
const NODE_PRIMARY = process.execPath || null;
const NODE_FALLBACK = 'node';
const FALLBACK_USE_SHELL = process.platform === 'win32';

const buildChildEnv = (serviceName) => {
  const childEnv = {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  if (!childEnv.SERVICE_NAME) {
    childEnv.SERVICE_NAME = serviceName;
  }

  if (!childEnv.SERVICE_PREFIX) {
    childEnv.SERVICE_PREFIX = serviceName.replace(/[^0-9a-zA-Z]+/g, '_').toUpperCase();
  }

  return childEnv;
};

function startService(name) {
  const servicePath = path.join(__dirname, '..', name);
  const scriptPath = path.join(servicePath, 'app.js');

  if (!fs.existsSync(servicePath)) {
    console.error(`[${name}][ERR] Service folder not found: ${servicePath}. Skipping.`);
    return null;
  }
  if (!fs.existsSync(scriptPath)) {
    console.error(`[${name}][ERR] app.js not found at: ${scriptPath}. Skipping.`);
    return null;
  }

  // Spawn the child process. Wrap spawn in try/catch to catch synchronous errors
  // (for example when process.execPath points to a missing binary). If the
  // first attempt fails, try the fallback 'node' from PATH (with shell on Win).
  let proc = null;
  let used = null;
  try {
    const env = buildChildEnv(name);
    if (NODE_PRIMARY && fs.existsSync(NODE_PRIMARY)) {
      proc = spawn(NODE_PRIMARY, [scriptPath], {
        cwd: servicePath,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      });
      used = NODE_PRIMARY;
    } else {
      // If execPath isn't present on disk, immediately use fallback
      throw new Error('Primary Node binary not found on disk');
    }
  } catch (err) {
    // First spawn attempt failed synchronously. Try fallback
    try {
      const env = buildChildEnv(name);
      proc = spawn(NODE_FALLBACK, [scriptPath], {
        cwd: servicePath,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: FALLBACK_USE_SHELL,
      });
      used = NODE_FALLBACK + (FALLBACK_USE_SHELL ? ' (shell)' : '');
      console.log(`[${name}] Spawned using fallback ${used}`);
    } catch (err2) {
      console.error(`[${name}][ERR] Failed to spawn service using both primary and fallback Node executables.`, err2.message);
      return null;
    }
  }

  proc.stdout.on('data', (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });
  proc.stderr.on('data', (data) => {
    process.stderr.write(`[${name}][ERR] ${data}`);
  });
  proc.on('error', (err) => {
    // As a last resort, log and continue. Most spawn problems are caught above
    // by the try/catch around spawn. This handler prevents uncaught 'error'
    // events from terminating the orchestrator.
    console.error(`[${name}][ERR] Child process error event: ${err.code || err.message}`);
  });
  proc.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] exited due to signal ${signal}`);
    } else {
      console.log(`[${name}] exited with code ${code}`);
    }
  });

  return proc;
}

console.log('Starting backend services...');
const processes = services.map(startService).filter(Boolean);

function shutdown() {
  console.log('\nShutting down services...');
  processes.forEach((p) => {
    if (p && !p.killed) {
      try { p.kill(); } catch (_) {}
    }
  });
  // give a breath for children to exit
  setTimeout(() => process.exit(0), 250);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// In case Windows CTRL_CLOSE event doesn't emit SIGINT reliably
if (process.platform === 'win32') {
  const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
  rl.on('SIGINT', () => process.emit('SIGINT'));
}

console.log('All start commands dispatched. Press Ctrl+C to stop.');

// Extra hint on first run if the primary execPath is missing or invalid
if (!NODE_PRIMARY || !fs.existsSync(NODE_PRIMARY)) {
  console.log('[hint] The Node executable used by this process (process.execPath) appears missing.');
  console.log('[hint] The orchestrator will try "node" from your PATH as a fallback. If services fail with ENOENT, run "where node" in PowerShell/CMD and fix your PATH or reinstall Node.');
}
