import React from 'react';
import PropTypes from 'prop-types';
import { FaCalendarAlt, FaChevronRight } from 'react-icons/fa';

const InicioPanel = ({ timelineEvents = [] }) => {
  return (
    <div className="inicio-panel">
      <style>
        {`
          .inicio-panel {
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }

          .inicio-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .inicio-panel-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0;
            font-size: 1.1rem;
            font-weight: 700;
            color: #f8fafc;
          }

          .inicio-panel-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #a855f7;
          }

          .inicio-panel-tag {
            padding: 6px 14px;
            border-radius: 8px;
            background: rgba(168, 85, 247, 0.15);
            color: #a855f7;
            font-size: 0.8rem;
            font-weight: 600;
            border: 1px solid rgba(168, 85, 247, 0.2);
          }

          .inicio-timeline {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .inicio-timeline-item {
            display: flex;
            gap: 16px;
            padding: 16px;
            border-radius: 14px;
            background: rgba(15, 23, 42, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            transition: all 0.3s ease;
            cursor: pointer;
          }

          .inicio-timeline-item:hover {
            background: rgba(15, 23, 42, 0.6);
            border-color: rgba(168, 85, 247, 0.3);
            transform: translateX(4px);
          }

          .inicio-timeline-badge {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.3s ease;
          }

          .inicio-timeline-badge.primary {
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.2) 100%);
            color: #38bdf8;
          }

          .inicio-timeline-badge.success {
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%);
            color: #22c55e;
          }

          .inicio-timeline-badge.warning {
            background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(234, 88, 12, 0.2) 100%);
            color: #f97316;
          }

          .inicio-timeline-content {
            flex: 1;
            min-width: 0;
          }

          .inicio-timeline-time {
            font-size: 0.75rem;
            color: rgba(148, 163, 184, 0.8);
            font-weight: 600;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .inicio-timeline-title {
            font-size: 1rem;
            font-weight: 600;
            color: #f8fafc;
            margin-bottom: 4px;
          }

          .inicio-timeline-detail {
            font-size: 0.85rem;
            color: rgba(148, 163, 184, 0.7);
          }

          .inicio-timeline-arrow {
            display: flex;
            align-items: center;
            color: rgba(148, 163, 184, 0.5);
            opacity: 0;
            transition: all 0.3s ease;
          }

          .inicio-timeline-item:hover .inicio-timeline-arrow {
            opacity: 1;
            color: #a855f7;
          }

          .inicio-empty {
            text-align: center;
            padding: 48px 24px;
            color: rgba(148, 163, 184, 0.6);
          }

          .inicio-empty-icon {
            font-size: 3rem;
            margin-bottom: 16px;
            opacity: 0.5;
          }

          .inicio-empty-text {
            font-size: 0.95rem;
            margin: 0;
          }

          @media (max-width: 768px) {
            .inicio-panel {
              padding: 16px;
            }

            .inicio-panel-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
            }

            .inicio-timeline-item {
              padding: 12px;
            }

            .inicio-timeline-badge {
              width: 36px;
              height: 36px;
            }
          }
        `}
      </style>

      <div className="inicio-panel-header">
        <h3 className="inicio-panel-title">
          <div className="inicio-panel-icon">
            <FaCalendarAlt size={18} />
          </div>
          Agenda del día
        </h3>
        <span className="inicio-panel-tag">Hoy</span>
      </div>

      {timelineEvents && timelineEvents.length > 0 ? (
        <div className="inicio-timeline">
          {timelineEvents.map((event, index) => (
            <div key={`${event.title}-${index}`} className="inicio-timeline-item">
              <div className={`inicio-timeline-badge ${event.accent}`}>
                <event.icon size={18} />
              </div>
              <div className="inicio-timeline-content">
                <div className="inicio-timeline-time">{event.time}</div>
                <div className="inicio-timeline-title">{event.title}</div>
                <div className="inicio-timeline-detail">{event.detail}</div>
              </div>
              <div className="inicio-timeline-arrow">
                <FaChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="inicio-empty">
          <div className="inicio-empty-icon">
            <FaCalendarAlt />
          </div>
          <p className="inicio-empty-text">No hay eventos programados para hoy</p>
        </div>
      )}
    </div>
  );
};

InicioPanel.propTypes = {
  timelineEvents: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      time: PropTypes.string.isRequired,
      detail: PropTypes.string.isRequired,
      accent: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
    })
  ),
};

export default InicioPanel;
