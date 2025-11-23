const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const initDb = require('./utils/db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Initialize DB
initDb();

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/productos', require('./routes/productRoutes'));
app.use('/api/movimientos', require('./routes/movementRoutes'));
app.use('/api/usuarios', require('./routes/userRoutes'));
app.use('/api/dni', require('./routes/dniRoutes'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Servidor iniciado en puerto ${port}`));
