const mysql = require('mysql2/promise');
const { createConfig } = require('../config');
const { str } = require('envalid');

const config = createConfig({
  serviceName: 'chat-service',
  serviceRoot: __dirname,
  overrides: {
    AUTH_DB_NAME: str({ default: 'instenglish_auth' }),
  },
  defaults: {
    PORT: 3010,
    DB_NAME: 'instenglish_chat',
  },
});

const { env } = config;

async function verifySchema() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: env.DB_PORT,
  });

  try {
    console.log('✅ Conectado a la base de datos:', env.DB_NAME);
    
    // Verificar columnas de la tabla messages
    const [columns] = await connection.execute(
      'SHOW COLUMNS FROM messages'
    );
    
    console.log('\n📋 Columnas de la tabla messages:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    // Verificar columnas específicas necesarias
    const requiredColumns = [
      'message_type',
      'file_url',
      'metadata',
      'edited_at',
      'is_deleted',
      'deleted_at',
      'deleted_by'
    ];

    console.log('\n🔍 Verificando columnas requeridas:');
    const columnNames = columns.map(col => col.Field);
    requiredColumns.forEach(reqCol => {
      const exists = columnNames.includes(reqCol);
      console.log(`  ${exists ? '✅' : '❌'} ${reqCol}: ${exists ? 'EXISTE' : 'FALTA'}`);
    });

    // Verificar tabla message_user_states
    try {
      const [userStatesColumns] = await connection.execute(
        'SHOW COLUMNS FROM message_user_states'
      );
      console.log('\n✅ Tabla message_user_states existe');
      console.log('📋 Columnas:');
      userStatesColumns.forEach(col => {
        console.log(`  - ${col.Field}`);
      });
    } catch (error) {
      console.log('\n❌ Tabla message_user_states NO existe');
    }

    // Verificar un mensaje de ejemplo con metadata
    const [messages] = await connection.execute(
      'SELECT id, room_id, sender_id, content, message_type, file_url, metadata FROM messages WHERE metadata IS NOT NULL LIMIT 5'
    );

    if (messages.length > 0) {
      console.log('\n📨 Mensajes con metadata (muestra):');
      messages.forEach(msg => {
        console.log(`\n  ID: ${msg.id}`);
        console.log(`  Type: ${msg.message_type}`);
        console.log(`  File URL: ${msg.file_url || '(ninguno)'}`);
        console.log(`  Metadata (raw):`, msg.metadata);
        console.log(`  Metadata (type):`, typeof msg.metadata);
        if (msg.metadata) {
          try {
            const metadataObj = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : msg.metadata;
            console.log(`  Metadata (parsed):`, JSON.stringify(metadataObj, null, 2));
            console.log(`  Attachments en metadata:`, metadataObj.attachments ? metadataObj.attachments.length : 0);
            if (metadataObj.attachments && metadataObj.attachments.length > 0) {
              console.log(`  Primer attachment:`, JSON.stringify(metadataObj.attachments[0], null, 2));
            }
          } catch (e) {
            console.log(`  ⚠️ Error parseando metadata:`, e.message);
          }
        }
      });
    } else {
      console.log('\n⚠️ No hay mensajes con metadata en la base de datos');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

verifySchema().catch(console.error);
