import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  FaAdjust,
  FaArrowRight,
  FaBars,
  FaBookOpen,
  FaCalendarAlt,
  FaChalkboardTeacher,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardCheck,
  FaFilter,
  FaMoon,
  FaRegBell,
  FaSearch,
  FaSignOutAlt,
  FaSun,
  FaTasks,
  FaUsers,
} from 'react-icons/fa';
import UserAvatar from '../components/UserAvatar';

const DocenteDashboardLayout = ({
  userInfo,
  menuItems,
  activeModule,
  onModuleChange,
  loading,
  onLogout,
  sidebarCollapsed,
  isMobile,
  mobileSidebarOpen,
  onToggleSidebar,
  onToggleMobileSidebar,
  searchTerm,
  onSearchChange,
  darkMode,
  highContrast,
  toggleTheme,
  toggleHighContrast,
  getModuleTitle,
  children,
}) => {
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

  const categories = Array.isArray(menuItems) ? menuItems : [];
  const flattenedMenu = categories.flatMap((category) =>
    (category.items || []).map((item) => ({
      ...item,
      category: category.category,
    })),
  );

  const quickActionItems = flattenedMenu.slice(0, 4);

  const cursosActivos =
    userInfo?.metricas_docente?.cursos_activos ?? userInfo?.cursos_activos ?? userInfo?.cursos?.length ?? 0;
  const sesionesSemana = userInfo?.metricas_docente?.sesiones_programadas ?? 4;
  const pendientes =
    userInfo?.metricas_docente?.pendientes ?? userInfo?.pendientes ?? 2;

  const docenteStats = [
    {
      label: 'Cursos activos',
      value: cursosActivos,
      helper: 'Asignados este mes',
      icon: FaBookOpen,
      color: '#38bdf8',
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
    },
    {
      label: 'Sesiones de la semana',
      value: sesionesSemana,
      helper: 'Planificadas en agenda',
      icon: FaCalendarAlt,
      color: '#a855f7',
      gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
    },
    {
      label: 'Revisiones pendientes',
      value: pendientes,
      helper: 'Solicitudes por atender',
      icon: FaTasks,
      color: '#f97316',
      gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    },
    {
      label: 'Estudiantes totales',
      value: userInfo?.total_estudiantes ?? 45,
      helper: 'En tus cursos',
      icon: FaUsers,
      color: '#22c55e',
      gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    },
  ];

  const toggleSidebar = () => {
    if (typeof onToggleSidebar === 'function') {
      onToggleSidebar();
    }
  };

  const toggleMobileSidebar = () => {
    if (typeof onToggleMobileSidebar === 'function') {
      onToggleMobileSidebar();
    }
  };

  const handleModuleClick = (module) => {
    if (typeof onModuleChange === 'function') {
      onModuleChange(module);
    }
  };

  const handleSearchChange = (event) => {
    if (typeof onSearchChange === 'function') {
      onSearchChange(event.target.value);
    }
  };

  const headerTitle = typeof getModuleTitle === 'function'
    ? getModuleTitle(activeModule)
    : 'Dashboard del Docente';

  const sidebarWidth = sidebarCollapsed && !isMobile ? '80px' : '280px';
  const contentMarginLeft = sidebarCollapsed && !isMobile ? '80px' : isMobile ? '0' : '280px';
  const contentWidth = sidebarCollapsed && !isMobile
    ? 'calc(100vw - 80px)'
    : isMobile
      ? '100vw'
      : 'calc(100vw - 280px)';

  const moduleCards = categories.map((category) => ({
    title: category.category,
    items: (category.items || []).map((item) => ({
      ...item,
      description: item.description || 'Explora opciones del módulo',
    })),
  }));

  return (
    <>
      <style>{`
        /* ========== VARIABLES Y ANIMACIONES ========== */
        :root {
          --docente-bg: #050a15;
          --docente-panel: rgba(255, 255, 255, 0.75);
          --docente-panel-hover: rgba(15, 23, 42, 0.9);
          --docente-border: rgba(255, 255, 255, 0.06);
          --docente-text: #f7fafc;
          --docente-muted: #ffffffff;
          --docente-accent: #38bdf8;
          --docente-accent-glow: rgba(56, 189, 248, 0.3);
          --docente-success: #22c55e;
          --docente-warning: #f97316;
          --docente-highlight: #a855f7;
          --docente-gradient: linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%);
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        @keyframes gradientBorder {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ========== SIDEBAR ========== */
        .docente-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
          color: var(--docente-text);
          border-right: 1px solid var(--docente-border);
          z-index: 1030;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }

        .docente-sidebar::-webkit-scrollbar {
          width: 4px;
        }

        .docente-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }

        .docente-sidebar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }

        .docente-header {
          padding: 20px clamp(16px, 4vw, 48px);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, transparent 100%);
          backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .docente-sidebar .category-title {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.6);
          margin: 24px 0 12px;
          padding-left: 12px;
        }

        .docente-sidebar ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .nav-item + .nav-item {
          margin-top: 6px;
        }

        .nav-link-docente {
          width: 100%;
          border: 1px solid transparent;
          background: rgba(15, 23, 42, 0.4);
          border-radius: 16px;
          color: var(--docente-text);
          padding: 12px 14px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .nav-link-docente::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--docente-gradient);
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: 16px;
        }

        .nav-link-docente::after {
          content: '';
          position: absolute;
          top: 50%;
          left: -10px;
          width: 4px;
          height: 0;
          background: var(--docente-accent);
          border-radius: 0 4px 4px 0;
          transition: height 0.3s ease;
          transform: translateY(-50%);
        }

        .nav-link-docente:hover {
          border-color: rgba(56, 189, 248, 0.3);
          transform: translateX(4px);
          background: rgba(56, 189, 248, 0.08);
        }

        .nav-link-docente:hover::before {
          opacity: 0.05;
        }

        .nav-link-docente.active {
          border-color: var(--docente-accent);
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%);
          box-shadow: 0 8px 32px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .nav-link-docente.active::after {
          height: 60%;
        }

        .nav-link-docente .nav-link-content {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          z-index: 1;
        }

        .nav-icon-pill {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.3s ease;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .nav-link-docente:hover .nav-icon-pill {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%);
          border-color: rgba(56, 189, 248, 0.3);
        }

        .nav-link-docente.active .nav-icon-pill {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%);
          border-color: rgba(56, 189, 248, 0.4);
          box-shadow: 0 4px 15px rgba(56, 189, 248, 0.2);
        }

        .nav-info {
          flex: 1;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .nav-text {
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-helper {
          font-size: 0.72rem;
          color: rgba(226, 232, 240, 0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nav-arrow {
          color: rgba(226, 232, 240, 0.4);
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .nav-link-docente:hover .nav-arrow {
          transform: translateX(4px);
          color: var(--docente-accent);
        }

        .nav-link-docente.active .nav-arrow {
          color: var(--docente-accent);
        }

        /* ========== MAIN CONTENT ========== */
        .docente-main {
          min-height: 100vh;
          background: 
            radial-gradient(ellipse at 0% 0%, rgba(56, 189, 248, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 0%, rgba(168, 85, 247, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(99, 102, 241, 0.04) 0%, transparent 50%),
            linear-gradient(180deg, #0a0f1a 0%, #020617 100%);
          color: var(--docente-text);
        }

        /* ========== HERO SECTION ========== */
        .docente-hero {
          padding: 28px clamp(16px, 4vw, 48px);
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          animation: fadeInUp 0.6s ease-out;
        }

        .docente-hero-card {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(168, 85, 247, 0.06) 100%);
          border: 1px solid rgba(56, 189, 248, 0.2);
          border-radius: 28px;
          padding: 36px;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(20px);
          box-shadow: 
            0 25px 50px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .docente-hero-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .docente-hero-card::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .docente-hero-card h2 {
          margin-bottom: 0.75rem;
          font-size: clamp(1.5rem, 2.5vw, 2rem);
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-greeting {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.15);
          border: 1px solid rgba(56, 189, 248, 0.3);
          font-size: 0.85rem;
          color: #38bdf8;
          margin-bottom: 16px;
        }

        .hero-time {
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        /* ========== STATS GRID ========== */
        .docente-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .stat-card {
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(15, 23, 42, 0.5) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(16px);
        }

        .stat-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--stat-color, var(--docente-accent));
          opacity: 0.9;
        }

        .stat-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 50%);
          pointer-events: none;
        }

        .stat-card:hover {
          transform: translateY(-6px) scale(1.02);
          border-color: rgba(255, 255, 255, 0.15);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.35), 0 0 40px rgba(var(--stat-color-rgb, 56, 189, 248), 0.1);
        }

        .stat-card-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          position: relative;
          z-index: 1;
        }

        .stat-card strong {
          font-size: 2.75rem;
          font-weight: 800;
          line-height: 1;
          background: var(--stat-gradient, var(--docente-gradient));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative;
          z-index: 1;
        }

        .stat-card-label {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--docente-text);
          position: relative;
          z-index: 1;
        }

        .stat-card span {
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.7);
          position: relative;
          z-index: 1;
        }

        /* ========== QUICK ACTIONS ========== */
        .quick-actions-section {
          padding: 0 clamp(16px, 4vw, 48px);
          margin-bottom: 24px;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .quick-action-btn {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.4) 100%);
          color: var(--docente-text);
          padding: 22px 24px;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 18px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .quick-action-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: var(--docente-gradient);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .quick-action-btn::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }

        .quick-action-btn:hover:not(:disabled) {
          transform: translateY(-4px) scale(1.02);
          border-color: rgba(56, 189, 248, 0.5);
          box-shadow: 0 15px 35px rgba(56, 189, 248, 0.2), 0 0 30px rgba(56, 189, 248, 0.08);
        }

        .quick-action-btn:hover::before {
          opacity: 0.1;
        }

        .quick-action-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
          font-size: 1.15rem;
        }

        .quick-action-content {
          position: relative;
          z-index: 1;
        }

        .quick-action-content strong {
          display: block;
          font-size: 1rem;
          margin-bottom: 6px;
          font-weight: 600;
        }

        .quick-action-content span {
          font-size: 0.85rem;
          color: rgba(148, 163, 184, 0.7);
        }

        /* ========== CONTENT GRID ========== */
        .docente-content-grid {
          display: block;
          padding: 0 clamp(16px, 4vw, 48px) 48px;
        }

        .docente-panel {
          background: linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0.55) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 28px;
          padding: 36px;
          box-shadow: 
            0 25px 50px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px);
          animation: fadeInUp 0.5s ease-out;
          animation-fill-mode: backwards;
          position: relative;
          overflow: hidden;
        }

        .docente-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(ellipse at 0% 0%, rgba(56, 189, 248, 0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 100%, rgba(168, 85, 247, 0.03) 0%, transparent 50%);
          pointer-events: none;
        }

        .docente-panel.primary-panel {
          animation-delay: 0.1s;
          min-height: calc(100vh - 500px);
        }

        .docente-panel.secondary-panel {
          animation-delay: 0.2s;
        }

        .docente-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 28px;
          position: relative;
          z-index: 1;
        }

        .docente-panel-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.85) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .docente-panel-body {
          min-height: 300px;
          position: relative;
          z-index: 1;
        }

        /* ========== MODULE SWITCHER ========== */
        .module-switcher {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .module-group-title {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(148, 163, 184, 0.6);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .module-group-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(148, 163, 184, 0.2) 0%, transparent 100%);
        }

        .module-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .module-card {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.4) 100%);
          padding: 28px;
          color: var(--docente-text);
          display: flex;
          flex-direction: column;
          gap: 18px;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          text-align: left;
          outline: none;
          position: relative;
          overflow: hidden;
          min-height: 160px;
        }

        .module-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--docente-gradient);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .module-card:hover {
          border-color: rgba(56, 189, 248, 0.4);
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3), 0 0 30px rgba(56, 189, 248, 0.1);
        }

        .module-card:hover::before {
          transform: scaleX(1);
        }

        .module-card.active {
          border-color: var(--docente-accent);
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%);
          box-shadow: 0 15px 40px rgba(56, 189, 248, 0.15);
        }

        .module-card.active::before {
          transform: scaleX(1);
        }

        .module-card-header {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .module-card-icon {
          width: 60px;
          height: 60px;
          border-radius: 18px;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 1.3rem;
        }

        .module-card:hover .module-card-icon {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.25) 0%, rgba(99, 102, 241, 0.18) 100%);
          transform: scale(1.08);
          border-color: rgba(56, 189, 248, 0.3);
        }

        .module-card.active .module-card-icon {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(99, 102, 241, 0.2) 100%);
          border-color: rgba(56, 189, 248, 0.4);
        }

        .module-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 12px;
          border-top: 1px dashed rgba(255, 255, 255, 0.06);
        }

        /* ========== BADGES & TAGS ========== */
        .badge-docente {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 500;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
        }

        .docente-tag {
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid rgba(56, 189, 248, 0.3);
          background: rgba(56, 189, 248, 0.08);
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #38bdf8;
        }

        /* ========== SEARCH INPUT ========== */
        .search-input-docente {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 12px 18px 12px 42px;
          color: var(--docente-text);
          width: 220px;
          transition: all 0.3s ease;
        }

        .search-input-docente:focus {
          border-color: rgba(56, 189, 248, 0.4);
          background: rgba(15, 23, 42, 0.95);
          outline: none;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.1);
        }

        .search-input-docente::placeholder {
          color: rgba(255, 255, 255, 1);
        }

        /* ========== ACTION BUTTONS ========== */
        .action-btn-docente {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          color: rgba(226, 232, 240, 0.8);
        }

        .action-btn-docente:hover {
          background: rgba(56, 189, 248, 0.1);
          border-color: rgba(56, 189, 248, 0.3);
          color: var(--docente-accent);
          transform: translateY(-2px);
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 1400px) {
          .docente-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .module-cards-grid {
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          }
        }

        @media (max-width: 1200px) {
          .docente-content-grid {
            padding: 0 24px 48px;
          }
        }

        @media (max-width: 992px) {
          .docente-hero {
            grid-template-columns: 1fr;
          }

          .docente-sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .docente-sidebar.show {
            transform: translateX(0);
          }

          .docente-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .docente-stats-grid {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .stat-card {
            padding: 18px;
          }

          .stat-card strong {
            font-size: 2rem;
          }

          .quick-actions-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .search-input-docente {
            width: 100%;
            max-width: 180px;
          }
        }

        @media (max-width: 600px) {
          .docente-panel,
          .docente-hero-card {
            padding: 20px;
            border-radius: 20px;
          }

          .docente-panel-header {
            flex-direction: column;
          }

          .docente-stats-grid {
            grid-template-columns: 1fr;
          }

          .module-cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      {isMobile && mobileSidebarOpen && (
        <div
          className="mobile-overlay position-fixed d-lg-none"
          onClick={toggleMobileSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1040,
            animation: 'fadeIn 0.3s ease'
          }}
        />
      )}

      <nav
        className={`docente-sidebar ${sidebarCollapsed && !isMobile ? 'sidebar-collapsed' : ''} ${isMobile && mobileSidebarOpen ? 'show' : ''}`}
        style={{ width: sidebarWidth }}
      >
        {/* Logo */}
        <div className="p-4 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '80px' }}>
            {sidebarCollapsed ? (
              <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="I.E Peruano Japonés 7213">
                <img src="./logo.png" alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
              </div>
            ) : (
              <div className="nav-text text-center" style={{ width: '100%' }}>
                <img src="./logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', marginBottom: '5px' }} />
                <h5 className="mb-0 fw-bold" style={{ color: 'white' }}>I.E Peruano Japonés<br></br> 7213</h5>
                <small className="text-muted">Panel del Docente</small>
              </div>
            )}
          </div>
        </div>

        {/* Botón de colapsar/expandir */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            className="btn btn-link p-0 w-100"
            onClick={toggleSidebar}
            style={{
              color: 'white',
              background: 'rgba(255, 255, 255, 0.1)',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
            title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            <div
              style={{
                transition: 'transform 0.3s ease',
                transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              <FaChevronLeft size={14} />
            </div>
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div
            className="d-flex align-items-center"
            style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
          >
            <div style={{ marginRight: sidebarCollapsed ? '0' : '12px', flexShrink: 0 }}>
              <UserAvatar
                userId={userInfo?.id}
                nombre={userInfo?.nombre || 'Docente'}
                tieneFoto={userInfo?.tiene_foto_perfil}
                size="md"
              />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-grow-1 user-details">
                <div className="fw-medium" style={{ color: 'white' }}>
                  {userInfo?.nombres && userInfo?.apellido_paterno
                    ? `${userInfo.nombres} ${userInfo.apellido_paterno}${userInfo.apellido_materno ? ' ' + userInfo.apellido_materno : ''}`
                    : userInfo?.nombre || 'Docente'
                  }
                </div>
                <small className="text-muted">{userInfo?.rol || 'Profesor'}</small>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="p-3 flex-grow-1">
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              {!sidebarCollapsed && (
                <div className="category-title">{category.category}</div>
              )}
              <ul className="list-unstyled">
                {(category.items || []).map((item) => (
                  <li key={item.id} className="nav-item">
                    <button
                      className={`nav-link-docente ${(activeModule === item.module || (!activeModule && item.module === null))
                        ? 'active'
                        : ''
                        }`}
                      onClick={() => handleModuleClick(item.module)}
                      disabled={loading}
                      type="button"
                    >
                      <div className="nav-link-content">
                        <div className="nav-icon-pill">
                          {item.icon ? <item.icon size={16} /> : <FaArrowRight size={12} />}
                        </div>
                        <div className="nav-info">
                          <span className="nav-text">{item.label}</span>
                          <span className="nav-helper">{item.helper || item.description || 'Ver módulo'}</span>
                        </div>
                        <FaArrowRight className="nav-arrow" size={12} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="p-3 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <button
            className="nav-link-docente text-danger"
            onClick={onLogout}
            disabled={loading}
          >
            <div className="icon-wrapper">
              <FaSignOutAlt size={16} />
            </div>
            <span className="nav-text">Cerrar sesión</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main
        className="flex-grow-1 main-content-wrapper docente-main"
        style={{
          marginLeft: contentMarginLeft,
          transition: 'margin-left 0.3s ease',
          width: contentWidth,
          maxWidth: isMobile ? '100vw' : undefined,
          overflowX: 'hidden'
        }}
      >
        {/* Header */}
        <div className="docente-header">
          <div className="d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              <img src="/logo.png" alt="Logo" className="me-3" style={{ height: '45px', width: 'auto' }} />
              <div>
                <h1 className="h4 mb-1 fw-bold">{headerTitle}</h1>
                <p className="mb-0 text-muted small">
                  {new Date().toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              {!isMobile && (
                <div
                  className="action-btn-docente"
                  onClick={toggleSidebar}
                  title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
                >
                  <FaChevronLeft size={16} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                </div>
              )}

              {isMobile && (
                <div
                  className="action-btn-docente"
                  onClick={toggleMobileSidebar}
                  title="Menú"
                >
                  <FaBars size={16} />
                </div>
              )}

              <div className="position-relative">
                <input
                  type="text"
                  className="search-input-docente"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                <FaSearch
                  className="position-absolute"
                  style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  size={14}
                />
              </div>

              <div className="action-btn-docente">
                <FaRegBell size={16} />
              </div>

              <div className="action-btn-docente">
                <FaFilter size={16} />
              </div>

              <div className="action-btn-docente" onClick={toggleTheme} title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
                {darkMode ? <FaSun size={16} /> : <FaMoon size={16} />}
              </div>

              <div className="action-btn-docente" onClick={toggleHighContrast} title={highContrast ? 'Desactivar alto contraste' : 'Activar alto contraste'}>
                <FaAdjust size={16} />
              </div>

              <div className="ps-2 border-start border-secondary ms-2">
                <UserAvatar
                  userId={userInfo?.id}
                  nombre={userInfo?.nombre || 'Docente'}
                  tieneFoto={userInfo?.tiene_foto_perfil}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        <section className="docente-hero">
          <div className="docente-hero-card">
            <div className="d-flex flex-column gap-3" style={{ position: 'relative', zIndex: 1 }}>
              <div className="hero-greeting">
                <FaCalendarAlt size={14} /> 
                <span>{greeting}</span>
                <span className="hero-time">
                  {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h2>
                {userInfo?.nombres
                  ? `${userInfo.nombres.split(' ')[0]}, `
                  : 'Docente, '}{' '}
                organiza tu jornada académica
              </h2>
              <p className="mb-0" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: 1.6 }}>
                Monitorea tus cursos, asistencias y calificaciones desde un mismo lugar. 
                Activa un módulo para ver los detalles en el panel principal.
              </p>
              <div className="d-flex gap-3 mt-3 flex-wrap">
                {quickActionItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    className="quick-action-btn"
                    onClick={() => handleModuleClick(item.module)}
                    disabled={loading}
                    type="button"
                  >
                    <div className="quick-action-icon">
                      {item.icon ? <item.icon size={18} /> : <FaArrowRight size={14} />}
                    </div>
                    <div className="quick-action-content">
                      <strong>{item.label}</strong>
                      <span>{item.helper || 'Ver módulo'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="docente-stats-grid">
            {docenteStats.map((stat) => (
              <div 
                key={stat.label} 
                className="stat-card"
                style={{ 
                  '--stat-color': stat.color,
                  '--stat-gradient': stat.gradient 
                }}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div 
                    className="stat-card-icon" 
                    style={{ background: `${stat.color}15`, color: stat.color }}
                  >
                    <stat.icon size={20} />
                  </div>
                </div>
                <strong>{stat.value}</strong>
                <span className="stat-card-label">{stat.label}</span>
                <span>{stat.helper}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="docente-content-grid">
          <section className="docente-panel primary-panel">
            <div className="docente-panel-header">
              <div>
                <p className="docente-tag mb-2">Panel activo</p>
                <h2>{headerTitle}</h2>
              </div>
              <div className="text-end">
                <p className="mb-1 text-white-50">Acciones disponibles</p>
                <div className="d-flex gap-2 flex-wrap justify-content-end">
                  <span className="badge-docente">
                    <FaClipboardCheck size={12} /> Asistencias
                  </span>
                  <span className="badge-docente">
                    <FaChalkboardTeacher size={12} /> Cursos
                  </span>
                  <span className="badge-docente">
                    <FaBookOpen size={12} /> Material
                  </span>
                </div>
              </div>
            </div>
            <div className="docente-panel-body">
              {!activeModule && moduleCards.length > 0 && (
                <div className="module-switcher">
                  {moduleCards.map((group) => (
                    <div key={group.title}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="module-group-title">{group.title}</span>
                        <span className="text-white-50 small">{group.items.length} accesos</span>
                      </div>
                      <div className="module-cards-grid">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            className={`module-card ${activeModule === item.module || (!activeModule && item.module === null) ? 'active' : ''}`}
                            onClick={() => handleModuleClick(item.module)}
                            disabled={loading}
                            type="button"
                          >
                            <div className="module-card-header">
                              <div className="module-card-icon">
                                {item.icon ? <item.icon size={20} /> : <FaArrowRight size={16} />}
                              </div>
                              <div className="d-flex flex-column text-start">
                                <strong style={{ fontSize: '1rem' }}>{item.label}</strong>
                                <small style={{ color: 'rgba(148, 163, 184, 0.7)', fontSize: '0.8rem' }}>{item.description}</small>
                              </div>
                            </div>
                            <div className="module-card-footer">
                              <span className="small" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                                {item.module ? 'Abrir módulo' : 'Vista general'}
                              </span>
                              <FaChevronRight size={12} style={{ color: 'var(--docente-accent)' }} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {children}
            </div>
          </section>
        </div>
      </main>
    </>
  );
};

DocenteDashboardLayout.propTypes = {
  userInfo: PropTypes.object,
  menuItems: PropTypes.array,
  activeModule: PropTypes.string,
  onModuleChange: PropTypes.func,
  loading: PropTypes.bool,
  onLogout: PropTypes.func,
  sidebarCollapsed: PropTypes.bool,
  isMobile: PropTypes.bool,
  mobileSidebarOpen: PropTypes.bool,
  onToggleSidebar: PropTypes.func,
  onToggleMobileSidebar: PropTypes.func,
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func,
  darkMode: PropTypes.bool,
  highContrast: PropTypes.bool,
  toggleTheme: PropTypes.func,
  toggleHighContrast: PropTypes.func,
  getModuleTitle: PropTypes.func,
  children: PropTypes.node,
};

DocenteDashboardLayout.defaultProps = {
  userInfo: null,
  menuItems: [],
  activeModule: null,
  onModuleChange: null,
  loading: false,
  onLogout: null,
  sidebarCollapsed: false,
  isMobile: false,
  mobileSidebarOpen: false,
  onToggleSidebar: null,
  onToggleMobileSidebar: null,
  searchTerm: '',
  onSearchChange: null,
  darkMode: false,
  highContrast: false,
  toggleTheme: null,
  toggleHighContrast: null,
  getModuleTitle: null,
  children: null,
};

export default DocenteDashboardLayout;
