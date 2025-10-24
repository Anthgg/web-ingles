import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

const DatosPersonalesUsuario = ({ usuarioId, onSuccess, onError, onCompleted }) => {
  const [form, setForm] = useState({
    dni: '',
    edad: '',
    telefono: '',
    email: '',
    direccion: '',
  });
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!usuarioId) return;
    try {
      const res = await apiClient.get(`http://localhost:3002/datos-personales/${usuarioId}`);
      if (!res.data) return;
      setForm({
        dni: res.data.dni || '',
        edad: res.data.edad != null ? String(res.data.edad) : '',
        telefono: res.data.telefono || '',
        email: res.data.email || '',
        direccion: res.data.direccion || '',
      });
    } catch (error) {
      // No data yet or sin permisos, se ignora para permitir crear
    }
  }, [usuarioId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('http://localhost:3002/datos-personales', {
        usuario_id: usuarioId,
        dni: form.dni,
        edad: Number(form.edad),
        telefono: form.telefono,
        email: form.email,
        direccion: form.direccion,
      });
      onSuccess && onSuccess('Datos personales actualizados');
      onCompleted && onCompleted();
      await loadData();
    } catch (error) {
      onError && onError(error.message || 'Error al actualizar datos personales');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 neo-card">
      <h4>Datos Personales</h4>
      <div className="mb-3">
        <label>DNI</label>
        <input type="text" name="dni" value={form.dni} onChange={handleChange} maxLength={12} className="form-control" required />
      </div>
      <div className="mb-3">
        <label>Edad</label>
        <input type="number" name="edad" value={form.edad} onChange={handleChange} min={0} max={120} className="form-control" required />
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
      <button type="submit" className="btn btn-success" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
};

export default DatosPersonalesUsuario;
