import React from 'react';
import PropTypes from 'prop-types';
import './layout.css';

const Layout = ({ navbar, sidebar, children, footer }) => (
  <div className="app-shell">
    {navbar && <header className="app-shell__navbar">{navbar}</header>}
    <div className="app-shell__body">
      {sidebar && <aside className="app-shell__sidebar">{sidebar}</aside>}
      <main className="app-shell__content">{children}</main>
    </div>
    {footer && <footer className="app-shell__footer">{footer}</footer>}
  </div>
);

Layout.propTypes = {
  navbar: PropTypes.node,
  sidebar: PropTypes.node,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
};

Layout.defaultProps = {
  navbar: null,
  sidebar: null,
  footer: null,
};

export default Layout;
