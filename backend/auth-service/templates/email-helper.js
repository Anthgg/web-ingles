/**
 * Helper para generar correos electrónicos con plantilla HTML
 * GoEnglish - Sistema de correos elegantes
 */

const fs = require('fs');
const path = require('path');

/**
 * Logo GoEnglish embebido en Base64 (SVG verde con "GE")
 * Compatible con todos los clientes de correo
 */
const LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iMTIiIGZpbGw9IiMxMGI5ODEiLz4KPHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIj5HRTwvdGV4dD4KPC9zdmc+';

/**
 * Intenta cargar el logo desde archivo local y convertirlo a Base64
 * @returns {string} URL del logo (base64 o URL externa)
 */
function getLogoUrl() {
    // Primero verificar si hay una URL de logo configurada en env
    if (process.env.EMAIL_LOGO_URL) {
        return process.env.EMAIL_LOGO_URL;
    }
    
    // Intentar cargar logo desde archivo local del frontend
    const logoPath = path.join(__dirname, '../../../frontend/public/logo.png');
    
    try {
        if (fs.existsSync(logoPath)) {
            const logoBuffer = fs.readFileSync(logoPath);
            const base64Logo = logoBuffer.toString('base64');
            return `data:image/png;base64,${base64Logo}`;
        }
    } catch (error) {
        console.log('[Email] No se pudo cargar logo local, usando SVG embebido');
    }
    
    // Fallback al logo SVG embebido
    return LOGO_BASE64;
}

/**
 * Obtiene el saludo según la hora actual
 * @returns {string} Saludo apropiado para la hora del día
 */
function getSaludo() {
    const hora = new Date().getHours();
    
    if (hora >= 6 && hora < 12) {
        return 'Buenos días';
    } else if (hora >= 12 && hora < 18) {
        return 'Buenas tardes';
    } else if (hora >= 18 && hora <= 23) {
        return 'Buenas noches';
    } else {
        // 00:00 - 05:59 - Modo nocturno 🌙
        return 'Hola';
    }
}

/**
 * Formatea la fecha actual en español
 * @returns {string} Fecha formateada
 */
function getFechaFormateada() {
    const opciones = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    const fecha = new Date().toLocaleDateString('es-ES', opciones);
    // Capitalizar primera letra
    return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

/**
 * Configuración por defecto para los correos
 * @returns {Object} Configuración con logo dinámico
 */
function getDefaultConfig() {
    return {
        logo_url: getLogoUrl(),
        soporte_email: process.env.FROM_EMAIL || 'soporte@goenglish.com',
        direccion: 'Academia GoEnglish - Tu plataforma de aprendizaje de inglés',
        facebook_url: process.env.FACEBOOK_URL || '#',
        instagram_url: process.env.INSTAGRAM_URL || '#',
        website_url: process.env.WEBSITE_URL || '#',
        año: new Date().getFullYear(),
        expiracion: 10 // minutos
    };
}

/**
 * Renderiza la plantilla de email OTP
 * @param {Object} datos - Datos para personalizar el correo
 * @param {string} datos.nombre - Nombre del destinatario
 * @param {string} datos.codigo - Código OTP
 * @param {string} [datos.mensaje] - Mensaje personalizado
 * @param {Object} [datos.config] - Configuración adicional (logo, contacto, etc.)
 * @returns {string} HTML del correo renderizado
 */
function renderEmailOTP(datos) {
    const templatePath = path.join(__dirname, 'email-otp.html');
    
    // Leer plantilla
    let html;
    try {
        html = fs.readFileSync(templatePath, 'utf8');
    } catch (error) {
        console.error('Error al leer plantilla de email:', error);
        // Fallback a email simple
        return renderEmailSimple(datos);
    }
    
    // Combinar configuración
    const config = { ...getDefaultConfig(), ...(datos.config || {}) };
    
    // Datos del correo
    const variables = {
        saludo: getSaludo(),
        fecha: getFechaFormateada(),
        nombre: datos.nombre || 'Usuario',
        codigo: datos.codigo || '000000',
        mensaje: datos.mensaje || 'Has solicitado un código de verificación para tu cuenta. Ingresa el siguiente código para continuar:',
        asunto: datos.asunto || 'Código de verificación - I.E Peruano Japonés 7213',
        ...config
    };
    
    // Reemplazar todas las variables {{variable}}
    Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, variables[key]);
    });
    
    return html;
}

/**
 * Fallback: Email simple sin plantilla HTML
 * @param {Object} datos - Datos del correo
 * @returns {string} HTML simple
 */
function renderEmailSimple(datos) {
    const saludo = getSaludo();
    const nombre = datos.nombre || 'Usuario';
    const codigo = datos.codigo || '000000';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #10b981; margin-bottom: 20px;">GoEnglish</h2>
            <p style="color: #333; font-size: 16px;">${saludo}, ${nombre}!</p>
            <p style="color: #666;">Tu código de verificación es:</p>
            <div style="background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px;">${codigo}</span>
            </div>
            <p style="color: #999; font-size: 13px;">Este código expira en 10 minutos.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} GoEnglish. Todos los derechos reservados.
            </p>
        </div>
    </body>
    </html>
    `;
}

/**
 * Renderiza plantilla genérica de notificación
 * @param {Object} datos - Datos para el correo
 * @param {string} datos.nombre - Nombre del destinatario
 * @param {string} datos.titulo - Título de la notificación
 * @param {string} datos.mensaje - Contenido del mensaje
 * @param {string} [datos.boton_texto] - Texto del botón CTA
 * @param {string} [datos.boton_url] - URL del botón CTA
 * @returns {string} HTML del correo
 */
function renderEmailNotificacion(datos) {
    const saludo = getSaludo();
    const fecha = getFechaFormateada();
    const config = { ...getDefaultConfig(), ...(datos.config || {}) };
    
    const botonHTML = datos.boton_texto && datos.boton_url ? `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
            <tr>
                <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; padding: 14px 32px;">
                    <a href="${datos.boton_url}" style="color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">
                        ${datos.boton_texto}
                    </a>
                </td>
            </tr>
        </table>
    ` : '';
    
    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f7fa; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 28px 40px; text-align: center;">
                                <img src="${config.logo_url}" alt="GoEnglish" width="50" height="50" style="display: block; margin: 0 auto 12px auto; border-radius: 10px;" />
                                <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">GoEnglish</h1>
                            </td>
                        </tr>
                        
                        <!-- Greeting -->
                        <tr>
                            <td style="background-color: #f0fdf4; padding: 16px 40px; border-bottom: 1px solid #d1fae5;">
                                <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: 600;">
                                    ${saludo}, ${datos.nombre || 'Usuario'} 👋
                                </p>
                                <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">${fecha}</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 36px 40px;">
                                ${datos.titulo ? `<h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px; font-weight: 600;">${datos.titulo}</h2>` : ''}
                                
                                <div style="background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;">
                                    <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.7;">
                                        ${datos.mensaje || ''}
                                    </p>
                                </div>
                                
                                ${botonHTML}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                                    ¿Necesitas ayuda? <a href="mailto:${config.soporte_email}" style="color: #10b981; text-decoration: none;">${config.soporte_email}</a>
                                </p>
                                <p style="margin: 0; color: #9ca3af; font-size: 11px; text-align: center;">
                                    © ${config.año} GoEnglish. Todos los derechos reservados.
                                </p>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

module.exports = {
    getSaludo,
    getFechaFormateada,
    renderEmailOTP,
    renderEmailSimple,
    renderEmailNotificacion,
    getDefaultConfig,
    getLogoUrl
};
