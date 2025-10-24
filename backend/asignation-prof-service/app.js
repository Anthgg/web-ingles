// Este servicio reutiliza la lógica principal de asignaciones, pero levanta una
// instancia en un puerto diferente (3008) para mantener compatibilidad con clientes existentes.
const path = require('path');
const { createConfig } = require('../config');

if (!process.env.PORT) {
  process.env.PORT = '3008';
}

const bootstrapConfig = createConfig({
  serviceName: 'asignation-prof-service',
  serviceRoot: path.resolve(__dirname, '../asignation-service'),
  defaults: {
    PORT: 3008,
    DB_NAME: 'instenglish_asignation',
  },
});

console.log('[Asignation Prof Service] Iniciando instancia secundaria en puerto', bootstrapConfig.env.PORT);

require('../asignation-service/app');
