const { createConfig } = require('../config');
const { db } = require('@campus/base-middleware');

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
        console.log('Attempting to run fallback query: SELECT * FROM usuarios LIMIT 1');
        const users = await db.query('SELECT * FROM usuarios LIMIT 1');
        console.log('Query successful. Row count:', users.length);
        if (users.length > 0) {
            console.log('First user keys:', Object.keys(users[0]));
        }
    } catch (error) {
        console.log('\n--- CAUGHT ERROR ---');
        console.log('Type:', error.constructor.name);
        console.log('Message:', error.message);
        console.log('Details:', JSON.stringify(error.details, null, 2));
    } finally {
        await db.close();
    }
}

run();
