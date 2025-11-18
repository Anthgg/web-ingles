/**
 * Utilidades para el sistema de chat
 */

// Formatear fecha relativa (Hoy, Ayer, fecha)
export const formatMessageDate = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Resetear horas para comparación de días
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (messageDate.getTime() === todayDate.getTime()) {
    return 'Hoy';
  } else if (messageDate.getTime() === yesterdayDate.getTime()) {
    return 'Ayer';
  } else {
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }
};

// Formatear hora (HH:MM)
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
};

// Formatear última actividad (hace 5m, hace 1h, ayer, etc)
export const formatLastSeen = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays}d`;
  
  return date.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit'
  });
};

// Formatear tamaño de archivo
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Obtener tipo de archivo por extensión
export const getFileType = (filename) => {
  if (!filename) return 'file';
  
  const ext = filename.split('.').pop().toLowerCase();
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'];
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  const spreadsheetExts = ['xls', 'xlsx', 'csv'];
  const presentationExts = ['ppt', 'pptx'];
  
  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (docExts.includes(ext)) return 'document';
  if (spreadsheetExts.includes(ext)) return 'spreadsheet';
  if (presentationExts.includes(ext)) return 'presentation';
  
  return 'file';
};

// Obtener icono de archivo según tipo
export const getFileIcon = (type) => {
  const icons = {
    image: '🖼️',
    video: '🎥',
    audio: '🎵',
    document: '📄',
    pdf: '📕',
    spreadsheet: '📊',
    presentation: '📊',
    file: '📎'
  };
  
  return icons[type] || icons.file;
};

// Truncar texto largo
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Agrupar mensajes por fecha
export const groupMessagesByDate = (messages) => {
  if (!Array.isArray(messages)) return {};
  
  const groups = {};
  
  messages.forEach(message => {
    const dateKey = formatMessageDate(message.sent_at);
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });
  
  return groups;
};

// Verificar si es una imagen
export const isImageFile = (filename) => {
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext);
};

// Verificar si es un video
export const isVideoFile = (filename) => {
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext);
};

// Obtener nombre de usuario o "Usuario"
export const getUserDisplayName = (user) => {
  if (!user) return 'Usuario';
  return user.nombre || user.name || user.email || 'Usuario';
};

// Obtener iniciales del usuario
export const getUserInitials = (user) => {
  const name = getUserDisplayName(user);
  const parts = name.split(' ');
  
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  
  return name.substring(0, 2).toUpperCase();
};

// Generar color de avatar basado en nombre
export const getAvatarColor = (name) => {
  if (!name) return '#6b7280';
  
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', 
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6',
    '#6366f1', '#8b5cf6', '#a855f7', '#ec4899'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const STUDENT_ROLE_KEYS = new Set(['alumno', 'estudiante', 'student']);
const ADMIN_ROLE_KEYS = new Set(['admin', 'administrativo']);

export const isStudentRoleName = (role) => {
  if (!role) return false;
  return STUDENT_ROLE_KEYS.has(String(role).toLowerCase());
};

export const isAdminRoleName = (role) => {
  if (!role) return false;
  return ADMIN_ROLE_KEYS.has(String(role).toLowerCase());
};

// Validar URL
export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Scroll suave al final
export const scrollToBottom = (element, smooth = true) => {
  if (!element) return;
  
  element.scrollTo({
    top: element.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Normaliza coordenadas permitiendo comas como separador decimal
export const normalizeCoordinateInput = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : NaN;
  }

  if (typeof value !== 'string') {
    return NaN;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return NaN;
  }

  const match = trimmed.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return NaN;
  }

  const normalized = match[0].replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
};

// Construye una URL de Google Maps asegurando que se respete la coordenada exacta
export const buildGoogleMapsUrl = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const normalizedLat = lat.toFixed(6);
  const normalizedLng = lng.toFixed(6);
  // Usar el formato directo de Google Maps que es más confiable
  // Este formato abre directamente la ubicación exacta con un marcador
  return `https://www.google.com/maps?q=${normalizedLat},${normalizedLng}`;
};
