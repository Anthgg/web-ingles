const { createConfig } = require('../config');
const { db } = require('@campus/base-middleware');
const fs = require('fs');

// Initialize config (this loads .env)
const config = createConfig({
    serviceName: 'user-service',
    serviceRoot: __dirname,
    defaults: {
        DB_NAME: 'instenglish_auth',
        PORT: 3002,
    },
});

// Configure DB
db.configure(config.dbPoolConfig());

async function run() {
    try {
        console.log('Attempting to query non-existent column...');
        // Assuming 'usuarios' table exists, otherwise we get ER_NO_SUCH_TABLE
        await db.query('SELECT non_existent_column FROM usuarios LIMIT 1');
    } catch (error) {
        const output = {
            type: error.constructor.name,
            message: error.message,
            keys: Object.keys(error),
            full: error,
            details: error.details
        };
        fs.writeFileSync('debug-result.json', JSON.stringify(output, null, 2));
        console.log('Error written to debug-result.json');
    } finally {
        await db.close();
    }
}

run();
