import React, { useState } from 'react';
import { FaIdCard, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const ConsultaDNI = ({ token, onDatosObtenidos, showError, showSuccess }) => {
  const [dni, setDni] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [verificado, setVerificado] = useState(false);

  const consultarDNI = async () => {
    // Validar que sea DNI de 8 dígitos
    if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
      showError?.('El DNI debe tener 8 dígitos');
      return;
    }

    try {
      setConsultando(true);
      setVerificado(false);
      
      const response = await fetch(`http://localhost:3002/usuarios/consultar-dni/${dni}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 500) {
          throw new Error(data.error || 'Error del servidor. La API Key puede estar vencida.');
        } else if (response.status === 404) {
          throw new Error('DNI no encontrado en RENIEC');
        } else {
          throw new Error(data.error || 'Error al verificar DNI');
        }
      }
      
      if (data.success) {
        setVerificado(true);
        showSuccess?.(`DNI verificado: ${data.nombre_completo}`);
        
        // Enviar datos al componente padre
        onDatosObtenidos?.({
          nombres: data.nombres || '',
          apellido_paterno: data.apellido_paterno || '',
          apellido_materno: data.apellido_materno || '',
          documento_identidad: dni,
          dni_verificado: true
        });
      }
    } catch (error) {
      console.error('Error al consultar DNI:', error);
      setVerificado(false);
      showError?.(error.message || 'No se pudo verificar el DNI. Verifica que el número sea correcto.');
    } finally {
      setConsultando(false);
    }
  };

  const handleChange = (e) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 8);
    setDni(valor);
    setVerificado(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      consultarDNI();
    }
  };

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
        <FaIdCard className="mr-2 text-blue-600" />
        Verificación de DNI con RENIEC
      </h4>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de DNI
            {consultando && (
              <span className="ml-2 text-blue-600">
                <FaSpinner className="inline animate-spin" /> Consultando...
              </span>
            )}
            {verificado && (
              <span className="ml-2 text-green-600">
                <FaCheckCircle className="inline" /> Verificado
              </span>
            )}
            {!consultando && !verificado && dni.length === 8 && (
              <span className="ml-2 text-gray-500">
                <FaTimesCircle className="inline" /> No verificado
              </span>
            )}
          </label>
          <input
            type="text"
            value={dni}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ingrese DNI de 8 dígitos"
            maxLength="8"
            disabled={consultando}
          />
          <p className="text-xs text-gray-500 mt-1">
            Presiona Enter o haz clic en "Verificar" para consultar con RENIEC
          </p>
        </div>
        <div className="flex items-end">
          <button
            onClick={consultarDNI}
            disabled={consultando || dni.length !== 8}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {consultando ? (
              <>
                <FaSpinner className="animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <FaCheckCircle />
                Verificar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultaDNI;
