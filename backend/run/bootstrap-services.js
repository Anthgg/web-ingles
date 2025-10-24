#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendRoot = path.resolve(__dirname, '..');
const shell = process.platform === 'win32';

const args = new Set(process.argv.slice(2));
const skipInstall = args.has('--skip-install');
const skipTest = args.has('--skip-test');

function discoverServices() {
  return fs
    .readdirSync(backendRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'run')
    .filter((d) => d.name.endsWith('-service'))
    .map((d) => d.name);
}

function run(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: 'inherit',
    shell,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${commandArgs.join(' ')} failed with code ${result.status}`);
  }
}

function installAndTest(serviceDir) {
  const absolute = path.join(backendRoot, serviceDir);
  console.log(`\n=== ${serviceDir} ===`);

  if (!skipInstall) {
    console.log(`-> Instalando dependencias en ${serviceDir}`);
    run('npm', ['install'], absolute);
  }

  if (!skipTest) {
    console.log(`-> Ejecutando pruebas (npm test) en ${serviceDir}`);
    run('npm', ['test'], absolute);
  }
}

(function main() {
  const services = discoverServices();
  if (services.length === 0) {
    console.log('No se encontraron servicios para procesar.');
    return;
  }

  console.log('Servicios detectados:', services.join(', '));

  try {
    for (const service of services) {
      installAndTest(service);
    }
    console.log('\n✅ Instalación y pruebas completadas sin errores.');
  } catch (err) {
    console.error('\n❌ Proceso abortado:', err.message);
    process.exit(1);
  }
})();
