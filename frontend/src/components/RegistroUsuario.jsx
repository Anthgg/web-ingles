import React, { useState } from 'react';
import axios from 'axios';

const RegistroUsuario = ({ tipo, onSuccess, onError }) => {
  const [form, setForm] = useState({
    nombre: '',
    dni: '',
    edad: '',
    telefono: '',
    email: '',
    direccion: '',
    rol: tipo, // 'estudiante' o 'profesor'
    datosApi: null
  });
  const [loading, setLoading] = useState(false);

  // API gratuita para DNI Perú: https://dniruc.apisperu.com/api/v1/dni/{dni}?token=demo
  const fetchDatosDni = async (dni) => {
    try {
      const res = await axios.get(`https://dniruc.apisperu.com/api/v1/dni/${dni}?token=demo`);
      if (res.data && res.data.success) {
        setForm(f => ({ ...f, nombre: res.data.nombres + ' ' + res.data.apellidoPaterno + ' ' + res.data.apellidoMaterno, datosApi: res.data }));
      } else {
        onError && onError('DNI no encontrado');
      }
    } catch {
      onError && onError('Error consultando DNI');
    }
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'dni' && e.target.value.length === 8) {
      fetchDatosDni(e.target.value);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      // Aquí iría el endpoint de tu backend para registrar usuario
      await axios.post('http://localhost:3002/usuarios', form);
      onSuccess && onSuccess('Usuario registrado correctamente');
      setForm({ nombre: '', dni: '', edad: '', telefono: '', email: '', direccion: '', rol: tipo, datosApi: null });
    } catch {
      onError && onError('Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 neo-card">
      <h4>Registro de {tipo === 'estudiante' ? 'Estudiante' : 'Profesor'}</h4>
      <div className="mb-3">
        <label>DNI</label>
        <input type="text" name="dni" value={form.dni} onChange={handleChange} maxLength={8} className="form-control" required />
      </div>
      <div className="mb-3">
        <label>Nombre</label>
        <input type="text" name="nombre" value={form.nombre} onChange={handleChange} className="form-control" required />
      </div>
      <div className="mb-3">
        <label>Edad</label>
        <input type="number" name="edad" value={form.edad} onChange={handleChange} className="form-control" required />
      </div>
      <div className="mb-3">
        <label>Teléfono</label>
        <input type="text" name="telefono" value={form.telefono} onChange={handleChange} className="form-control" required />
      </div>
      <div className="mb-3">
        <label>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} className="form-control" required />
      </div>
      <div className="mb-3">
        <label>Dirección</label>
        <input type="text" name="direccion" value={form.direccion} onChange={handleChange} className="form-control" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Registrando...' : 'Registrar'}
      </button>
    </form>
  );
};

export default RegistroUsuario;
