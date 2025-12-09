import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FaUser, FaCamera, FaSpinner, FaSave, FaTimes, FaCheckCircle,
  FaLock, FaEye, FaEyeSlash, FaEdit, FaIdCard, FaEnvelope, FaPhone,
  FaMapMarkerAlt, FaCalendarAlt, FaVenusMars, FaExclamationTriangle,
  FaShieldAlt, FaKey, FaUserEdit, FaTrash
} from 'react-icons/fa';

const PHONE_CODE_OPTIONS = [
  { code: '+51', label: 'Perú', badge: 'PE' },
  { code: '+57', label: 'Colombia', badge: 'CO' },
  { code: '+56', label: 'Chile', badge: 'CL' },
  { code: '+52', label: 'México', badge: 'MX' },
  { code: '+54', label: 'Argentina', badge: 'AR' },
  { code: '+591', label: 'Bolivia', badge: 'BO' },
  { code: '+58', label: 'Venezuela', badge: 'VE' },
  { code: '+1', label: 'EE.UU./Canadá', badge: 'US' },
  { code: '+34', label: 'España', badge: 'ES' }
];

const splitTelefono = (valor = '') => {
  if (!valor) return { codigo: '+51', numero: '' };
  const trimmed = valor.trim();
  const match = trimmed.match(/^(\+\d{1,4})(.*)$/);
  if (match) {
    return {
      codigo: match[1],
      numero: match[2].trim().replace(/\s+/g, ' '),
    };
  }
  return { codigo: '+51', numero: trimmed };
};

const buildTelefonoValor = (codigo, numero) => {
  const cleanNumero = numero.trim();
  return cleanNumero ? `${codigo} ${cleanNumero}`.trim() : '';
};

