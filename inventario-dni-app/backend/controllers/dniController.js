const axios = require('axios');
const initDb = require('../utils/db');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function consultar(req, res) {
  const { dni } = req.body;
  if (!dni) return res.status(400).json({ message: 'DNI requerido' });
  const db = await initDb();
  let nombres = 'No disponible';
  let apellidos = 'No disponible';
  let estado = 'sin validar';
  try {
    if (process.env.API_DNI_URL && process.env.API_DNI_KEY) {
      const response = await axios.get(`${process.env.API_DNI_URL}?numero=${dni}`, {
        headers: { Authorization: `Bearer ${process.env.API_DNI_KEY}` }
      });
      nombres = response.data.nombres || response.data.nombres || 'No disponible';
      apellidos = `${response.data.apellidoPaterno || ''} ${response.data.apellidoMaterno || ''}`.trim();
      estado = response.data.estadoCivil || 'validado';
    } else {
      nombres = 'Consulta simulada';
      apellidos = 'API_DNI no configurada';
      estado = 'simulado';
    }
  } catch (err) {
    estado = 'error';
  }
  await db.run('INSERT INTO consultas_dni (dni, nombres, apellidos, estado, usuario_id) VALUES (?,?,?,?,?)', [
    dni,
    nombres,
    apellidos,
    estado,
    req.user?.id || null
  ]);
  res.json({ dni, nombres, apellidos, estado });
}

async function historial(req, res) {
  const db = await initDb();
  const consultas = await db.all(
    `SELECT c.*, u.nombre as usuario_nombre FROM consultas_dni c
     LEFT JOIN usuarios u ON u.id = c.usuario_id
     ORDER BY c.created_at DESC`
  );
  res.json(consultas);
}

module.exports = { consultar, historial };
