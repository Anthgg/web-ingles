#!/usr/bin/env node

const path = require('path');
const { createConfig } = require('../config');

const args = process.argv.slice(2);
let overrideRoot;
let overrideName;

for (let i = 0; i < args.length; i += 1) {
  const current = args[i];
  const next = args[i + 1];
  if (current === '--service-root' && next) {
    overrideRoot = path.resolve(process.cwd(), next);
    i += 1;
  } else if (current === '--service-name' && next) {
    overrideName = next;
    i += 1;
  }
}

(async () => {
  try {
    const serviceRoot = overrideRoot || process.cwd();
    const config = createConfig({
      serviceRoot,
      serviceName: overrideName,
      silent: true,
    });

    // Report useful details for the developer
    const report = {
      serviceName: config.serviceName,
      nodeEnv: config.env.NODE_ENV,
      port: config.env.PORT,
      dbHost: config.env.DB_HOST,
      dbName: config.env.DB_NAME,
    };

    console.log(`[smoke] Configuración válida para ${report.serviceName}`);
    console.table(report);
    process.exit(0);
  } catch (err) {
    console.error('[smoke][ERR] Falló la validación de configuración:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
})();
