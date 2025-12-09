import React, { useState } from 'react';

/**
 * Componente reutilizable para mostrar avatar de usuario
 * Muestra foto de perfil si existe, o inicial del nombre si no
 */
const UserAvatar = ({ 
  userId, 
  nombre, 
  tieneFoto = false, 
  size = 'md',
  className = '' 
}) => {
  const [fotoError, setFotoError] = useState(false);

  React.useEffect(() => {
    setFotoError(false);
  }, [userId]);

  // Tamaños predefinidos
  const sizes = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
    '2xl': 'h-20 w-20 text-2xl'
  };

  const sizeClass = sizes[size] || sizes.md;
  const showFoto = tieneFoto && !fotoError && userId;
  const fotoSrc = showFoto ? `http://localhost:3002/usuarios/${userId}/foto-perfil` : null;

  return (
    <div className={`relative ${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${className}`}>
      {showFoto ? (
        <>
          <img 
            src={fotoSrc}
            alt={nombre || 'Usuario'}
            className={`${sizeClass} rounded-full object-cover`}
            onError={() => setFotoError(true)}
          />
          {fotoError && (
            <div className={`absolute inset-0 ${sizeClass} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold`}>
              {nombre?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </>
      ) : (
        <div className={`${sizeClass} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold`}>
          {nombre?.charAt(0).toUpperCase() || '?'}
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
