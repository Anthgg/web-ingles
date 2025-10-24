import React from 'react';
import PropTypes from 'prop-types';
import './table.css';

const Table = ({ columns, data, emptyMessage }) => (
  <div className="app-table">
    <table>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key || column.accessor}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="app-table__empty">{emptyMessage}</td>
          </tr>
        ) : (
          data.map((row) => (
            <tr key={row.id || JSON.stringify(row)}>
              {columns.map((column) => {
                const value = column.render ? column.render(row) : row[column.accessor];
                return <td key={column.key || column.accessor}>{value}</td>;
              })}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

Table.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string,
      header: PropTypes.node.isRequired,
      accessor: PropTypes.string,
      render: PropTypes.func,
    })
  ).isRequired,
  data: PropTypes.arrayOf(PropTypes.object),
  emptyMessage: PropTypes.node,
};

Table.defaultProps = {
  data: [],
  emptyMessage: 'No hay registros disponibles',
};

export default Table;
