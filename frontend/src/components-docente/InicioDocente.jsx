import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FaCalendarAlt,
  FaBookOpen,
  FaTasks,
  FaChalkboardTeacher,
  FaUsers,
  FaClock,
  FaArrowRight,
  FaChevronRight,
} from 'react-icons/fa';

const InicioDocente = ({ userInfo, onModuleChange }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, [currentTime]);

  // Métricas del docente
  const cursosActivos =
    userInfo?.metricas_docente?.cursos_activos ?? userInfo?.cursos_activos ?? userInfo?.cursos?.length ?? 0;
  const sesionesSemana = userInfo?.metricas_docente?.sesiones_programadas ?? 4;
  const pendientes = userInfo?.metricas_docente?.pendientes ?? userInfo?.pendientes ?? 2;
  const estudiantesTotales = userInfo?.metricas_docente?.estudiantes_totales ?? 0;

  const stats = [
    {
      label: 'Cursos activos',
      value: cursosActivos,
      helper: 'Asignados este ciclo',
      icon: FaBookOpen,
      color: '#38bdf8',
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
    },
    {
      label: 'Sesiones de la semana',
      value: sesionesSemana,
      helper: 'Programadas en agenda',
      icon: FaCalendarAlt,
      color: '#a855f7',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
    },
    {
      label: 'Estudiantes totales',
      value: estudiantesTotales,
      helper: 'En todos los cursos',
      icon: FaUsers,
      color: '#22c55e',
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    },
    {
      label: 'Tareas pendientes',
      value: pendientes,
      helper: 'Por revisar',
      icon: FaTasks,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
  ];

  // Accesos rápidos
  const quickActions = [
    {
      id: 'mis-cursos',
      label: 'Mis Cursos',
      description: 'Ver y gestionar cursos asignados',
      icon: FaBookOpen,
      module: 'mis-cursos',
      color: '#38bdf8',
    },
    {
      id: 'asistencias',
      label: 'Asistencias',
      description: 'Registrar asistencia de estudiantes',
      icon: FaChalkboardTeacher,
      module: 'asistencias',
      color: '#a855f7',
    },
    {
      id: 'calificaciones',
      label: 'Calificaciones',
      description: 'Gestionar notas y evaluaciones',
      icon: FaTasks,
      module: 'calificaciones',
      color: '#f59e0b',
    },
  ];

  // Eventos de la agenda del día (mock data)
  const todayEvents = [
    {
      time: '09:00 AM',
      title: 'Clase de Inglés Básico',
      detail: 'Aula 201 • 25 estudiantes',
      icon: FaChalkboardTeacher,
      accent: 'primary',
    },
    {
      time: '11:30 AM',
      title: 'Clase de Inglés Intermedio',
      detail: 'Aula 305 • 20 estudiantes',
      icon: FaChalkboardTeacher,
      accent: 'secondary',
    },
    {
      time: '02:00 PM',
      title: 'Revisar tareas pendientes',
      detail: '5 tareas por calificar',
      icon: FaTasks,
      accent: 'warning',
    },
  ];

  return (
    <div className="inicio-docente">
      <style>
        {`
          .inicio-docente {
            padding: 0;
            animation: fadeInUp 0.5s ease-out;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .inicio-hero {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border-radius: 24px;
            padding: 40px;
            margin-bottom: 32px;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .inicio-hero::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
            border-radius: 50%;
            pointer-events: none;
          }

          .inicio-greeting {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 0.95rem;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 16px;
            position: relative;
            z-index: 1;
          }

          .inicio-greeting-time {
            margin-left: auto;
            color: #38bdf8;
            font-weight: 600;
          }

          .inicio-hero h1 {
            font-size: 2.2rem;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 12px;
            position: relative;
            z-index: 1;
          }

          .inicio-hero-subtitle {
            font-size: 1.05rem;
            color: rgba(255, 255, 255, 0.6);
            line-height: 1.6;
            margin-bottom: 0;
            position: relative;
            z-index: 1;
          }

          .inicio-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
            animation: fadeInUp 0.6s ease-out 0.1s both;
          }

          .inicio-stat-card {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 24px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .inicio-stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--stat-gradient);
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .inicio-stat-card:hover::before {
            opacity: 1;
          }

          .inicio-stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
            border-color: rgba(255, 255, 255, 0.2);
          }

          .inicio-stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            background: var(--stat-gradient);
            opacity: 0.2;
          }

          .inicio-stat-value {
            font-size: 2.2rem;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 8px;
            display: block;
          }

          .inicio-stat-label {
            font-size: 0.95rem;
            font-weight: 600;
            color: rgba(248, 250, 252, 0.9);
            margin-bottom: 4px;
            display: block;
          }

          .inicio-stat-helper {
            font-size: 0.85rem;
            color: rgba(148, 163, 184, 0.7);
          }

          .inicio-content {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 24px;
            animation: fadeInUp 0.6s ease-out 0.2s both;
          }

          .inicio-section {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 28px;
          }

          .inicio-section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
          }

          .inicio-section-title {
            font-size: 1.1rem;
            font-weight: 700;
            color: #f8fafc;
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0;
          }

          .inicio-tag {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
            border: 1px solid rgba(56, 189, 248, 0.3);
          }

          .quick-actions-grid {
            display: grid;
            gap: 16px;
          }

          .quick-action-card {
            background: rgba(30, 41, 59, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .quick-action-card:hover {
            background: rgba(30, 41, 59, 0.8);
            border-color: var(--action-color);
            transform: translateX(4px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          }

          .quick-action-icon {
            width: 56px;
            height: 56px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--action-color) 0%, var(--action-color) 100%);
            opacity: 0.2;
            flex-shrink: 0;
          }

          .quick-action-card:hover .quick-action-icon {
            opacity: 0.3;
          }

          .quick-action-content {
            flex: 1;
          }

          .quick-action-label {
            font-size: 1.05rem;
            font-weight: 600;
            color: #f8fafc;
            margin-bottom: 4px;
          }

          .quick-action-description {
            font-size: 0.85rem;
            color: rgba(148, 163, 184, 0.7);
          }

          .quick-action-arrow {
            color: var(--action-color);
            opacity: 0;
            transform: translateX(-8px);
            transition: all 0.3s ease;
          }

          .quick-action-card:hover .quick-action-arrow {
            opacity: 1;
            transform: translateX(0);
          }

          .agenda-timeline {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .timeline-item {
            display: flex;
            gap: 16px;
            padding: 16px;
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            transition: all 0.3s ease;
          }

          .timeline-item:hover {
            background: rgba(30, 41, 59, 0.6);
            border-color: rgba(255, 255, 255, 0.15);
          }

          .timeline-badge {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .timeline-badge.primary {
            background: rgba(56, 189, 248, 0.15);
            color: #38bdf8;
          }

          .timeline-badge.secondary {
            background: rgba(168, 85, 247, 0.15);
            color: #a855f7;
          }

          .timeline-badge.warning {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
          }

          .timeline-content {
            flex: 1;
          }

          .timeline-time {
            font-size: 0.8rem;
            font-weight: 600;
            color: rgba(148, 163, 184, 0.8);
            margin-bottom: 4px;
          }

          .timeline-title {
            font-size: 0.95rem;
            font-weight: 600;
            color: #f8fafc;
            margin-bottom: 4px;
          }

          .timeline-detail {
            font-size: 0.8rem;
            color: rgba(148, 163, 184, 0.7);
          }

          @media (max-width: 1200px) {
            .inicio-content {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 768px) {
            .inicio-hero {
              padding: 28px 20px;
            }

            .inicio-hero h1 {
              font-size: 1.7rem;
            }

            .inicio-stats-grid {
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 16px;
            }

            .inicio-section {
              padding: 20px;
            }
          }
        `}
      </style>

      {/* Hero Section */}
      <div className="inicio-hero">
        <div className="inicio-greeting">
          <FaCalendarAlt size={14} />
          <span>{greeting}</span>
          <span className="inicio-greeting-time">
            {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <h1>
          {userInfo?.nombres ? `${userInfo.nombres.split(' ')[0]}, ` : 'Docente, '}
          bienvenido a tu espacio académico
        </h1>
        <p className="inicio-hero-subtitle">
          Gestiona tus cursos, registra asistencias y califica evaluaciones desde un mismo lugar. 
          Mantén el control de tu actividad docente de forma simple y eficiente.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="inicio-stats-grid">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="inicio-stat-card"
            style={{
              '--stat-gradient': stat.gradient,
            }}
          >
            <div className="inicio-stat-icon">
              <stat.icon size={24} style={{ color: stat.color }} />
            </div>
            <span className="inicio-stat-value">{stat.value}</span>
            <span className="inicio-stat-label">{stat.label}</span>
            <span className="inicio-stat-helper">{stat.helper}</span>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="inicio-content">
        {/* Quick Actions */}
        <div className="inicio-section">
          <div className="inicio-section-header">
            <h2 className="inicio-section-title">
              <FaArrowRight size={18} style={{ color: '#38bdf8' }} />
              Accesos rápidos
            </h2>
            <span className="inicio-tag">Módulos</span>
          </div>
          <div className="quick-actions-grid">
            {quickActions.map((action) => (
              <button
                key={action.id}
                className="quick-action-card"
                style={{ '--action-color': action.color }}
                onClick={() => onModuleChange(action.module)}
                type="button"
              >
                <div className="quick-action-icon">
                  <action.icon size={24} style={{ color: action.color }} />
                </div>
                <div className="quick-action-content">
                  <div className="quick-action-label">{action.label}</div>
                  <div className="quick-action-description">{action.description}</div>
                </div>
                <FaChevronRight className="quick-action-arrow" size={16} />
              </button>
            ))}
          </div>
        </div>

        {/* Agenda del día */}
        <div className="inicio-section">
          <div className="inicio-section-header">
            <h2 className="inicio-section-title">
              <FaClock size={18} style={{ color: '#a855f7' }} />
              Agenda del día
            </h2>
            <span className="inicio-tag">Hoy</span>
          </div>
          <div className="agenda-timeline">
            {todayEvents.map((event, index) => (
              <div key={index} className="timeline-item">
                <div className={`timeline-badge ${event.accent}`}>
                  <event.icon size={16} />
                </div>
                <div className="timeline-content">
                  <div className="timeline-time">{event.time}</div>
                  <div className="timeline-title">{event.title}</div>
                  <div className="timeline-detail">{event.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

InicioDocente.propTypes = {
  userInfo: PropTypes.object,
  onModuleChange: PropTypes.func.isRequired,
};

InicioDocente.defaultProps = {
  userInfo: {},
};

export default InicioDocente;
