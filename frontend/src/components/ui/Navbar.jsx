import React from 'react';
import PropTypes from 'prop-types';
import './navbar.css';

const Navbar = ({ brand, actions, children }) => (
  <div className="app-navbar">
    <div className="app-navbar__brand">{brand}</div>
    <div className="app-navbar__content">{children}</div>
    {actions && <div className="app-navbar__actions">{actions}</div>}
  </div>
);

Navbar.propTypes = {
  brand: PropTypes.node,
  actions: PropTypes.node,
  children: PropTypes.node,
};

Navbar.defaultProps = {
  brand: null,
  actions: null,
  children: null,
};

export default Navbar;
