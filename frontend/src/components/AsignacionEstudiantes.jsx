import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FaUserPlus, FaUserGraduate, FaSave, FaTimes, FaUsers, FaChalkboardTeacher, FaCalendarAlt, FaClock, FaSearch, FaStar, FaGraduationCap, FaBookOpen, FaSchool, FaCheckCircle, FaExclamationTriangle, FaBook } from 'react-icons/fa';

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const normalizeDateOnly = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const AsignacionEstudiantes = ({ usuarios, token, showError, showSuccess }) => {
  // Estados
  const [estudiantes, setEstudiantes] = useState([]);
  const [cursosProfesores, setCursosProfesores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    estudianteId: '',
    asignacionId: '',
  });
  const [filters, setFilters] = useState({
    nivel: '',
    grado: '',
    seccion: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null);
  const [cursosConEstudiantes, setCursosConEstudiantes] = useState([]);
  const [expandedCursos, setExpandedCursos] = useState(new Set());
  const [loadingEstudiantesAsignacion, setLoadingEstudiantesAsignacion] = useState(false);
  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3007';
  const today = useMemo(() => startOfToday(), []);

  const isCursoPasado = useCallback((curso) => {
    if (!curso) return false;
    const fechaFin = curso.fecha_fin || curso.fechaFin || curso.endDate || null;
    const normalized = normalizeDateOnly(fechaFin);
    return normalized ? normalized < today : false;
  }, [today]);

  const cursosActivos = useMemo(
    () => cursosProfesores.filter((curso) => !isCursoPasado(curso)),
    [cursosProfesores, isCursoPasado]
  );

  const cursosHistoricos = useMemo(
    () => cursosProfesores.filter((curso) => isCursoPasado(curso)),
    [cursosProfesores, isCursoPasado]
  );

  const normalizeText = useCallback((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return value;
  }, []);

  const normalizeGrade = useCallback((value) => {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length ? trimmed : null;
    }
    return value;
  }, []);

  const canonicalizeLevel = useCallback((value) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    return normalized
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }, [normalizeText]);

  const extractGradeNumber = useCallback((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Number(value);
    }
    if (typeof value === 'string') {
      const match = value.match(/\d+/);
      if (match && match[0]) {
        return Number(match[0]);
      }
    }
    return null;
  }, []);

  const resolveEstudianteId = useCallback((estudiante) => {
    if (!estudiante) return null;
    return (
      estudiante.estudiante_id ??
      estudiante.usuario_id ??
      estudiante.userId ??
      estudiante._id ??
      estudiante.id ??
      estudiante.ID ??
      null
    );
  }, []);

  const resolveCursoId = useCallback((curso) => {
    if (!curso) return null;
    return (
      curso.id ??
      curso.asignacion_id ??
      curso.asignacionId ??
      curso.course_assignment_id ??
      curso.cursoAsignacionId ??
      null
    );
  }, []);

  const formatLevelLabel = (level) => {
    if (level === null || level === undefined) return 'Nivel sin definir';
    if (typeof level === 'string') {
      const trimmed = level.trim();
      if (!trimmed) return 'Nivel sin definir';
      return trimmed.toLowerCase().startsWith('nivel') ? trimmed : `Nivel ${trimmed}`;
    }
    return `Nivel ${level}`;
  };

  const formatGradeLabel = (grade) => {
    if (grade === null || grade === undefined) return 'Grado sin definir';
    if (typeof grade === 'string') {
      const trimmed = grade.trim();
      if (!trimmed) return 'Grado sin definir';
      return trimmed.toLowerCase().startsWith('grado') ? trimmed : `Grado ${trimmed}`;
    }
    if (Number.isNaN(grade)) return 'Grado sin definir';
    return `Grado ${grade}`;
  };

  const formatSectionLabel = (section) => {
    if (section === null || section === undefined) return 'Sección sin definir';
    if (typeof section === 'string') {
      const trimmed = section.trim();
      if (!trimmed) return 'Sección sin definir';
      return trimmed.toLowerCase().startsWith('sección') || trimmed.toLowerCase().startsWith('seccion')
        ? trimmed
        : `Sección ${trimmed}`;
    }
    return `Sección ${section}`;
  };

  const buildUbicacionResumen = (curso) => [
    formatLevelLabel(curso?.level ?? null),
    formatGradeLabel(curso?.grade_number ?? null),
    formatSectionLabel(curso?.section ?? null),
  ].join(' • ');

  // Obtener estudiantes del listado de usuarios y asignar ciclo 1 automáticamente si es nuevo
  useEffect(() => {
    if (Array.isArray(usuarios)) {
      const estudiantesFiltrados = usuarios.filter((usuario) => usuario.rol === 'estudiante');
      console.log('[AsignacionEstudiantes] Estudiantes desde usuarios:', estudiantesFiltrados.map((e) => ({
        id: resolveEstudianteId(e),
        nombre: e.nombre,
        nivel_estudiante: e.nivel_estudiante ?? e.nivel ?? e?.datos_estudiante?.nivel ?? null,
        grado_estudiante: e.grado_estudiante ?? e.grado ?? e?.datos_estudiante?.grado ?? null,
      })));
      setEstudiantes(estudiantesFiltrados);
    }
  }, [usuarios]);

  // Efecto para la animación
  // Cargar cursos con profesores
  const fetchCursosProfesores = useCallback(async () => {
    try {
      const response = await axios.get(
        `${apiBaseUrl}/cursos-con-profesor`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = Array.isArray(response.data)
        ? response.data.map((item) => {
            const inscritosParsed = Number(item.inscritos);
            const maxParsed = item.max_alumnos != null ? Number(item.max_alumnos) : null;
            return {
              ...item,
              level: normalizeText(item.level),
              section: normalizeText(item.section),
              inscritos: Number.isNaN(inscritosParsed) ? 0 : inscritosParsed,
              max_alumnos: Number.isNaN(maxParsed) ? null : maxParsed,
              grade_number: normalizeGrade(item.grade_number),
            };
          })
        : [];
      setCursosProfesores(data);
    } catch (error) {
      console.error('Error cargando cursos con profesores:', error);
      showError('Error al cargar los cursos disponibles');
    }
  }, [apiBaseUrl, token, showError, normalizeGrade, normalizeText]);

  useEffect(() => {
    fetchCursosProfesores();
  }, [token, fetchCursosProfesores]);

  // Función para cargar estudiantes de un curso específico
  const fetchEstudiantesCurso = useCallback(async (cursoId) => {
    try {
      const response = await axios.get(
        `${apiBaseUrl}/asignaciones/${cursoId}/estudiantes`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error(`Error cargando estudiantes del curso ${cursoId}:`, error);
      return [];
    }
  }, [apiBaseUrl, token]);

  const actualizarEstudiantesAsignacion = useCallback(
    async (curso) => {
      const cursoId = resolveCursoId(curso);
      if (!cursoId) return;
      setLoadingEstudiantesAsignacion(true);
      try {
        const estudiantesCurso = await fetchEstudiantesCurso(cursoId);
        setCursosConEstudiantes((prev) => {
          const idx = prev.findIndex((c) => resolveCursoId(c) === cursoId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], estudiantesAsignados: estudiantesCurso };
            return updated;
          }
          return [...prev, { ...curso, estudiantesAsignados: estudiantesCurso }];
        });
      } catch (error) {
        console.error('Error cargando estudiantes del curso seleccionado:', error);
      } finally {
        setLoadingEstudiantesAsignacion(false);
      }
    },
    [fetchEstudiantesCurso, resolveCursoId]
  );

  // Cargar estudiantes cuando se expanda un curso
  useEffect(() => {
    const loadEstudiantes = async () => {
      const cursosConDatos = await Promise.all(
        cursosActivos.map(async (curso) => {
          const cursoId = curso.id || curso._id;
          if (expandedCursos.has(cursoId)) {
            const estudiantesCurso = await fetchEstudiantesCurso(cursoId);
            return { ...curso, estudiantesAsignados: estudiantesCurso };
          }
          return { ...curso, estudiantesAsignados: [] };
        })
      );
      setCursosConEstudiantes(cursosConDatos);
    };
    
    if (cursosActivos.length > 0) {
      loadEstudiantes();
    }
  }, [cursosActivos, expandedCursos, fetchEstudiantesCurso]);

  const estudianteSeleccionado = useMemo(() => {
    if (!formData.estudianteId) return null;
    return (
      estudiantes.find((est) => {
        const resolvedId = resolveEstudianteId(est);
        return resolvedId !== null && String(resolvedId) === String(formData.estudianteId);
      }) || null
    );
  }, [formData.estudianteId, estudiantes, resolveEstudianteId]);

  const estudianteNivel = useMemo(() => {
    if (!estudianteSeleccionado) return null;
    const levelCandidate =
      estudianteSeleccionado.nivel_estudiante ??
      estudianteSeleccionado.nivel ??
      estudianteSeleccionado?.datos_estudiante?.nivel ??
      null;
    return normalizeText(levelCandidate);
  }, [estudianteSeleccionado, normalizeText]);

  const estudianteNivelKey = useMemo(
    () => canonicalizeLevel(estudianteNivel),
    [canonicalizeLevel, estudianteNivel]
  );

  const estudianteGradoNumero = useMemo(() => {
    if (!estudianteSeleccionado) return null;
    const gradeCandidate =
      estudianteSeleccionado.grado_estudiante ??
      estudianteSeleccionado.grado ??
      estudianteSeleccionado?.datos_estudiante?.grado ??
      null;
    return extractGradeNumber(gradeCandidate);
  }, [estudianteSeleccionado, extractGradeNumber]);

  const studentProfileReady = Boolean(
    estudianteSeleccionado && estudianteNivelKey && estudianteGradoNumero != null
  );

  const requiereDatosAcademicos = Boolean(estudianteSeleccionado && !studentProfileReady);

  const cursosCompatibles = useMemo(() => {
    if (!estudianteSeleccionado) {
      return cursosActivos;
    }
    if (!studentProfileReady) {
      return [];
    }
    return cursosActivos.filter((curso) => {
      const cursoNivelKey = canonicalizeLevel(curso.level);
      if (!cursoNivelKey || cursoNivelKey !== estudianteNivelKey) {
        return false;
      }
      const cursoGrado = extractGradeNumber(curso.grade_number);
      return cursoGrado != null && cursoGrado === estudianteGradoNumero;
    });
  }, [
    cursosActivos,
    estudianteSeleccionado,
    estudianteNivelKey,
    estudianteGradoNumero,
    canonicalizeLevel,
    extractGradeNumber,
    studentProfileReady,
  ]);

  const cursosAsignables = estudianteSeleccionado ? cursosCompatibles : cursosActivos;
  const cursosCompatiblesCount = estudianteSeleccionado ? cursosCompatibles.length : cursosAsignables.length;

  const asignacionSeleccionada = useMemo(() => {
    if (!formData.asignacionId) return null;
    return (
      cursosAsignables.find((cp) => {
        const resolvedId = resolveCursoId(cp);
        return resolvedId !== null && String(resolvedId) === String(formData.asignacionId);
      }) || null
    );
  }, [formData.asignacionId, cursosAsignables, resolveCursoId]);

  // Cargar estudiantes del curso seleccionado para evitar duplicados
  useEffect(() => {
    if (!asignacionSeleccionada) {
      setLoadingEstudiantesAsignacion(false);
      return;
    }
    actualizarEstudiantesAsignacion(asignacionSeleccionada);
  }, [asignacionSeleccionada, actualizarEstudiantesAsignacion]);

  const aulaBloqueada = useMemo(() => {
    if (!asignacionSeleccionada) return false;
    const nivel = normalizeText(asignacionSeleccionada.level);
    const grado = normalizeGrade(asignacionSeleccionada.grade_number);
    const seccion = normalizeText(asignacionSeleccionada.section);
    return Boolean(nivel && grado !== null && seccion);
  }, [asignacionSeleccionada, normalizeGrade, normalizeText]);

  const sinCursosCompatibles = Boolean(
    estudianteSeleccionado && studentProfileReady && cursosCompatibles.length === 0
  );

  // Filtrar estudiantes según el curso seleccionado
  const estudiantesFiltrados = useMemo(() => {
    // Si no hay curso seleccionado, mostrar todos los estudiantes
    if (!formData.asignacionId) {
      return estudiantes;
    }
    // Mientras se cargan los estudiantes inscritos, no mostrar opciones para evitar duplicados temporales
    if (loadingEstudiantesAsignacion) {
      return [];
    }

    // Encontrar el curso seleccionado
    const cursoSeleccionadoParaFiltrar = cursosAsignables.find((cp) => {
      const resolvedId = resolveCursoId(cp);
      return resolvedId !== null && String(resolvedId) === String(formData.asignacionId);
    });

    // Si no se encuentra el curso, mostrar todos los estudiantes
    if (!cursoSeleccionadoParaFiltrar) {
      return estudiantes;
    }

    // Obtener nivel y grado del curso seleccionado
    const cursoNivelKey = canonicalizeLevel(cursoSeleccionadoParaFiltrar.level);
    const cursoGrado = extractGradeNumber(cursoSeleccionadoParaFiltrar.grade_number);
    const cursoId = resolveCursoId(cursoSeleccionadoParaFiltrar);

    const asignadosSet = new Set(
      (cursosConEstudiantes.find((c) => resolveCursoId(c) === cursoId)?.estudiantesAsignados || [])
        .map((est) => resolveEstudianteId(est))
        .filter((id) => id !== null && id !== undefined)
        .map(String)
    );
    console.log('[AsignacionEstudiantes] Depuracion filtro', {
      cursoId,
      asignacionId: formData.asignacionId,
      inscritosIds: Array.from(asignadosSet),
      totalEstudiantes: estudiantes.length,
    });

    // Filtrar estudiantes que coincidan con el nivel y grado del curso
    const cursoGradoNumber = Number.isFinite(Number(cursoGrado)) ? Number(cursoGrado) : cursoGrado;
    const filtrados = estudiantes.filter((estudiante) => {
      const estNivelCandidate =
        estudiante.nivel_estudiante ??
        estudiante.nivel ??
        estudiante?.datos_estudiante?.nivel ??
        null;
      const estNivelKey = canonicalizeLevel(normalizeText(estNivelCandidate));

      const estGradoCandidate =
        estudiante.grado_estudiante ??
        estudiante.grado ??
        estudiante?.datos_estudiante?.grado ??
        null;
      const estGradoRaw = extractGradeNumber(estGradoCandidate);
      const estGrado = Number.isFinite(Number(estGradoRaw)) ? Number(estGradoRaw) : estGradoRaw;
      const estId = resolveEstudianteId(estudiante);
      if (estId !== null && estId !== undefined && asignadosSet.has(String(estId))) {
        console.log('[AsignacionEstudiantes] Excluido por ya inscrito', {
          estId,
          nombre: estudiante.nombre,
          cursoId,
        });
      }

      // Si falta info clave, no es un match válido
      if (!cursoNivelKey || cursoGradoNumber == null || !estNivelKey || estGrado == null) {
        return false;
      }

      // Solo mostrar estudiantes con el mismo nivel y grado del curso
      if (estNivelKey !== cursoNivelKey || estGrado !== cursoGradoNumber) {
        return false;
      }

      // Excluir estudiantes ya inscritos en este curso
      if (estId !== null && estId !== undefined && asignadosSet.has(String(estId))) {
        return false;
      }

      return true;
    });

    // Debug en consola para ayudar a detectar por qué no aparecen estudiantes
    console.log('[AsignacionEstudiantes] Curso seleccionado:', {
      asignacionId: formData.asignacionId,
      nivel: cursoSeleccionadoParaFiltrar.level,
      cursoNivelKey,
      grado: cursoSeleccionadoParaFiltrar.grade_number,
      cursoGrado: cursoGradoNumber,
    });
    console.log('[AsignacionEstudiantes] Estudiantes coincidentes:', filtrados.length, filtrados.map((e) => ({
      id: resolveEstudianteId(e),
      nombre: e.nombre,
      nivel: e.nivel_estudiante ?? e.nivel ?? e?.datos_estudiante?.nivel ?? null,
      nivelKey: canonicalizeLevel(normalizeText(e.nivel_estudiante ?? e.nivel ?? e?.datos_estudiante?.nivel ?? null)),
      grado: e.grado_estudiante ?? e.grado ?? e?.datos_estudiante?.grado ?? null,
      gradoNumber: extractGradeNumber(e.grado_estudiante ?? e.grado ?? e?.datos_estudiante?.grado ?? null),
    })));
    if (filtrados.length === 0) {
      console.log('[AsignacionEstudiantes] Estudiantes disponibles (nivel/grado detectados):', estudiantes.map((e) => ({
        id: resolveEstudianteId(e),
        nombre: e.nombre,
        nivel: e.nivel_estudiante ?? e.nivel ?? e?.datos_estudiante?.nivel ?? null,
        grado: e.grado_estudiante ?? e.grado ?? e?.datos_estudiante?.grado ?? null,
        nivelKey: canonicalizeLevel(normalizeText(e.nivel_estudiante ?? e.nivel ?? e?.datos_estudiante?.nivel ?? null)),
        gradoNumber: extractGradeNumber(e.grado_estudiante ?? e.grado ?? e?.datos_estudiante?.grado ?? null),
      })));
    }

    return filtrados;
  }, [
    formData.asignacionId,
    estudiantes,
    cursosAsignables,
    resolveCursoId,
    canonicalizeLevel,
    normalizeText,
    extractGradeNumber,
    cursosConEstudiantes,
    resolveEstudianteId,
    loadingEstudiantesAsignacion,
  ]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'estudianteId') {
      setFormData((prev) => ({ ...prev, estudianteId: value }));
      return;
    }
  };

  // Manejar la creación de una nueva asignación
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const alumno = estudiantes.find((est) => {
      const resolvedId = resolveEstudianteId(est);
      return resolvedId !== null && String(resolvedId) === String(formData.estudianteId);
    });
    const curso = cursosAsignables.find((cp) => {
      const resolvedId = resolveCursoId(cp);
      return resolvedId !== null && String(resolvedId) === String(formData.asignacionId);
    });

    if (!alumno) {
      showError('Selecciona un estudiante válido antes de continuar');
      setLoading(false);
      return;
    }

    if (requiereDatosAcademicos) {
      showError('Completa el nivel y grado del estudiante antes de asignarlo a un curso');
      setLoading(false);
      return;
    }

    if (!curso) {
      showError('Selecciona un curso compatible con el estudiante');
      setLoading(false);
      return;
    }

    if (isCursoPasado(curso)) {
      showError('No puedes asignar estudiantes a clases que ya finalizaron');
      setLoading(false);
      return;
    }
    try {
      await axios.post(
          `${apiBaseUrl}/asignaciones/${curso.id}/estudiantes`,
          { estudianteId: resolveEstudianteId(alumno) },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      showSuccess('Estudiante vinculado correctamente a la asignación');
      setFormData({ estudianteId: '', asignacionId: '' });
      setShowForm(false);
      await actualizarEstudiantesAsignacion(curso);
      await fetchCursosProfesores();
    } catch (error) {
      const mensaje = error.response?.data?.error || error.response?.data?.message || 'Error al asignar estudiante';
      showError(mensaje);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    setFilters((prev) => {
      const next = { ...prev, [name]: normalizedValue };
      if (name === 'nivel') {
        next.grado = '';
        next.seccion = '';
      }
      if (name === 'grado') {
        next.seccion = '';
      }
      return next;
    });
    setFormData((prev) => ({ ...prev, asignacionId: '' }));
  };

  const handleAsignacionChange = (e) => {
    const value = e.target.value;
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    const selectedCurso = cursosAsignables.find((cp) => {
      const resolvedId = resolveCursoId(cp);
      return resolvedId !== null && String(resolvedId) === String(trimmedValue);
    });
    setFormData((prev) => ({ ...prev, asignacionId: trimmedValue, estudianteId: '' }));
    setCursoSeleccionado(selectedCurso || null);
    if (selectedCurso) {
      setFilters({
        nivel: normalizeText(selectedCurso.level) || '',
        grado: selectedCurso.grade_number != null ? String(selectedCurso.grade_number).trim() : '',
        seccion: normalizeText(selectedCurso.section) || '',
      });
    }
  };

  // Mostrar detalles de un curso específico
  const verDetallesCurso = async (curso) => {
    setCursoSeleccionado(curso);
    
    // Cargar estudiantes del curso si no están cargados
    const cursoId = curso.id || curso._id;
    if (!expandedCursos.has(cursoId)) {
      setExpandedCursos(prev => new Set([...prev, cursoId]));
      
      try {
        const estudiantesCurso = await fetchEstudiantesCurso(cursoId);
        setCursosConEstudiantes(prev => {
          const index = prev.findIndex(c => (c.id || c._id) === cursoId);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = { ...updated[index], estudiantesAsignados: estudiantesCurso };
            return updated;
          }
          return [...prev, { ...curso, estudiantesAsignados: estudiantesCurso }];
        });
      } catch (error) {
        console.error('Error cargando estudiantes:', error);
      }
    }
  };

  const nivelesDisponibles = Array.from(new Set(cursosAsignables.map((c) => c.level).filter(Boolean))).sort();
  const gradosDisponibles = Array.from(
    new Set(
      cursosAsignables
        .filter((c) => !filters.nivel || c.level === filters.nivel)
        .map((c) => c.grade_number)
        .filter((grado) => {
          if (grado === null || grado === undefined) return false;
          if (typeof grado === 'string') return grado.trim().length > 0;
          return !Number.isNaN(grado);
        })
    )
  ).sort((a, b) => {
    const numA = Number(a);
    const numB = Number(b);
    const aIsNum = !Number.isNaN(numA);
    const bIsNum = !Number.isNaN(numB);
    if (aIsNum && bIsNum) return numA - numB;
    if (aIsNum) return -1;
    if (bIsNum) return 1;
    return String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
  });
  const seccionesDisponibles = Array.from(
    new Set(
      cursosAsignables
        .filter((c) => (!filters.nivel || c.level === filters.nivel) && (!filters.grado || String(c.grade_number) === String(filters.grado)))
        .map((c) => c.section)
        .filter((seccion) => {
          if (seccion === null || seccion === undefined) return false;
          if (typeof seccion === 'string') return seccion.trim().length > 0;
          return true;
        })
    )
  ).sort();

  const searchQuery = searchTerm.trim().toLowerCase();

  const filteredCursos = cursosAsignables.filter((curso) => {
    if (filters.nivel && curso.level !== filters.nivel) return false;
    if (filters.grado && String(curso.grade_number) !== String(filters.grado)) return false;
    if (filters.seccion && curso.section !== filters.seccion) return false;

    const textosBusqueda = [
      curso.nombre,
      curso.profesor,
      curso.level,
      curso.section,
      curso.grade_number != null ? `grado ${curso.grade_number}` : '',
    ];
    const matchesSearch = searchQuery.length === 0 || textosBusqueda.some((value) =>
      value && value.toString().toLowerCase().includes(searchQuery)
    );
    if (!matchesSearch) return false;

    const inscritos = Number(curso.inscritos || 0);
    const maxAlumnos = curso.max_alumnos != null ? Number(curso.max_alumnos) : null;
    const tieneCupoDefinido = maxAlumnos !== null && maxAlumnos > 0;
    const porcentaje = tieneCupoDefinido ? (inscritos / maxAlumnos) * 100 : 0;

    if (filterStatus === 'disponible') {
      return !tieneCupoDefinido || porcentaje < 100;
    }
    if (filterStatus === 'lleno') {
      return tieneCupoDefinido && porcentaje >= 100;
    }
    if (filterStatus === 'casi-lleno') {
      return tieneCupoDefinido && porcentaje >= 80 && porcentaje < 100;
    }

    return true;
  });

  const totalCursos = cursosAsignables.length;
  const cursosDisponibles = cursosAsignables.filter((curso) => {
    const inscritos = Number(curso.inscritos || 0);
    const maxAlumnos = curso.max_alumnos != null ? Number(curso.max_alumnos) : null;
    if (maxAlumnos === null || maxAlumnos <= 0) return true;
    return inscritos < maxAlumnos;
  }).length;
  const cursosCompletos = cursosAsignables.filter((curso) => {
    const inscritos = Number(curso.inscritos || 0);
    const maxAlumnos = curso.max_alumnos != null ? Number(curso.max_alumnos) : null;
    if (maxAlumnos === null || maxAlumnos <= 0) return false;
    return inscritos >= maxAlumnos;
  }).length;
  const cursosHistoricosTotal = cursosHistoricos.length;
  const cursoSeleccionadoDetalle = cursoSeleccionado
    ? {
        inscritos: Number(cursoSeleccionado.inscritos || 0),
        max: cursoSeleccionado.max_alumnos != null ? Number(cursoSeleccionado.max_alumnos) : null,
      }
    : null;
  const cursoSeleccionadoTieneCupo = cursoSeleccionadoDetalle ? cursoSeleccionadoDetalle.max !== null && cursoSeleccionadoDetalle.max > 0 : false;
  const cursoSeleccionadoPorcentaje = cursoSeleccionadoDetalle && cursoSeleccionadoTieneCupo
    ? Math.min((cursoSeleccionadoDetalle.inscritos / cursoSeleccionadoDetalle.max) * 100, 100)
    : 0;

  return (
    <>
  <style>{`
        .modern-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        
        .neo-card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 20px 20px 60px #d9d9d9, -20px -20px 60px #ffffff;
          border: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .neo-card:hover {
          transform: translateY(-10px);
          box-shadow: 30px 30px 80px #d9d9d9, -30px -30px 80px #ffffff;
        }
        
        .floating-header {
          position: sticky;
          top: 20px;
          z-index: 1000;
          backdrop-filter: blur(20px);
          background: rgba(255, 255, 255, 0.9);
          border-radius: 25px;
          padding: 20px 30px;
          margin-bottom: 30px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        .search-container {
          position: relative;
          overflow: hidden;
        }
        
        .search-input {
          border: none;
          background: rgba(103, 126, 234, 0.1);
          border-radius: 25px;
          padding: 15px 50px 15px 20px;
          transition: all 0.3s ease;
          width: 100%;
        }
        
        .search-input:focus {
          background: rgba(103, 126, 234, 0.2);
          box-shadow: 0 0 0 3px rgba(103, 126, 234, 0.2);
          outline: none;
        }
        
        .search-icon {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: #667eea;
        }
        
        .filter-btn {
          border: 2px solid #667eea;
          background: transparent;
          color: #667eea;
          border-radius: 25px;
          padding: 10px 20px;
          margin: 0 5px;
          transition: all 0.3s ease;
          font-weight: 500;
        }
        
        .filter-btn.active, .filter-btn:hover {
          background: #667eea;
          color: white;
          transform: translateY(-2px);
        }
        
        .course-card {
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 20px;
          padding: 25px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(103, 126, 234, 0.1);
          position: relative;
          overflow: hidden;
        }
        
        .course-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        .course-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 60px rgba(102, 126, 234, 0.2);
        }
        
        .capacity-ring {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
        }
        
        .progress-ring {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, #667eea 0%, #764ba2 var(--progress, 0%), #e9ecef var(--progress, 0%));
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        
        .progress-ring::before {
          content: '';
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: white;
          position: absolute;
        }
        
        .progress-text {
          position: relative;
          z-index: 1;
          font-size: 12px;
          font-weight: bold;
          color: #667eea;
        }
        
        .modern-form {
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 25px;
          padding: 30px;
          box-shadow: 0 15px 50px rgba(0,0,0,0.1);
        }
        
        .floating-label {
          position: relative;
          margin-bottom: 25px;
        }
        
        .floating-input {
          width: 100%;
          padding: 15px 20px;
          border: 2px solid #e9ecef;
          border-radius: 15px;
          background: white;
          transition: all 0.3s ease;
          font-size: 16px;
        }
        
        .floating-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(103, 126, 234, 0.1);
          outline: none;
        }
        
        .floating-input:focus + .label-text,
        .floating-input:not(:placeholder-shown) + .label-text {
          transform: translateY(-28px) scale(0.8);
          color: #667eea;
        }
        
        .label-text {
          position: absolute;
          left: 20px;
          top: 15px;
          background: white;
          padding: 0 10px;
          color: #6c757d;
          transition: all 0.3s ease;
          pointer-events: none;
        }
        
        .modern-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 15px;
          padding: 15px 30px;
          color: white;
          font-weight: 600;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .modern-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        
        .modern-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        
        .modern-btn:hover::before {
          left: 100%;
        }
        
        .stats-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 25px;
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .stats-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        }
        
        .modal-modern {
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(10px);
        }
        
        .modal-content-modern {
          background: white;
          border-radius: 25px;
          border: none;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0,0,0,0.3);
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-slide-up {
          animation: slideInUp 0.6s ease-out forwards;
        }
        
        .animate-fade-scale {
          animation: fadeInScale 0.5s ease-out forwards;
        }
        
        /* Estilos para lista de estudiantes */
        .students-list-container {
          max-height: 350px;
          overflow-y: auto;
          padding-right: 8px;
        }
        
        .students-list-container::-webkit-scrollbar {
          width: 6px;
        }
        
        .students-list-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .students-list-container::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 10px;
        }
        
        .students-list-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #764ba2, #667eea);
        }
        
        .student-item {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 12px;
          margin-bottom: 10px;
          transition: all 0.3s ease;
          border: 1px solid transparent;
        }
        
        .student-item:hover {
          background: #e9ecef;
          border-color: rgba(102, 126, 234, 0.3);
          transform: translateX(5px);
        }
        
        .student-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .student-info {
          flex: 1;
          min-width: 0;
        }
        
        .student-name {
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .student-email {
          font-size: 0.85rem;
          color: #718096;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .student-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .empty-students {
          text-align: center;
          padding: 3rem 1rem;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
          border-radius: 16px;
          border: 2px dashed rgba(102, 126, 234, 0.2);
        }
        
        .empty-students-icon {
          font-size: 3rem;
          opacity: 0.3;
          margin-bottom: 1rem;
          color: #667eea;
        }
      `}</style>

      <div className="min-vh-100" style={{background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'}}>
        {/* Header flotante moderno */}
        <div className="container-fluid px-4 pt-4">
          <div className="floating-header animate-fade-scale">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <div className="d-flex align-items-center mb-3 mb-md-0">
                <div className="me-3">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-3 d-inline-flex">
                    <FaGraduationCap className="text-primary" size={24} />
                  </div>
                </div>
                <div>
                  <h1 className="h3 fw-bold mb-1" style={{color: '#2d3748'}}>Asignación de Estudiantes</h1>
                  <p className="text-muted mb-0">Gestiona las asignaciones de manera inteligente</p>
                </div>
              </div>
              
              <div className="d-flex gap-3">
                <button 
                  className={`modern-btn ${showForm ? 'btn-outline-secondary' : ''}`}
                  onClick={() => setShowForm(!showForm)}
                  style={showForm ? {background: '#6c757d', transform: 'none'} : {}}
                >
                  {showForm ? <><FaTimes className="me-2" /> Cancelar</> : <><FaUserPlus className="me-2" /> Nueva Asignación</>}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container-fluid px-4">
          <div className="row g-4">
            {/* Panel principal */}
            <div className="col-lg-8">
              {/* Formulario moderno */}
              {showForm && (
                <div className="animate-slide-up mb-4">
                  <div className="modern-form">
                    <div className="d-flex align-items-center mb-4">
                      <FaBookOpen className="text-primary me-3" size={20} />
                      <h5 className="mb-0 fw-bold">Nueva Asignación</h5>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                      <div className="row g-4">
                        {/* Primero seleccionar el curso */}
                        <div className="col-md-6">
                          <div className="floating-label">
                            <select
                              id="asignacionId"
                              name="asignacionId"
                              className="floating-input"
                              value={formData.asignacionId}
                              onChange={handleAsignacionChange}
                              required
                              placeholder=" "
                            >
                              <option value="">Seleccionar curso...</option>
                              {(Array.isArray(filteredCursos) ? filteredCursos : []).map((cp) => {
                                const resolvedId = resolveCursoId(cp);
                                if (resolvedId === null || resolvedId === undefined) {
                                  return null;
                                }
                                const inscritos = Number(cp.inscritos || 0);
                                const maxAlumnos = cp.max_alumnos != null ? Number(cp.max_alumnos) : null;
                                const estaLleno = maxAlumnos !== null && inscritos >= maxAlumnos;
                                const cupoLabel = maxAlumnos !== null
                                  ? `${inscritos}/${maxAlumnos}`
                                  : `${inscritos} inscritos`;
                                return (
                                  <option 
                                    key={resolvedId} 
                                    value={resolvedId}
                                    disabled={estaLleno}
                                  >
                                    {cp.nombre} • {buildUbicacionResumen(cp)} — {cp.profesor} ({cupoLabel})
                                  </option>
                                );
                              })}
                            </select>
                            <label className="label-text">
                              <FaBook className="me-2" />
                              Curso / Clase
                            </label>
                          </div>
                        </div>

                        {/* Luego seleccionar el estudiante filtrado por el curso */}
                        <div className="col-md-6">
                          <div className="floating-label">
                            <select
                              id="estudianteId"
                              name="estudianteId"
                              className="floating-input"
                              value={formData.estudianteId}
                              onChange={handleChange}
                              required
                              disabled={!formData.asignacionId || loadingEstudiantesAsignacion}
                              placeholder=" "
                            >
                              <option value="">
                                {!formData.asignacionId 
                                  ? 'Primero selecciona un curso...'
                                  : loadingEstudiantesAsignacion
                                    ? 'Cargando estudiantes...'
                                    : estudiantesFiltrados.length === 0
                                      ? 'No hay estudiantes para este nivel/grado'
                                      : 'Seleccionar estudiante...'}
                              </option>
                              {estudiantesFiltrados.map((estudiante) => {
                                const resolvedId = resolveEstudianteId(estudiante);
                                if (resolvedId === null || resolvedId === undefined) {
                                  return null;
                                }
                                return (
                                  <option key={resolvedId} value={resolvedId}>
                                    {estudiante.nombre}
                                  </option>
                                );
                              })}
                            </select>
                            <label className="label-text">
                              <FaUserGraduate className="me-2" />
                              Estudiante
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Alertas informativas */}
                      {formData.asignacionId && estudiantesFiltrados.length === 0 && (
                        <div className="alert alert-warning rounded-4 py-3 px-4 mt-3 d-flex align-items-center gap-3">
                          <FaExclamationTriangle className="text-warning" />
                          <div>
                            No hay estudiantes registrados con el nivel y grado de este curso. Verifica los datos académicos de los estudiantes.
                          </div>
                        </div>
                      )}

                      {estudianteSeleccionado && (
                        <div className="col-12 mt-3">
                          {requiereDatosAcademicos ? (
                            <div className="alert alert-warning rounded-4 py-3 px-4 mb-0 d-flex align-items-center gap-3">
                              <FaExclamationTriangle className="text-warning" />
                              <div>
                                <strong>{estudianteSeleccionado.nombre}</strong> no tiene registrado su nivel y grado académico. Completa sus datos desde "Usuarios" → "Datos del estudiante" antes de asignarlo.
                              </div>
                            </div>
                          ) : sinCursosCompatibles ? (
                            <div className="alert alert-danger rounded-4 py-3 px-4 mb-0 d-flex align-items-center gap-3">
                              <FaTimes className="text-danger" />
                              <div>
                                No hay cursos activos para {estudianteNivel || 'Nivel no definido'} • Grado {estudianteGradoNumero ?? 'N/A'}. Revisa que exista una clase para ese nivel/grado o crea una nueva asignación.
                              </div>
                            </div>
                          ) : (
                            <div className="alert alert-success rounded-4 py-3 px-4 mb-0 d-flex align-items-center gap-3">
                              <FaCheckCircle className="text-success" />
                              <div>
                                Perfil académico: <strong>{estudianteNivel || 'Nivel no definido'}</strong> • <strong>Grado {estudianteGradoNumero ?? 'N/A'}</strong>. Cursos compatibles disponibles: <strong>{cursosCompatiblesCount}</strong>.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {aulaBloqueada && asignacionSeleccionada && (
                        <div className="col-12 mt-3">
                          <div className="alert alert-info rounded-4 py-3 px-4 mb-0">
                            <strong>Aula definida:</strong> {buildUbicacionResumen(asignacionSeleccionada)}. Para cambiar estos datos selecciona otra asignación.
                          </div>
                        </div>
                      )}

                      <div className="row g-4 mt-3">
                        <div className="col-md-4">
                          <div className="floating-label">
                            <select
                              id="nivel"
                              name="nivel"
                              className="floating-input"
                              value={filters.nivel}
                              onChange={handleFilterChange}
                              disabled={aulaBloqueada}
                              placeholder=" "
                            >
                              <option value="">Todos los niveles...</option>
                              {nivelesDisponibles.map((nivel) => (
                                <option key={nivel} value={nivel}>{nivel}</option>
                              ))}
                            </select>
                            <label className="label-text">
                              <FaSchool className="me-2" />
                              Nivel
                            </label>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="floating-label">
                            <select
                              id="grado"
                              name="grado"
                              className="floating-input"
                              value={filters.grado}
                              onChange={handleFilterChange}
                              disabled={aulaBloqueada}
                              placeholder=" "
                            >
                              <option value="">Todos los grados...</option>
                              {gradosDisponibles.map((grado) => (
                                <option key={grado} value={grado}>{`Grado ${grado}`}</option>
                              ))}
                            </select>
                            <label className="label-text">
                              <FaGraduationCap className="me-2" />
                              Grado
                            </label>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div className="floating-label">
                            <select
                              id="seccion"
                              name="seccion"
                              className="floating-input"
                              value={filters.seccion}
                              onChange={handleFilterChange}
                              disabled={aulaBloqueada}
                              placeholder=" "
                            >
                              <option value="">Todas las secciones...</option>
                              {seccionesDisponibles.map((seccion) => (
                                <option key={seccion} value={seccion}>{`Sección ${seccion}`}</option>
                              ))}
                            </select>
                            <label className="label-text">
                              <FaUsers className="me-2" />
                              Sección
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="d-flex justify-content-end gap-3 mt-4">
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary rounded-pill px-4"
                          onClick={() => setShowForm(false)}
                        >
                          Cancelar
                        </button>
                        <button 
                          type="submit" 
                          className="modern-btn"
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                          ) : (
                            <FaSave className="me-2" />
                          )}
                          {loading ? 'Guardando...' : 'Guardar Asignación'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Controles de búsqueda y filtros */}
              <div className="neo-card p-4 mb-4 animate-slide-up">
                <div className="row g-3 align-items-center">
                  <div className="col-md-6">
                    <div className="search-container">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar cursos o profesores..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <FaSearch className="search-icon" />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="d-flex flex-wrap justify-content-end">
                      <button 
                        className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                      >
                        Todos
                      </button>
                      <button 
                        className={`filter-btn ${filterStatus === 'disponible' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('disponible')}
                      >
                        Disponibles
                      </button>
                      <button 
                        className={`filter-btn ${filterStatus === 'casi-lleno' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('casi-lleno')}
                      >
                        Casi llenos
                      </button>
                      <button 
                        className={`filter-btn ${filterStatus === 'lleno' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('lleno')}
                      >
                        Llenos
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid de cursos */}
              <div className="row g-4">
                {filteredCursos.length === 0 && (
                  <div className="col-12">
                    <div className="neo-card text-center py-5">
                      {requiereDatosAcademicos ? (
                        <>
                          <FaExclamationTriangle className="text-warning mb-3" size={32} />
                          <p className="mb-0">Completa el nivel y grado del estudiante para ver cursos compatibles.</p>
                        </>
                      ) : estudianteSeleccionado ? (
                        <>
                          <FaTimes className="text-danger mb-3" size={32} />
                          <p className="mb-0">No hay cursos compatibles con el perfil seleccionado. Crea una nueva clase o ajusta los filtros.</p>
                        </>
                      ) : (
                        <>
                          <FaSearch className="text-muted mb-3" size={32} />
                          <p className="mb-0">No se encontraron cursos con los filtros aplicados.</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {filteredCursos.map((curso, index) => {
                  const inscritos = Number(curso.inscritos || 0);
                  const maxAlumnos = curso.max_alumnos != null ? Number(curso.max_alumnos) : null;
                  const tieneCupoDefinido = maxAlumnos !== null && maxAlumnos > 0;
                  const porcentajeOcupacion = tieneCupoDefinido ? Math.min((inscritos / maxAlumnos) * 100, 100) : 0;
                  const disponibilidadLabel = !tieneCupoDefinido
                    ? 'Cupo abierto'
                    : inscritos >= maxAlumnos
                      ? 'Lleno'
                      : inscritos >= 0.8 * maxAlumnos
                        ? 'Casi lleno'
                        : 'Disponible';
                  
                  return (
                    <div key={curso.id} className="col-lg-6 animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
                      <div 
                        className="course-card h-100 cursor-pointer"
                        onClick={() => verDetallesCurso(curso)}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div className="flex-grow-1">
                            <h6 className="fw-bold mb-2" style={{color: '#2d3748'}}>{curso.nombre}</h6>
                            <p className="text-muted mb-1">
                              <FaChalkboardTeacher className="me-2" />
                              {curso.profesor}
                            </p>
                            <p className="text-muted small mb-1">
                              <FaSchool className="me-2" />
                              {buildUbicacionResumen(curso)}
                            </p>
                            <p className="text-muted small mb-0">
                              <FaClock className="me-2" />
                              {curso.dia_semana} • {curso.hora_inicio} - {curso.hora_fin}
                            </p>
                          </div>
                          
                          <div className="progress-ring" style={{'--progress': `${porcentajeOcupacion}%`}}>
                            <span className="progress-text">
                              {tieneCupoDefinido ? `${Math.round(porcentajeOcupacion)}%` : 'Sin limite'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <span className="fw-bold" style={{color: '#667eea'}}>
                              {inscritos}
                              {maxAlumnos != null ? `/${maxAlumnos}` : ''}
                            </span>
                            <span className="text-muted ms-2">estudiantes</span>
                          </div>
                          
                          <span className={`badge rounded-pill px-3 py-2 ${
                            !tieneCupoDefinido
                              ? 'bg-primary'
                              : porcentajeOcupacion >= 100
                                ? 'bg-danger'
                                : porcentajeOcupacion >= 80
                                  ? 'bg-warning text-dark'
                                  : 'bg-success'
                          }`}>
                            {disponibilidadLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCursos.length === 0 && (
                <div className="text-center py-5">
                  <div className="mb-4">
                    <FaSearch className="text-muted" style={{fontSize: '4rem', opacity: 0.3}} />
                  </div>
                  <h5 className="text-muted">No se encontraron cursos</h5>
                  <p className="text-muted">Intenta ajustar tus filtros de búsqueda</p>
                  {cursosHistoricosTotal > 0 && (
                    <p className="text-muted small mb-0">
                      {cursosHistoricosTotal} clases finalizaron y ahora viven en el panel "Clases Pasadas".
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Panel lateral con estadísticas */}
            <div className="col-lg-4">
              <div className="sticky-top" style={{top: '140px'}}>
                {/* Estadísticas generales */}
                <div className="stats-card mb-4 animate-fade-scale">
                  <h5 className="fw-bold mb-3">
                    <FaUsers className="me-2" />
                    Resumen General
                  </h5>
                  <div className="row g-3 text-center">
                    <div className="col-6">
                      <div className="h3 fw-bold mb-1">{totalCursos}</div>
                      <div className="small opacity-75">Cursos Activos</div>
                    </div>
                    <div className="col-6">
                      <div className="h3 fw-bold mb-1">{estudiantes.length}</div>
                      <div className="small opacity-75">Estudiantes</div>
                    </div>
                    <div className="col-6">
                      <div className="h3 fw-bold mb-1">{cursosDisponibles}</div>
                      <div className="small opacity-75">Disponibles</div>
                    </div>
                    <div className="col-6">
                      <div className="h3 fw-bold mb-1">{cursosCompletos}</div>
                      <div className="small opacity-75">Completos</div>
                    </div>
                    <div className="col-6">
                      <div className="h3 fw-bold mb-1">{cursosHistoricosTotal}</div>
                      <div className="small opacity-75">Clases Pasadas</div>
                    </div>
                  </div>
                </div>

                {/* Lista compacta de cursos */}
                <div className="neo-card p-4 animate-slide-up">
                  <h6 className="fw-bold mb-3" style={{color: '#2d3748'}}>
                    <FaStar className="me-2 text-warning" />
                    Cursos Destacados
                  </h6>
                  
                  <div className="space-y-3">
                    {(Array.isArray(cursosAsignables) ? cursosAsignables : []).slice(0, 5).map((curso, index) => {
                      const inscritos = Number(curso.inscritos || 0);
                      const maxAlumnos = curso.max_alumnos != null ? Number(curso.max_alumnos) : null;
                      const tieneCupoDefinido = maxAlumnos !== null && maxAlumnos > 0;
                      const porcentaje = tieneCupoDefinido ? Math.min((inscritos / maxAlumnos) * 100, 100) : 0;
                      
                      return (
                        <div 
                          key={curso.id} 
                          className="d-flex align-items-center p-3 rounded-3 cursor-pointer"
                          style={{background: '#f8f9fa', transition: 'all 0.3s ease'}}
                          onClick={() => verDetallesCurso(curso)}
                          onMouseEnter={(e) => e.target.style.background = '#e9ecef'}
                          onMouseLeave={(e) => e.target.style.background = '#f8f9fa'}
                        >
                          <div className="me-3">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: '40px', 
                                height: '40px', 
                                background: `linear-gradient(135deg, ${!tieneCupoDefinido ? '#4c51bf' : porcentaje >= 100 ? '#dc3545' : porcentaje >= 80 ? '#ffc107' : '#28a745'} 0%, ${!tieneCupoDefinido ? '#5a67d8' : porcentaje >= 100 ? '#c82333' : porcentaje >= 80 ? '#e0a800' : '#218838'} 100%)`,
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}
                            >
                              {tieneCupoDefinido ? `${Math.round(porcentaje)}%` : 'Sin limite'}
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="fw-medium small mb-1">{curso.nombre}</div>
                            <div className="text-muted" style={{fontSize: '0.8rem'}}>
                              {inscritos}{tieneCupoDefinido ? `/${maxAlumnos}` : ''} estudiantes
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal moderno */}
        {cursoSeleccionado && (
          <div className="modal fade show d-block modal-modern" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content modal-content-modern animate-fade-scale">
                <div className="modal-header border-0 pb-2" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                  <div className="text-white">
                    <h5 className="modal-title fw-bold mb-1">
                      <FaBookOpen className="me-2" />
                      {cursoSeleccionado.nombre}
                    </h5>
                    <p className="mb-0 opacity-75">{cursoSeleccionado.profesor}</p>
                  </div>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setCursoSeleccionado(null)}
                  ></button>
                </div>
                
                <div className="modal-body p-4">
                  <div className="row g-4">
                    <div className="col-md-8">
                      <div className="space-y-4">
                        <div className="d-flex align-items-center p-3 rounded-3" style={{background: '#f8f9fa'}}>
                          <div className="bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                            <FaCalendarAlt className="text-primary" />
                          </div>
                          <div>
                            <h6 className="mb-1 fw-bold">Horario</h6>
                            <p className="mb-0 text-muted">{cursoSeleccionado.dia_semana}</p>
                            <p className="mb-0 small">{cursoSeleccionado.hora_inicio} - {cursoSeleccionado.hora_fin}</p>
                          </div>
                        </div>
                        
                        <div className="d-flex align-items-center p-3 rounded-3" style={{background: '#f8f9fa'}}>
                          <div className="bg-success bg-opacity-10 rounded-circle p-3 me-3">
                            <FaUsers className="text-success" />
                          </div>
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-bold">Capacidad</h6>
                            <p className="mb-0">
                              <span className="fw-bold text-primary">
                                {cursoSeleccionadoDetalle?.inscritos ?? 0}
                              </span>
                              {cursoSeleccionadoTieneCupo ? (
                                <span className="text-muted"> de {cursoSeleccionadoDetalle?.max} estudiantes</span>
                              ) : (
                                <span className="text-muted"> inscritos actualmente</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        {/* Lista de Estudiantes Asignados */}
                        <div className="mt-4">
                          <h6 className="fw-bold mb-3 d-flex align-items-center">
                            <FaUserGraduate className="me-2 text-primary" />
                            Estudiantes Asignados
                            <span className="badge bg-primary ms-2">
                              {(() => {
                                const cursoConEstudiantes = cursosConEstudiantes.find(c => c.id === cursoSeleccionado.id);
                                return cursoConEstudiantes?.estudiantesAsignados?.length || 0;
                              })()}
                            </span>
                          </h6>
                          {(() => {
                            const cursoConEstudiantes = cursosConEstudiantes.find(c => c.id === cursoSeleccionado.id);
                            const estudiantesAsignados = cursoConEstudiantes?.estudiantesAsignados || [];
                            
                            if (estudiantesAsignados.length === 0) {
                              return (
                                <div className="empty-students">
                                  <FaUsers className="empty-students-icon" />
                                  <p className="text-muted fw-medium mb-0">No hay estudiantes asignados aún</p>
                                  <p className="text-muted small mt-1">Usa el formulario para asignar estudiantes a este curso</p>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="students-list-container">
                                {estudiantesAsignados.map((estudiante, idx) => (
                                  <div key={idx} className="student-item">
                                    <div className="d-flex align-items-center gap-3">
                                      <div className="student-avatar">
                                        {(estudiante.nombre || estudiante.nombres || 'E')[0].toUpperCase()}
                                      </div>
                                      <div className="student-info">
                                        <div className="student-name">
                                          {estudiante.nombre || estudiante.nombres || 'Sin nombre'} {estudiante.apellido || estudiante.apellidos || ''}
                                        </div>
                                        {estudiante.email && (
                                          <div className="student-email">{estudiante.email}</div>
                                        )}
                                      </div>
                                      <div>
                                        <span className="student-badge" style={{background: '#d4edda', color: '#155724'}}>
                                          <FaCheckCircle />
                                          Activo
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-4 text-center">
                      <div 
                        className="progress-ring mx-auto mb-3" 
                        style={{
                          width: '100px', 
                          height: '100px',
                          '--progress': `${cursoSeleccionadoPorcentaje}%`
                        }}
                      >
                        <div className="progress-text" style={{fontSize: '16px'}}>
                          {cursoSeleccionadoTieneCupo ? `${Math.round(cursoSeleccionadoPorcentaje)}%` : 'Sin limite'}
                        </div>
                      </div>
                      <p className="text-muted small">Ocupación actual</p>
                    </div>
                  </div>
                </div>
                
                <div className="modal-footer border-0 pt-0">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary rounded-pill px-4" 
                    onClick={() => setCursoSeleccionado(null)}
                  >
                    Cerrar
                  </button>
                  {(!cursoSeleccionadoTieneCupo || (cursoSeleccionadoDetalle?.inscritos ?? 0) < (cursoSeleccionadoDetalle?.max ?? 0)) && (
                    <button 
                      type="button" 
                      className="modern-btn" 
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          asignacionId: cursoSeleccionado.id.toString()
                        }));
                        setShowForm(true);
                        setCursoSeleccionado(null);
                      }}
                    >
                      <FaUserPlus className="me-2" />
                      Asignar Estudiante
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AsignacionEstudiantes;