const PerfilDocente = ({ userInfo, token, showError, showSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [activeSection, setActiveSection] = useState('info');
  
  // Estados de foto
  const [previewFoto, setPreviewFoto] = useState(null);
  const [tieneFoto, setTieneFoto] = useState(false);
  const fileInputRef = useRef(null);
  
  // Estados de datos personales
  const [datosPersonales, setDatosPersonales] = useState({
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    email: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
    genero: '',
    documento_identidad: ''
  });
  const [telefonoCodigo, setTelefonoCodigo] = useState('+51');
  const [telefonoNumero, setTelefonoNumero] = useState('');
  const [editMode, setEditMode] = useState(false);
  
  // Estados de cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (userInfo?.id) {
      cargarDatosUsuario();
    }
  }, [userInfo?.id]);

  const cargarDatosUsuario = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3002/usuarios/${userInfo.id}/datos-completos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al cargar datos');

      const data = await response.json();
      const basicos = data.basicos || {};
      
      // Formatear fecha
      let fechaNacimiento = basicos.fecha_nacimiento || '';
      if (fechaNacimiento && fechaNacimiento.includes('T')) {
        fechaNacimiento = fechaNacimiento.split('T')[0];
      }
      
      setDatosPersonales({
        nombres: basicos.nombres || basicos.nombre || '',
        apellido_paterno: basicos.apellido_paterno || '',
        apellido_materno: basicos.apellido_materno || '',
        email: basicos.email || userInfo.email || '',
        telefono: basicos.telefono || '',
        direccion: basicos.direccion || '',
        fecha_nacimiento: fechaNacimiento,
        genero: basicos.genero || '',
        documento_identidad: basicos.documento_identidad || ''
      });
      
      // Parsear teléfono
      const telefonoParsed = splitTelefono(basicos.telefono);
      setTelefonoCodigo(telefonoParsed.codigo);
      setTelefonoNumero(telefonoParsed.numero);
      
      // Verificar foto de perfil
      const tieneFotoPerfil = basicos.tiene_foto_perfil || 
        basicos.foto_perfil_imagen || 
        basicos.foto_perfil;
      
      if (tieneFotoPerfil) {
        setTieneFoto(true);
        setPreviewFoto(`http://localhost:3002/usuarios/${userInfo.id}/foto-perfil?t=${Date.now()}`);
      }
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      showError?.('Error al cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };

  // Manejar selección de foto
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validar tipo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
      showError?.('Tipo de imagen no permitido. Use JPEG, PNG, GIF o WebP');
      return;
    }
    
    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError?.('La imagen es muy grande. Máximo 5MB');
      return;
    }
    
    // Crear preview y subir
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      setPreviewFoto(base64Data);
      await subirFoto(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const subirFoto = async (dataUrl, tipo) => {
    try {
      setUploadingPhoto(true);
      
      // Extraer base64 sin el prefijo data:image/xxx;base64,
      const base64 = dataUrl.split(',')[1];
      
      const response = await fetch(`http://localhost:3002/usuarios/${userInfo.id}/foto-perfil`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          foto: base64,
          tipo: tipo
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir foto');
      }
      
      setTieneFoto(true);
      showSuccess?.('Foto de perfil actualizada correctamente');
      
    } catch (error) {
      console.error('Error subiendo foto:', error);
      showError?.(error.message || 'Error al subir la foto');
      // Revertir preview si hay error
      if (tieneFoto) {
        setPreviewFoto(`http://localhost:3002/usuarios/${userInfo.id}/foto-perfil?t=${Date.now()}`);
      } else {
        setPreviewFoto(null);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const eliminarFoto = async () => {
    try {
      setUploadingPhoto(true);
      
      const response = await fetch(`http://localhost:3002/usuarios/${userInfo.id}/foto-perfil`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Error al eliminar foto');
      
      setPreviewFoto(null);
      setTieneFoto(false);
      showSuccess?.('Foto de perfil eliminada');
      
    } catch (error) {
      console.error('Error eliminando foto:', error);
      showError?.('Error al eliminar la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Guardar datos personales
  const guardarDatosPersonales = async () => {
    try {
      setSaving(true);
      
      const telefonoCompleto = buildTelefonoValor(telefonoCodigo, telefonoNumero);
      
      const response = await fetch(`http://localhost:3002/usuarios/${userInfo.id}/datos-completos`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          basicos: {
            telefono: telefonoCompleto,
            direccion: datosPersonales.direccion,
            // Solo campos editables por el usuario
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }
      
      setEditMode(false);
      showSuccess?.('Datos actualizados correctamente');
      
    } catch (error) {
      console.error('Error guardando datos:', error);
      showError?.(error.message || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  // Cambiar contraseña
  const cambiarContrasena = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;
    
    // Validaciones
    if (!currentPassword) {
      showError?.('Ingresa tu contraseña actual');
      return;
    }
    
    if (!newPassword) {
      showError?.('Ingresa la nueva contraseña');
      return;
    }
    
    if (newPassword.length < 6) {
      showError?.('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showError?.('Las contraseñas no coinciden');
      return;
    }
    
    try {
      setChangingPassword(true);
      
      // Primero verificar contraseña actual haciendo login
      const loginResponse = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: datosPersonales.email || userInfo.email,
          password: currentPassword
        })
      });
      
      if (!loginResponse.ok) {
        throw new Error('Contraseña actual incorrecta');
      }
      
      // Actualizar contraseña
      const updateResponse = await fetch(`http://localhost:3002/usuarios/${userInfo.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: newPassword
        })
      });
      
      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.error || 'Error al cambiar contraseña');
      }
      
      // Limpiar formulario
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      showSuccess?.('Contraseña actualizada correctamente');
      
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      showError?.(error.message || 'Error al cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  // Fuerza de contraseña
  const passwordStrength = useMemo(() => {
    const pass = passwordData.newPassword;
    if (!pass) return { level: 0, text: '', color: '' };
    
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    
    if (score <= 2) return { level: 1, text: 'Débil', color: '#ef4444' };
    if (score <= 4) return { level: 2, text: 'Media', color: '#f59e0b' };
    return { level: 3, text: 'Fuerte', color: '#10b981' };
  }, [passwordData.newPassword]);

  const sections = [
    { id: 'info', label: 'Información', icon: FaUser },
    { id: 'password', label: 'Contraseña', icon: FaKey },
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: '1rem'
      }}>
        <FaSpinner className="fa-spin" style={{ fontSize: '2rem', color: '#6366f1' }} />
        <span style={{ color: '#94a3b8' }}>Cargando perfil...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header con foto de perfil */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 27, 75, 0.95) 100%)',
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '1.5rem',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Foto de perfil */}
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid rgba(99, 102, 241, 0.5)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
            }}>
              {previewFoto ? (
                <img 
                  src={previewFoto} 
                  alt="Foto de perfil"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => {
                    setPreviewFoto(null);
                    setTieneFoto(false);
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaUser style={{ fontSize: '3rem', color: '#818cf8' }} />
                </div>
              )}
              
              {uploadingPhoto && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%'
                }}>
                  <FaSpinner className="fa-spin" style={{ fontSize: '1.5rem', color: 'white' }} />
                </div>
              )}
            </div>
            
            {/* Botones de foto */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              display: 'flex',
              gap: '0.25rem'
            }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  border: '2px solid white',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)'
                }}
                title="Cambiar foto"
              >
                <FaCamera style={{ fontSize: '0.9rem' }} />
              </button>
              
              {tieneFoto && (
                <button
                  onClick={eliminarFoto}
                  disabled={uploadingPhoto}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: '2px solid white',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                  }}
                  title="Eliminar foto"
                >
                  <FaTrash style={{ fontSize: '0.8rem' }} />
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </div>
          
          {/* Información del usuario */}
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              color: '#ffffff',
              marginBottom: '0.5rem',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              {datosPersonales.nombres || userInfo?.nombre || 'Usuario'}
              {datosPersonales.apellido_paterno && ` ${datosPersonales.apellido_paterno}`}
              {datosPersonales.apellido_materno && ` ${datosPersonales.apellido_materno}`}
            </h2>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'rgba(148, 163, 184, 0.9)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FaEnvelope style={{ color: '#a78bfa' }} />
                {datosPersonales.email || userInfo?.email}
              </span>
              
              {(telefonoNumero || datosPersonales.telefono) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaPhone style={{ color: '#a78bfa' }} />
                  {buildTelefonoValor(telefonoCodigo, telefonoNumero) || datosPersonales.telefono}
                </span>
              )}
              
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                <FaShieldAlt />
                Docente
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación de secciones */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        background: 'rgba(15, 23, 42, 0.6)',
        padding: '0.5rem',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              background: activeSection === section.id 
                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              color: activeSection === section.id ? 'white' : 'rgba(148, 163, 184, 0.9)'
            }}
          >
            <section.icon />
            {section.label}
          </button>
        ))}
      </div>

      {/* Contenido de la sección activa */}
      {activeSection === 'info' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaUserEdit style={{ color: '#a78bfa' }} />
              Información Personal
            </h3>
            
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.5)',
                  background: 'rgba(99, 102, 241, 0.1)',
                  color: '#a78bfa',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}
              >
                <FaEdit />
                Editar
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setEditMode(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    background: 'rgba(148, 163, 184, 0.1)',
                    color: 'rgba(148, 163, 184, 0.9)',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '0.875rem'
                  }}
                >
                  <FaTimes />
                  Cancelar
                </button>
                <button
                  onClick={guardarDatosPersonales}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                    fontSize: '0.875rem'
                  }}
                >
                  {saving ? <FaSpinner className="fa-spin" /> : <FaSave />}
                  Guardar
                </button>
              </div>
            )}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* Nombre (solo lectura) */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                <FaUser style={{ color: '#a78bfa' }} />
                Nombre completo
              </label>
              <input
                type="text"
                value={`${datosPersonales.nombres} ${datosPersonales.apellido_paterno} ${datosPersonales.apellido_materno}`.trim() || userInfo?.nombre || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: 'rgba(148, 163, 184, 0.8)',
                  fontSize: '0.95rem'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.6)', marginTop: '0.25rem', display: 'block' }}>
                Contacta al administrador para cambiar tu nombre
              </span>
            </div>

            {/* Email (solo lectura) */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                <FaEnvelope style={{ color: '#a78bfa' }} />
                Correo electrónico
              </label>
              <input
                type="email"
                value={datosPersonales.email || userInfo?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: 'rgba(148, 163, 184, 0.8)',
                  fontSize: '0.95rem'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'rgba(148, 163, 184, 0.6)', marginTop: '0.25rem', display: 'block' }}>
                El email no se puede modificar
              </span>
            </div>

            {/* DNI (solo lectura) */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                <FaIdCard style={{ color: '#a78bfa' }} />
                Documento de identidad
              </label>
              <input
                type="text"
                value={datosPersonales.documento_identidad || 'No registrado'}
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: 'rgba(148, 163, 184, 0.8)',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            {/* Teléfono (editable) */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                <FaPhone style={{ color: '#a78bfa' }} />
                Teléfono
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  value={telefonoCodigo}
                  onChange={(e) => setTelefonoCodigo(e.target.value)}
                  disabled={!editMode}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    background: editMode ? 'rgba(30, 27, 75, 0.8)' : 'rgba(15, 23, 42, 0.5)',
                    color: editMode ? '#ffffff' : 'rgba(148, 163, 184, 0.8)',
                    fontSize: '0.95rem',
                    width: '100px'
                  }}
                >
                  {PHONE_CODE_OPTIONS.map(opt => (
                    <option key={opt.code} value={opt.code}>
                      {opt.badge} {opt.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={telefonoNumero}
                  onChange={(e) => setTelefonoNumero(e.target.value)}
                  disabled={!editMode}
                  placeholder="999 888 777"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    background: editMode ? 'rgba(30, 27, 75, 0.8)' : 'rgba(15, 23, 42, 0.5)',
                    color: editMode ? '#ffffff' : 'rgba(148, 163, 184, 0.8)',
                    fontSize: '0.95rem'
                  }}
                />
              </div>
            </div>

            {/* Dirección (editable) */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                <FaMapMarkerAlt style={{ color: '#a78bfa' }} />
                Dirección
              </label>
              <input
                type="text"
                value={datosPersonales.direccion}
                onChange={(e) => setDatosPersonales(prev => ({ ...prev, direccion: e.target.value }))}
                disabled={!editMode}
                placeholder="Tu dirección"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  background: editMode ? 'rgba(30, 27, 75, 0.8)' : 'rgba(15, 23, 42, 0.5)',
                  color: editMode ? '#ffffff' : 'rgba(148, 163, 184, 0.8)',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            {/* Fecha de nacimiento (solo lectura) */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                <FaCalendarAlt style={{ color: '#a78bfa' }} />
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={datosPersonales.fecha_nacimiento}
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: 'rgba(148, 163, 184, 0.8)',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            {/* Género (solo lectura) */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                <FaVenusMars style={{ color: '#a78bfa' }} />
                Género
              </label>
              <input
                type="text"
                value={datosPersonales.genero || 'No especificado'}
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: 'rgba(148, 163, 184, 0.8)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeSection === 'password' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <FaLock style={{ color: '#a78bfa' }} />
            Cambiar Contraseña
          </h3>

          <div style={{
            maxWidth: '500px',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Contraseña actual */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                Contraseña actual
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Ingresa tu contraseña actual"
                  style={{
                    width: '100%',
                    padding: '0.75rem 3rem 0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    background: 'rgba(30, 27, 75, 0.8)',
                    color: '#ffffff',
                    fontSize: '0.95rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(148, 163, 184, 0.8)'
                  }}
                >
                  {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                Nueva contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  style={{
                    width: '100%',
                    padding: '0.75rem 3rem 0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    background: 'rgba(30, 27, 75, 0.8)',
                    color: '#ffffff',
                    fontSize: '0.95rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(148, 163, 184, 0.8)'
                  }}
                >
                  {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              
              {/* Indicador de fuerza */}
              {passwordData.newPassword && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{
                    display: 'flex',
                    gap: '0.25rem',
                    marginBottom: '0.25rem'
                  }}>
                    {[1, 2, 3].map(level => (
                      <div
                        key={level}
                        style={{
                          flex: 1,
                          height: '4px',
                          borderRadius: '2px',
                          background: level <= passwordStrength.level 
                            ? passwordStrength.color 
                            : 'rgba(99, 102, 241, 0.2)'
                        }}
                      />
                    ))}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    color: passwordStrength.color,
                    fontWeight: '500'
                  }}>
                    Seguridad: {passwordStrength.text}
                  </span>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'rgba(148, 163, 184, 0.9)'
              }}>
                Confirmar nueva contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Repite la nueva contraseña"
                  style={{
                    width: '100%',
                    padding: '0.75rem 3rem 0.75rem 1rem',
                    borderRadius: '10px',
                    border: `1px solid ${
                      passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                        ? '#ef4444'
                        : 'rgba(99, 102, 241, 0.2)'
                    }`,
                    background: 'rgba(30, 27, 75, 0.8)',
                    color: '#ffffff',
                    fontSize: '0.95rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(148, 163, 184, 0.8)'
                  }}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              
              {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  marginTop: '0.25rem'
                }}>
                  <FaExclamationTriangle />
                  Las contraseñas no coinciden
                </span>
              )}
              
              {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#10b981',
                  marginTop: '0.25rem'
                }}>
                  <FaCheckCircle />
                  Las contraseñas coinciden
                </span>
              )}
            </div>

            {/* Botón cambiar */}
            <button
              onClick={cambiarContrasena}
              disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem',
                opacity: (changingPassword || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword) ? 0.6 : 1,
                marginTop: '0.5rem'
              }}
            >
              {changingPassword ? (
                <>
                  <FaSpinner className="fa-spin" />
                  Cambiando...
                </>
              ) : (
                <>
                  <FaKey />
                  Cambiar Contraseña
                </>
              )}
            </button>

            {/* Tips de seguridad */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
              borderRadius: '12px',
              padding: '1rem',
              marginTop: '0.5rem',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <h4 style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#a78bfa',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FaShieldAlt />
                Consejos de seguridad
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: '1.25rem',
                fontSize: '0.8rem',
                color: 'rgba(148, 163, 184, 0.9)',
                lineHeight: '1.6'
              }}>
                <li>Usa al menos 8 caracteres</li>
                <li>Combina mayúsculas, minúsculas y números</li>
                <li>Incluye símbolos especiales (!@#$%)</li>
                <li>No uses información personal fácil de adivinar</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerfilDocente;
