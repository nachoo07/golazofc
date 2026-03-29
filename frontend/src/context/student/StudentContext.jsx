import { useEffect, useState, useContext, useCallback, useRef, createContext } from 'react';
import client from '../../api/axios';
import { LoginContext } from '../login/LoginContext';
import { showConfirmAlert } from '../../utils/alerts/Alerts';

export const StudentsContext = createContext();
const CACHE_TTL_MS = 5 * 60 * 1000;

const isRequestCanceled = (error) =>
  error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError';

const StudentsProvider = ({ children }) => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const { auth, authReady } = useContext(LoginContext);
  const cache = useRef(new Map());
  const requestControllers = useRef(new Set());
  const isMountedRef = useRef(false);

  const loading = pendingRequests > 0;

  useEffect(() => {
    isMountedRef.current = true;
    const controllers = requestControllers.current;
    return () => {
      isMountedRef.current = false;
      controllers.forEach(controller => controller.abort());
      controllers.clear();
    };
  }, []);

  const startRequest = useCallback(() => {
    if (!isMountedRef.current) return;
    setPendingRequests(prev => prev + 1);
  }, []);

  const endRequest = useCallback(() => {
    if (!isMountedRef.current) return;
    setPendingRequests(prev => Math.max(0, prev - 1));
  }, []);

  const setEstudiantesSafe = useCallback((valueOrUpdater) => {
    if (!isMountedRef.current) return;
    setEstudiantes(valueOrUpdater);
  }, []);

  const setSelectedStudentSafe = useCallback((valueOrUpdater) => {
    if (!isMountedRef.current) return;
    setSelectedStudent(valueOrUpdater);
  }, []);

  const abortAllRequests = useCallback(() => {
    requestControllers.current.forEach(controller => controller.abort());
    requestControllers.current.clear();
  }, []);

  const withRequest = useCallback(async (requestFn) => {
    const controller = new AbortController();
    requestControllers.current.add(controller);
    startRequest();
    try {
      return await requestFn(controller.signal);
    } finally {
      requestControllers.current.delete(controller);
      endRequest();
    }
  }, [startRequest, endRequest]);

  const capitalizeWords = useCallback((str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const normalizeBirthDate = useCallback((value) => {
    if (!value) return '';
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      if (value.includes('T')) return value.split('T')[0];
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }, []);

  const formatStudent = useCallback((student) => {
    if (!student || typeof student !== 'object') return student;
    return {
      ...student,
      name: capitalizeWords(student.name),
      lastName: capitalizeWords(student.lastName),
      guardianName: capitalizeWords(student.guardianName),
      birthDate: normalizeBirthDate(student.birthDate),
    };
  }, [capitalizeWords, normalizeBirthDate]);

  const validateProfileImage = useCallback((imageFile) => {
    if (!(imageFile instanceof File)) return;
    const validImageTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'image/gif'];
    if (!validImageTypes.includes(imageFile.type)) {
      throw new Error('La imagen de perfil debe ser un archivo JPEG, PNG, HEIC, WEBP o GIF.');
    }
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error('La imagen de perfil no debe exceder los 5MB.');
    }
  }, []);

  const getCachedValue = useCallback((key) => {
    const entry = cache.current.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.current.delete(key);
      return null;
    }
    return entry.value;
  }, []);

  const setCachedValue = useCallback((key, value) => {
    cache.current.set(key, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }, []);

  const invalidateStudentsCache = useCallback(() => {
    cache.current.delete('estudiantes');
  }, []);

  const obtenerEstudiantes = useCallback(async () => {
    if (!authReady) {
      return;
    }
    if (!auth || (auth !== 'admin' && auth !== 'user')) {
      setEstudiantes([]);
      return;
    }
    const cachedStudents = getCachedValue('estudiantes');
    if (cachedStudents) {
      setEstudiantesSafe(cachedStudents);
      return;
    }
    try {
      const response = await withRequest((signal) => client.get('/students', { signal }));
      const data = Array.isArray(response.data) ? response.data : [];
      const formattedData = data.map(formatStudent);
      setCachedValue('estudiantes', formattedData);
      setEstudiantesSafe(formattedData);
    } catch (error) {
      if (isRequestCanceled(error)) return;
      console.error('obtenerEstudiantes: Error fetching students:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setEstudiantesSafe([]);
      throw error; // Let Student.jsx handle the error
    }
  }, [auth, authReady, formatStudent, getCachedValue, setCachedValue, setEstudiantesSafe, withRequest]);

  useEffect(() => {
    if (!auth || !authReady) {
      abortAllRequests();
      cache.current.clear();
      setEstudiantesSafe([]);
      setSelectedStudentSafe(null);
    } else if (authReady && (auth === 'admin' || auth === 'user')) {
      // Cargar estudiantes automáticamente cuando la autenticación está lista
      obtenerEstudiantes().catch((error) => {
        if (isRequestCanceled(error)) return;
        console.error('useEffect obtenerEstudiantes: Error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      });
    }
  }, [auth, authReady, abortAllRequests, obtenerEstudiantes, setEstudiantesSafe, setSelectedStudentSafe]);

  const obtenerEstudiantePorId = useCallback(async (studentId) => {
    if (!authReady) {
      return;
    }
    if (!studentId || !auth || (auth !== 'admin' && auth !== 'user')) {
      return;
    }
    try {
      const cacheKey = `student:${studentId}`;
      const cachedStudent = getCachedValue(cacheKey);
      if (cachedStudent) {
        setSelectedStudentSafe(cachedStudent);
        return cachedStudent;
      }

      const response = await withRequest((signal) => client.get(`/students/${studentId}`, { signal }));
      const student = formatStudent(response.data);
      setCachedValue(cacheKey, student);
      setSelectedStudentSafe(student);
      return student;
    } catch (error) {
      if (isRequestCanceled(error)) return;
      console.error('obtenerEstudiantePorId: Error fetching student:', {
        studentId,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setSelectedStudentSafe(null);
      throw error;
    }
  }, [auth, authReady, formatStudent, getCachedValue, setCachedValue, setSelectedStudentSafe, withRequest]);

  const buildStudentPayload = useCallback((estudiante, profileImageUrl) => {
    return {
      ...estudiante,
      name: capitalizeWords(estudiante.name),
      lastName: capitalizeWords(estudiante.lastName),
      guardianName: capitalizeWords(estudiante.guardianName),
      profileImage: profileImageUrl,
      birthDate: normalizeBirthDate(estudiante.birthDate),
    };
  }, [capitalizeWords, normalizeBirthDate]);

  const buildStudentFormData = useCallback((estudianteData, profileImage) => {
    const formData = new FormData();

    Object.keys(estudianteData).forEach((key) => {
      if (key === 'profileImage' && profileImage instanceof File) {
        formData.append('profileImageFile', profileImage);
        return;
      }

      if (estudianteData[key] !== undefined && estudianteData[key] !== null) {
        formData.append(
          key,
          typeof estudianteData[key] === 'boolean'
            ? estudianteData[key].toString()
            : estudianteData[key]
        );
      }
    });

    return formData;
  }, []);

  const addEstudiante = useCallback(async (estudiante) => {
    if (!authReady || auth !== 'admin') {
      return { success: false, message: 'No tienes permisos para agregar estudiantes.' };
    }
    try {
      let profileImageUrl = estudiante.profileImage;
      if (estudiante.profileImage instanceof File) {
        validateProfileImage(estudiante.profileImage);
        profileImageUrl = null;
      } else if (!profileImageUrl) {
        profileImageUrl = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
      }

      const estudianteData = buildStudentPayload(estudiante, profileImageUrl);
      const formData = buildStudentFormData(estudianteData, estudiante.profileImage);
      const response = await withRequest((signal) =>
        client.post('/students/create', formData, {
          signal,
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );

      if (response.status === 201 && response.data?.student) {
        const formattedStudent = formatStudent(response.data.student);
        setEstudiantesSafe(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const nextStudents = [...safePrev, formattedStudent];
          setCachedValue('estudiantes', nextStudents);
          return nextStudents;
        });
        setCachedValue(`student:${formattedStudent._id}`, formattedStudent);
        return { success: true, student: formattedStudent };
      } else {
        throw new Error(response.data?.error || response.data?.message || 'Error desconocido del servidor.');
      }
    } catch (error) {
      if (isRequestCanceled(error)) {
        return { success: false, cancelled: true };
      }
      console.error('addEstudiante: Error creating student:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  }, [auth, authReady, buildStudentFormData, buildStudentPayload, formatStudent, setCachedValue, setEstudiantesSafe, validateProfileImage, withRequest]);

  const deleteEstudiante = useCallback(async (id) => {
    if (!authReady || auth !== 'admin') {
      return { deleted: false, reason: 'unauthorized' };
    }
    try {
      const confirmacion = await showConfirmAlert(
        '¿Estás seguro que deseas eliminar el estudiante?',
        'Esta acción no se puede deshacer'
      );
      if (!confirmacion) {
        return { deleted: false, cancelled: true };
      }
      await withRequest((signal) => client.delete(`/students/delete/${id}`, { signal }));

      setEstudiantesSafe(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const nextStudents = safePrev.filter(estudiante => estudiante._id !== id);
        setCachedValue('estudiantes', nextStudents);
        return nextStudents;
      });
      cache.current.delete(`student:${id}`);
      invalidateStudentsCache();
      if (selectedStudent?._id === id) {
        setSelectedStudentSafe(null);
      }
      return { deleted: true };
    } catch (error) {
      if (isRequestCanceled(error)) {
        return { deleted: false, cancelled: true };
      }
      console.error('deleteEstudiante: Error deleting student:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error; // Let Student.jsx handle the error
    }
  }, [auth, authReady, invalidateStudentsCache, selectedStudent, setCachedValue, setEstudiantesSafe, setSelectedStudentSafe, withRequest]);

  const updateEstudiante = useCallback(async (estudiante) => {
    if (!authReady || auth !== 'admin') {
      return { success: false, message: 'No tienes permisos para actualizar estudiantes.' };
    }
    try {
      let profileImageUrl = estudiante.profileImage;
      if (estudiante.profileImage instanceof File) {
        validateProfileImage(estudiante.profileImage);
        profileImageUrl = null;
      } else if (!profileImageUrl) {
        profileImageUrl = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
      }

      const estudianteData = buildStudentPayload(estudiante, profileImageUrl);
      const formData = buildStudentFormData(estudianteData, estudiante.profileImage);
      const response = await withRequest((signal) =>
        client.put(`/students/update/${estudiante._id}`, formData, {
          signal,
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );

      if (response.status === 200 && response.data?.student) {
        const formattedStudent = formatStudent(response.data.student);
        setEstudiantesSafe(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const nextStudents = safePrev.map(est => (est._id === estudiante._id ? formattedStudent : est));
          setCachedValue('estudiantes', nextStudents);
          return nextStudents;
        });
        setCachedValue(`student:${estudiante._id}`, formattedStudent);
        if (selectedStudent?._id === estudiante._id) {
          setSelectedStudentSafe(formattedStudent);
        }
        return { success: true, student: formattedStudent };
      } else {
        throw new Error('Respuesta inesperada del servidor al actualizar el estudiante.');
      }
    } catch (error) {
      if (isRequestCanceled(error)) {
        return { success: false, cancelled: true };
      }
      console.error('updateEstudiante: Error updating student:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error; // Let Student.jsx handle the error
    }
  }, [auth, authReady, buildStudentFormData, buildStudentPayload, formatStudent, selectedStudent, setCachedValue, setEstudiantesSafe, setSelectedStudentSafe, validateProfileImage, withRequest]);

  const importStudents = useCallback(async (studentList) => {
    if (!authReady || auth !== 'admin') {
      throw new Error('No tienes permisos para importar estudiantes. Inicia sesión como administrador.');
    }
    try {
      const formattedStudentList = studentList.map(student => ({
        ...student,
        name: capitalizeWords(student.name),
        lastName: capitalizeWords(student.lastName),
        guardianName: capitalizeWords(student.guardianName),
        address: capitalizeWords(student.address),
      }));

      for (const student of formattedStudentList) {
        try {
          validateProfileImage(student.profileImage);
        } catch (error) {
          throw new Error(
            `Imagen inválida para el estudiante con DNI ${student.dni || 'desconocido'}: ${error.message}`
          );
        }
      }

      const response = await withRequest((signal) => client.post('/students/import', { students: formattedStudentList }, {
        signal,
        headers: { 'Content-Type': 'application/json' },
      }));

      const { success, students: importedStudents = [], errors = [], message } = response.data;

      let swalMessage = '';
      let icon = 'error';

      if (success || importedStudents.length > 0) {
        const formattedStudents = importedStudents.map(student => ({
          ...student,
          name: capitalizeWords(student.name),
          lastName: capitalizeWords(student.lastName),
          guardianName: capitalizeWords(student.guardianName),
          birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
        }));
        setEstudiantesSafe(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const nextStudents = [...safePrev, ...formattedStudents];
          setCachedValue('estudiantes', nextStudents);
          return nextStudents;
        });
        formattedStudents.forEach((student) => {
          setCachedValue(`student:${student._id}`, student);
        });

        swalMessage = `Se importaron ${importedStudents.length} estudiantes correctamente.`;
        icon = 'success';
      } else {
        swalMessage = message || 'No se importaron estudiantes debido a errores.';
      }

      if (errors.length > 0) {
        if (swalMessage) swalMessage += '<br /><br />';
        swalMessage += '<strong>Errores encontrados:</strong><ul>';
        const errorGroups = errors.reduce((acc, error) => {
          const rowMatch = error.match(/Fila (\d+)/) || error.match(/Fila Desconocida/);
          const row = rowMatch ? rowMatch[0] : 'Desconocida';
          const dniMatch = error.match(/DNI (\d+)/);
          const dni = dniMatch ? dniMatch[1] : 'Desconocido';
          let errorType = 'Otros errores';
          let customizedMessage = error;

          if (error.includes('DNI ya existe')) {
            errorType = 'DNI duplicado';
            customizedMessage = `${row}, DNI ${dni}: El DNI ya está registrado. Usa un DNI diferente.`;
          } else if (error.includes('Error al procesar la imagen')) {
            errorType = 'Error en imagen';
            customizedMessage = `${row}, DNI ${dni}: Hubo un problema al procesar la imagen de perfil. Asegúrate de que sea una URL válida.`;
          } else if (error.includes('DNI debe contener')) {
            errorType = 'DNI inválido';
            customizedMessage = `${row}, DNI ${dni}: El DNI debe contener entre 7 y 9 dígitos.`;
          } else if (error.includes('Faltan campos obligatorios')) {
            errorType = 'Campos faltantes';
            customizedMessage = `${row}, DNI ${dni}: ${error.split(': ')[1] || 'Faltan campos obligatorios.'}`;
          } else if (error.includes('Formato de fecha de nacimiento inválido')) {
            errorType = 'Fecha inválida';
            customizedMessage = `${row}, DNI ${dni}: La fecha de nacimiento tiene un formato inválido. Usa el formato yyyy-MM-dd.`;
          } else if (error.includes('Formato de correo electrónico no válido')) {
            errorType = 'Correo inválido';
            customizedMessage = `${row}, DNI ${dni}: El correo electrónico tiene un formato inválido.`;
          } else if (error.includes('El número de teléfono del tutor')) {
            errorType = 'Teléfono inválido';
            customizedMessage = `${row}, DNI ${dni}: El número de teléfono del tutor debe tener entre 10 y 15 dígitos.`;
          } else if (error.includes('Errores de validación')) {
            errorType = 'Errores de validación';
            customizedMessage = `${row}, DNI ${dni}: ${error.split(': ')[1] || 'Errores de validación en los datos.'}`;
          }

          if (!acc[errorType]) acc[errorType] = [];
          acc[errorType].push(customizedMessage);
          return acc;
        }, {});

        for (const [errorType, errorMessages] of Object.entries(errorGroups)) {
          swalMessage += `<li><strong>${errorType}:</strong> ${errorMessages.length} casos<ul>`;
          errorMessages.slice(0, 5).forEach(msg => {
            swalMessage += `<li>${msg}</li>`;
          });
          if (errorMessages.length > 5) {
            swalMessage += `<li>(y ${errorMessages.length - 5} errores más...)</li>`;
          }
          swalMessage += '</ul></li>';
        }
        swalMessage += '</ul>';
      }
      return { success: icon === 'success', message: swalMessage, icon };
    } catch (error) {
      if (isRequestCanceled(error)) {
        return { success: false, cancelled: true };
      }
      console.error('importStudents: Error importing students:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error; // Let Student.jsx handle the error
    }
  }, [auth, authReady, capitalizeWords, setCachedValue, setEstudiantesSafe, validateProfileImage, withRequest]);

  const countStudentsByState = useCallback((state) => {
    const studentsArray = Array.isArray(estudiantes) ? estudiantes : [];
    return studentsArray.filter(student => student.state === state).length;
  }, [estudiantes]);

  return (
    <StudentsContext.Provider
      value={{
        estudiantes,
        selectedStudent,
        loading,
        obtenerEstudiantes,
        obtenerEstudiantePorId,
        addEstudiante,
        deleteEstudiante,
        updateEstudiante,
        importStudents,
        countStudentsByState,
      }}
    >
      {children}
    </StudentsContext.Provider>
  );
};

export default StudentsProvider;
