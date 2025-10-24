import React, { useState } from 'react';
import { FaLightbulb, FaTimes, FaChevronDown, FaChevronUp, FaInfoCircle } from 'react-icons/fa';

const SugerenciasPanel = ({ activeModule }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  const sugerencias = {
    null: {
      title: '¡Bienvenido al Panel de Administración! 🎉',
      tips: [
        'Usa el menú lateral para navegar entre diferentes módulos',
        'Las estadísticas principales se actualizan en tiempo real',
        'Puedes cambiar entre modo claro y oscuro con el botón en la parte superior',
        'Haz clic en tu perfil para acceder a configuración y cerrar sesión'
      ],
      color: '#3b82f6'
    },
    usuarios: {
      title: 'Gestión de Usuarios 👥',
      tips: [
        'Puedes filtrar usuarios por rol (Estudiante, Profesor, Admin)',
        'Usa la barra de búsqueda para encontrar usuarios específicos rápidamente',
        'Haz clic en "Editar" para modificar los datos de un usuario',
        'Los usuarios eliminados no pueden ser recuperados, ten cuidado',
        'Registra nuevos usuarios con el botón "Nuevo Usuario"'
      ],
      color: '#8b5cf6'
    },
    clases: {
      title: 'Gestión de Cursos 📚',
      tips: [
        'Cada curso debe tener un profesor asignado para ser válido',
        'Puedes ver las clases programadas en el calendario',
        'Los horarios se pueden configurar por día de la semana',
        'Asigna ciclos a los cursos para mejor organización',
        'Revisa que no haya conflictos de horarios entre clases'
      ],
      color: '#10b981'
    },
    asistencias: {
      title: 'Control de Asistencias ✅',
      tips: [
        'Marca asistencias de forma rápida usando la vista de lista',
        'Puedes generar reportes de asistencia por curso o estudiante',
        'Las faltas injustificadas se marcan en rojo',
        'Exporta los datos de asistencia a Excel para análisis externos',
        'Revisa regularmente la asistencia para detectar ausentismo'
      ],
      color: '#f59e0b'
    },
    calificaciones: {
      title: 'Gestión de Calificaciones 🎯',
      tips: [
        'Las calificaciones se pueden editar hasta la fecha límite',
        'Usa promedios ponderados para evaluaciones importantes',
        'Los estudiantes pueden ver sus calificaciones en tiempo real',
        'Genera boletas de notas automáticamente',
        'Puedes agregar comentarios personalizados a cada calificación'
      ],
      color: '#ef4444'
    },
    asignacion: {
      title: 'Asignación de Profesores 👨‍🏫',
      tips: [
        'Asigna profesores según su especialidad',
        'Verifica la disponibilidad antes de asignar cursos',
        'Un profesor puede tener múltiples cursos asignados',
        'Las asignaciones se pueden cambiar al inicio del ciclo',
        'Revisa la carga académica de cada profesor para equilibrar'
      ],
      color: '#06b6d4'
    },
    'profesores-asignaturas': {
      title: 'Profesores y Asignaturas 📖',
      tips: [
        'Visualiza rápidamente qué profesor enseña qué materia',
        'Identifica profesores sin asignaciones',
        'Detecta materias que necesitan profesores',
        'Organiza por departamento o área de conocimiento',
        'Usa esta vista para planificar el próximo ciclo'
      ],
      color: '#a855f7'
    },
    'asignacion-estudiantes': {
      title: 'Asignación de Estudiantes 🎓',
      tips: [
        'Asigna estudiantes a cursos según su ciclo académico',
        'Verifica prerequisitos antes de asignar cursos avanzados',
        'Puedes asignar múltiples estudiantes a la vez',
        'Revisa el cupo máximo de cada curso',
        'Las asignaciones afectan el horario del estudiante'
      ],
      color: '#ec4899'
    },
    reportes: {
      title: 'Reportes del Sistema 📊',
      tips: [
        'Genera reportes personalizados por período',
        'Exporta datos en formato PDF o Excel',
        'Usa gráficos para visualizar tendencias',
        'Los reportes se pueden programar automáticamente',
        'Compara datos entre diferentes ciclos académicos'
      ],
      color: '#14b8a6'
    },
    configuracion: {
      title: 'Configuración del Sistema ⚙️',
      tips: [
        'Aquí puedes personalizar el comportamiento del sistema',
        'Configura notificaciones por email o SMS',
        'Ajusta los períodos académicos y fechas importantes',
        'Gestiona permisos y roles de usuarios',
        'Realiza copias de seguridad regularmente'
      ],
      color: '#64748b'
    }
  };

  const currentSuggestion = sugerencias[activeModule] || sugerencias[null];

  if (!isVisible) return null;

  return (
    <div
      className="sugerencias-panel"
      style={{
        position: 'relative',
        background: 'var(--bg-primary)',
        border: `2px solid ${currentSuggestion.color}`,
        borderRadius: '16px',
        padding: isExpanded ? '20px' : '16px',
        marginBottom: '24px',
        boxShadow: `0 8px 24px ${currentSuggestion.color}15`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        animation: 'slideInRight 0.6s ease-out',
        zIndex: 10
      }}
    >
      {/* Fondo decorativo */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '200px',
          height: '200px',
          background: `radial-gradient(circle, ${currentSuggestion.color}15 0%, transparent 70%)`,
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
      />

      {/* Header */}
      <div
        className="d-flex align-items-center justify-content-between"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${currentSuggestion.color} 0%, ${currentSuggestion.color}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: `0 4px 12px ${currentSuggestion.color}40`,
              transition: 'transform 0.3s ease',
              animation: 'float 3s ease-in-out infinite'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) rotate(5deg)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
          >
            <FaLightbulb size={22} />
          </div>
          <div>
            <h5 className="mb-0 fw-bold" style={{ color: currentSuggestion.color }}>
              {currentSuggestion.title}
            </h5>
            <small className="text-muted">Tips y sugerencias útiles</small>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-link p-2"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              color: currentSuggestion.color,
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isExpanded ? <FaChevronUp size={16} /> : <FaChevronDown size={16} />}
          </button>
          <button
            className="btn btn-sm btn-link p-2"
            onClick={() => setIsVisible(false)}
            style={{
              color: 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'rotate(90deg)';
              e.currentTarget.style.color = 'var(--accent-danger)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'rotate(0deg)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <FaTimes size={16} />
          </button>
        </div>
      </div>

      {/* Contenido expandible */}
      {isExpanded && (
        <div
          className="mt-3"
          style={{
            position: 'relative',
            zIndex: 1,
            animation: 'fadeIn 0.4s ease-out'
          }}
        >
          <ul className="mb-0" style={{ paddingLeft: '20px', listStyle: 'none' }}>
            {currentSuggestion.tips.map((tip, index) => (
              <li
                key={index}
                className="mb-2"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  animation: 'fadeInUp 0.4s ease-out backwards',
                  animationDelay: `${index * 0.1}s`,
                  padding: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${currentSuggestion.color}08`;
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <FaInfoCircle
                  size={16}
                  style={{ color: currentSuggestion.color, marginTop: '2px', flexShrink: 0 }}
                />
                <span style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {tip}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default SugerenciasPanel;
