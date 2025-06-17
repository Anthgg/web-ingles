const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const connection = mysql.createConnection({
  host: 'instenglish-auth.c50qcacwip4o.us-east-2.rds.amazonaws.com',
  user: 'admin',
  password: 'GgAnth17',
  database: 'intenglish_curso',
  port: 3306,
});

connection.connect(err => {
  if (err) console.error('DB error:', err);
  else console.log('DB conectada');
});

app.post('/api/asignaciones-curso', (req, res) => {
  console.log('Datos recibidos:', req.body);
  
  const {
    estudianteNombre,
    profesorNombre,
    cursoNombre,
    capacidad,
    hora_inicio,
    hora_fin,
    fecha_inicio,
    aula
  } = req.body;

  // Convertir fecha_inicio al formato correcto
  let fechaFormateada = fecha_inicio;
  if (fecha_inicio && fecha_inicio.includes('T')) {
    fechaFormateada = fecha_inicio.split('T')[0]; // Extrae solo la parte de fecha YYYY-MM-DD
  }

  const insertQuery = `
    INSERT INTO asignacionar_curso
    (estudianteNombre, profesorNombre, cursoNombre, capacidad, hora_inicio, hora_fin, fecha_inicio, aula)
    VALUES (?,?,?,?,?,?,?,?)
  `;

  connection.query(
    insertQuery,
    [estudianteNombre, profesorNombre, cursoNombre, capacidad, hora_inicio, hora_fin, fechaFormateada, aula],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error al guardar la asignación' });
      }
      res.status(201).json({ message: 'Asignación creada', id: result.insertId });
    }
  );
});

app.listen(3009, () => console.log('API de Asignaciones con JWT corriendo en http://localhost:3009'));