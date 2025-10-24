const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { createConfig } = require('../config');

const app = express();
const config = createConfig({
  serviceName: 'asignation-curso-service',
  serviceRoot: __dirname,
  defaults: {
    DB_NAME: 'intenglish_curso',
    PORT: 3009,
  },
});

const { env, corsOrigins } = config;

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  })
);
app.use(express.json());

const pool = mysql.createPool(config.dbPoolConfig());

app.post('/api/asignaciones-curso', async (req, res) => {
  const {
    estudianteNombre,
    profesorNombre,
    cursoNombre,
    capacidad,
    hora_inicio,
    hora_fin,
    fecha_inicio,
    aula,
  } = req.body;

  try {
    const fechaFormateada = fecha_inicio && fecha_inicio.includes('T')
      ? fecha_inicio.split('T')[0]
      : fecha_inicio;

    const insertQuery = `
      INSERT INTO asignacionar_curso
      (estudianteNombre, profesorNombre, cursoNombre, capacidad, hora_inicio, hora_fin, fecha_inicio, aula)
      VALUES (?,?,?,?,?,?,?,?)
    `;

    const [result] = await pool.execute(insertQuery, [
      estudianteNombre,
      profesorNombre,
      cursoNombre,
      capacidad,
      hora_inicio,
      hora_fin,
      fechaFormateada,
      aula,
    ]);

    res.status(201).json({ message: 'Asignación creada', id: result.insertId });
  } catch (err) {
    console.error('Error al guardar la asignación:', err);
    res.status(500).json({ error: 'Error al guardar la asignación' });
  }
});

app.listen(env.PORT, () => {
  console.log(`API de Asignaciones (curso) escuchando en http://localhost:${env.PORT}`);
});