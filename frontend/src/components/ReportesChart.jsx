import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const ReportesChart = ({ usuarios, clases, asistencias, calificaciones }) => {
  // Datos para gráfico de usuarios por rol
  const usuariosPorRol = [
    { name: 'Estudiantes', value: usuarios?.filter(u => u.rol === 'estudiante').length || 0 },
    { name: 'Profesores', value: usuarios?.filter(u => u.rol === 'profesor' || u.rol === 'docente').length || 0 },
    { name: 'Administradores', value: usuarios?.filter(u => u.rol === 'admin').length || 0 }
  ];

  // Datos para gráfico de clases por materia (simplificado)
  const clasesPorMateria = clases?.reduce((acc, clase) => {
    const materia = clase.nombre || 'Sin asignar';
    acc[materia] = (acc[materia] || 0) + 1;
    return acc;
  }, {}) || {};

  const clasesData = Object.entries(clasesPorMateria).map(([name, value]) => ({ name, value }));

  // Datos para tendencias de calificaciones (últimos 6 meses)
  const calificacionesPorMes = calificaciones?.reduce((acc, cal) => {
    if (cal.fecha) {
      const mes = new Date(cal.fecha).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
      acc[mes] = (acc[mes] || 0) + 1;
    }
    return acc;
  }, {}) || {};

  const calificacionesData = Object.entries(calificacionesPorMes).slice(-6).map(([name, value]) => ({ name, value }));

  // Colores para gráficos
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  return (
    <div className="reportes-container">
      <div className="row">
        {/* Usuarios por rol - Pie Chart */}
        <div className="col-lg-6 col-md-12 mb-4">
          <div className="minimal-card p-4">
            <h5 className="mb-4 fw-bold">Distribución de Usuarios por Rol</h5>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usuariosPorRol}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {usuariosPorRol.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clases por materia - Bar Chart */}
        <div className="col-lg-6 col-md-12 mb-4">
          <div className="minimal-card p-4">
            <h5 className="mb-4 fw-bold">Clases por Materia</h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clasesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tendencia de calificaciones - Line Chart */}
        <div className="col-12 mb-4">
          <div className="minimal-card p-4">
            <h5 className="mb-4 fw-bold">Tendencia de Calificaciones (Últimos 6 Meses)</h5>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={calificacionesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportesChart;