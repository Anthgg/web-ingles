import React, { useState, useEffect } from 'react';
import { FaUser } from 'react-icons/fa';

/**
 * Componente para mostrar la foto de perfil de un usuario
 * @param {number} usuarioId - ID del usuario
 * @param {string} size - Tamaño: 'sm' (32px), 'md' (64px), 'lg' (128px), 'xl' (192px)
 * @param {string} className - Clases CSS adicionales
 * @param {boolean} showBorder - Mostrar borde
 * @param {string} borderColor - Color del borde
 */
const FotoPerfil = ({ 
  usuarioId, 
  size = 'md', 
  className = '', 
  showBorder = true,
  borderColor = 'border-blue-500'
}) => {
  const [tieneFoto, setTieneFoto] = useState(false);
  const [urlFoto, setUrlFoto] = useState('');
  const [error, setError] = useState(false);

  // Tamaños predefinidos
  const sizes = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48'
  };

  const iconSizes = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl'
  };

  useEffect(() => {
    if (usuarioId) {
      verificarFoto();
    }
  }, [usuarioId]);

  const verificarFoto = async () => {
    try {
      const url = `http://localhost:3002/usuarios/${usuarioId}/foto-perfil?t=${Date.now()}`;
      const response = await fetch(url, { method: 'HEAD' });
      
      if (response.ok) {
        setTieneFoto(true);
        setUrlFoto(url);
        setError(false);
      } else {
        setTieneFoto(false);
      }
    } catch (err) {
      setTieneFoto(false);
      setError(true);
    }
  };

  const handleImageError = () => {
    setTieneFoto(false);
    setError(true);
  };

  const sizeClass = sizes[size] || sizes.md;
  const iconSize = iconSizes[size] || iconSizes.md;
  const borderClass = showBorder ? `border-4 ${borderColor}` : '';

  return (
    <div className={`${sizeClass} rounded-full overflow-hidden ${borderClass} ${className} flex-shrink-0`}>
      {tieneFoto && !error ? (
        <img
          src={urlFoto}
          alt="Foto de perfil"
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <FaUser className={`${iconSize} text-gray-500`} />
        </div>
      )}
    </div>
  );
};

export default FotoPerfil;
