import React, { useMemo, useState } from 'react';
import { FaSearch, FaRedo, FaClock, FaChalkboardTeacher, FaBookOpen, FaMapMarkerAlt } from 'react-icons/fa';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const startOfToday = () => {
  const reference = new Date();
  reference.setHours(0, 0, 0, 0);
  return reference;
};

const parseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const formatDate = (value) => {
  const parsed = parseDate(value);
  return parsed
    ? parsed.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Sin fecha';
};

const formatHorario = (assignment) => {
  const day = assignment.dia_semana || assignment.diaSemana || 'Sin día';
  const start = assignment.hora_inicio || assignment.horaInicio || '--:--';
  const end = assignment.hora_fin || assignment.horaFin || '--:--';
  return `${day} • ${start} - ${end}`;
};

const ClasesPasadasPanel = ({ asignaciones = [], onRefresh }) => {
  const [search, setSearch] = useState('');
  const [diaFiltro, setDiaFiltro] = useState('');
  const today = useMemo(() => startOfToday(), []);

  const clasesPasadas = useMemo(() => {
    if (!Array.isArray(asignaciones)) return [];
    return asignaciones.filter((assignment) => {
      const fin = parseDate(assignment.fecha_fin || assignment.fechaFin);
      return fin ? fin < today : false;
    });
  }, [asignaciones, today]);

  const clasesFiltradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clasesPasadas
      .filter((assignment) => {
        const matchesSearch = !term
          || assignment.curso_nombre?.toLowerCase().includes(term)
          || assignment.profesor_nombre?.toLowerCase().includes(term);
        const matchesDay = !diaFiltro || assignment.dia_semana === diaFiltro;
        return matchesSearch && matchesDay;
      })
      .sort((a, b) => {
        const aDate = parseDate(a.fecha_fin || a.fechaFin) || new Date(0);
        const bDate = parseDate(b.fecha_fin || b.fechaFin) || new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
  }, [clasesPasadas, search, diaFiltro]);

  return (
    <div className="container-fluid py-4">
      <style>{`
        .history-card {
          border: none;
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
        }
        .history-badge {
          font-size: 0.85rem;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.1);
          color: #2563eb;
          font-weight: 600;
        }
        .history-table thead {
          background: rgba(15, 23, 42, 0.04);
        }
        .history-table th {
          border: none;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }
        .history-table td {
          vertical-align: middle;
        }
        .empty-state {
          border: 2px dashed rgba(100, 116, 139, 0.4);
          border-radius: 16px;
          padding: 2rem;
        }
      `}</style>

      <div className="card history-card">
        <div className="card-header bg-white border-0 py-4">
          <div className="d-flex flex-wrap gap-3 justify-content-between align-items-center">
            <div>
              <h3 className="mb-1 fw-bold">Clases pasadas</h3>
              <p className="text-muted mb-0">
                Registros históricos finalizados automáticamente para referencia y auditoría.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <div className="input-group">
                <span className="input-group-text bg-light"><FaSearch size={14} /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por curso o profesor"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="form-select"
                style={{ minWidth: '160px' }}
                value={diaFiltro}
                onChange={(e) => setDiaFiltro(e.target.value)}
              >
                <option value="">Todos los días</option>
                {DIAS_SEMANA.map((dia) => (
                  <option key={dia} value={dia}>{dia}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-outline-primary d-flex align-items-center gap-2"
                onClick={() => onRefresh && onRefresh()}
                disabled={!onRefresh}
              >
                <FaRedo />
                Actualizar
              </button>
            </div>
          </div>
          <div className="mt-3 d-flex flex-wrap gap-3">
            <span className="history-badge">
              {clasesPasadas.length} clases finalizadas
            </span>
            {diaFiltro && (
              <span className="badge bg-secondary bg-opacity-25 text-secondary">
                Filtrando por {diaFiltro}
              </span>
            )}
          </div>
        </div>

        <div className="card-body p-0">
          {clasesFiltradas.length === 0 ? (
            <div className="empty-state text-center text-muted m-4">
              <FaClock size={32} className="mb-3 text-primary" />
              <h5 className="fw-bold">Sin clases registradas bajo los filtros actuales</h5>
              <p className="mb-0">Ajusta la búsqueda o espera a que concluya un periodo académico.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover history-table align-middle mb-0">
                <thead>
                  <tr>
                    <th scope="col">Curso</th>
                    <th scope="col">Profesor</th>
                    <th scope="col">Periodo</th>
                    <th scope="col">Horario</th>
                    <th scope="col">Aula</th>
                    <th scope="col" className="text-end">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {clasesFiltradas.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="text-primary"><FaBookOpen /></span>
                          <div>
                            <div className="fw-semibold">{assignment.curso_nombre || 'Sin curso'}</div>
                            <small className="text-muted">ID #{assignment.id}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="text-success"><FaChalkboardTeacher /></span>
                          <div className="fw-medium">{assignment.profesor_nombre || 'Sin profesor'}</div>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-semibold">{formatDate(assignment.fecha_inicio || assignment.fechaInicio)}</span>
                          <small className="text-muted">hasta {formatDate(assignment.fecha_fin || assignment.fechaFin)}</small>
                        </div>
                      </td>
                      <td>{formatHorario(assignment)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <FaMapMarkerAlt className="text-danger" />
                          <span>{assignment.aula || 'No asignada'}</span>
                        </div>
                      </td>
                      <td className="text-end">
                        <small className="text-muted">
                          {assignment.notas || 'Sin comentarios'}
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClasesPasadasPanel;
