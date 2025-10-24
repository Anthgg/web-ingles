import React from 'react';
import PropTypes from 'prop-types';
import './sidebar.css';

const Sidebar = ({ sections, onSelect, activeKey, footer }) => (
  <div className="app-sidebar">
    <nav className="app-sidebar__nav">
      {sections.map((section) => (
        <div key={section.id || section.title} className="app-sidebar__section">
          {section.title && <div className="app-sidebar__section-title">{section.title}</div>}
          <ul>
            {section.items.map((item) => (
              <li key={item.id || item.label}>
                <button
                  type="button"
                  className={`app-sidebar__item${activeKey === item.id ? ' is-active' : ''}`}
                  onClick={() => onSelect?.(item)}
                >
                  {item.icon && <span className="app-sidebar__item-icon">{item.icon}</span>}
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
    {footer && <div className="app-sidebar__footer">{footer}</div>}
  </div>
);

Sidebar.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.node,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.node.isRequired,
        icon: PropTypes.node,
      })
    ).isRequired,
  })),
  onSelect: PropTypes.func,
  activeKey: PropTypes.string,
  footer: PropTypes.node,
};

Sidebar.defaultProps = {
  sections: [],
  onSelect: undefined,
  activeKey: '',
  footer: null,
};

export default Sidebar;
