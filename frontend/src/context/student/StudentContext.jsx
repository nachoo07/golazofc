import { useEffect, useState, useContext, useCallback, useRef, createContext } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { LoginContext } from '../login/LoginContext';

export const StudentsContext = createContext();

const StudentsProvider = ({ children }) => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const { auth, waitForAuth } = useContext(LoginContext);
  const cache = useRef(new Map());

  const capitalizeWords = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const uploadToCloudinary = async (file) => {
    try {
      const { data } = await axios.get('/api/students/cloudinary-signature', {
        withCredentials: true,
      });

      if (!data.signature || !data.timestamp || !data.cloudName || !data.apiKey) {
        throw new Error('Respuesta inválida del endpoint de firma de Cloudinary');
      }

      const { signature, timestamp, cloudName, apiKey } = data;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);
      formData.append('api_key', apiKey);
      formData.append('folder', 'students');

      const response = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, formData);
      if (!response.data.secure_url) {
        throw new Error('No se recibió una URL de imagen válida desde Cloudinary');
      }
      return response.data.secure_url;
    } catch (error) {
      console.error('Error al subir imagen a Cloudinary:', error);
      let errorMessage = 'No se pudo subir la imagen';
      if (error.response) {
        errorMessage = `Error del servidor: ${error.response.data.message || error.response.statusText}`;
      } else if (error.request) {
        errorMessage = 'No se recibió respuesta del servidor de Cloudinary';
      } else {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  };

  const obtenerEstudiantes = useCallback(async () => {
    if (auth !== 'admin' && auth !== 'user') return;
    if (cache.current.has('estudiantes')) {
      setEstudiantes(cache.current.get('estudiantes'));
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get('/api/students', {
        withCredentials: true,
      });
      const data = Array.isArray(response.data) ? response.data : [];
      const formattedData = data.map(student => ({
        ...student,
        name: capitalizeWords(student.name),
        lastName: capitalizeWords(student.lastName),
        guardianName: capitalizeWords(student.guardianName),
        birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
      }));
      cache.current.set('estudiantes', formattedData);
      setEstudiantes(formattedData);
    } catch (error) {
      console.error('Error obteniendo estudiantes:', error);
      Swal.fire({
        title: '¡Error!',
        text: 'No se pudieron obtener los estudiantes.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const obtenerEstudiantePorId = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/students/${studentId}`, {
        withCredentials: true,
      });
      const student = {
        ...response.data,
        name: capitalizeWords(response.data.name),
        lastName: capitalizeWords(response.data.lastName),
        guardianName: capitalizeWords(response.data.guardianName),
        birthDate: response.data.birthDate ? new Date(response.data.birthDate).toISOString().split('T')[0] : '',
      };
      cache.current.set(studentId, student);
      setSelectedStudent(student);
    } catch (error) {
      console.error('Error obteniendo estudiante por ID:', error);
      Swal.fire({
        title: '¡Error!',
        text: 'No se pudo obtener el estudiante.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      setSelectedStudent(null);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const addEstudiante = useCallback(async (estudiante) => {
  if (auth !== 'admin') {
    Swal.fire({
      title: '¡Error!',
      text: 'No tienes permisos para agregar estudiantes.',
      icon: 'error',
      confirmButtonText: 'Aceptar',
    });
    return { success: false, message: 'No tienes permisos para agregar estudiantes.' };
  }

  try {
    setLoading(true);
    let profileImageUrl = estudiante.profileImage;
    if (estudiante.profileImage instanceof File) {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'image/gif'];
      if (!validImageTypes.includes(estudiante.profileImage.type)) {
        throw new Error('La imagen de perfil debe ser un archivo JPEG, PNG, HEIC, WEBP o GIF.');
      }
      if (estudiante.profileImage.size > 5 * 1024 * 1024) {
        throw new Error('La imagen de perfil no debe exceder los 5MB.');
      }
      profileImageUrl = null;
    } else if (!profileImageUrl) {
      profileImageUrl = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
    }

    const estudianteData = {
      ...estudiante,
      name: capitalizeWords(estudiante.name),
      lastName: capitalizeWords(estudiante.lastName),
      guardianName: capitalizeWords(estudiante.guardianName),
      profileImage: profileImageUrl,
      birthDate: estudiante.birthDate || '',
    };

    const formData = new FormData();
    Object.keys(estudianteData).forEach(key => {
      if (key === 'profileImage' && estudiante.profileImage instanceof File) {
        formData.append('profileImageFile', estudiante.profileImage);
      } else if (estudianteData[key] !== undefined && estudianteData[key] !== null) {
        formData.append(key, typeof estudianteData[key] === 'boolean' ? estudianteData[key].toString() : estudianteData[key]);
      }
    });

    const response = await axios.post('/api/students/create', formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.status === 201) {
      if (response.data?.student) {
        const newStudent = response.data.student;
        const formattedStudent = {
          ...newStudent,
          name: capitalizeWords(newStudent.name),
          lastName: capitalizeWords(newStudent.lastName),
          guardianName: capitalizeWords(newStudent.guardianName),
          birthDate: newStudent.birthDate ? new Date(newStudent.birthDate).toISOString().split('T')[0] : '',
        };
        setEstudiantes(prev => [...(Array.isArray(prev) ? prev : []), formattedStudent]);
        cache.current.set('estudiantes', [...(cache.current.get('estudiantes') || []), formattedStudent]);
        Swal.fire({
          title: '¡Éxito!',
          text: 'Estudiante creado correctamente.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        });
        return { success: true, student: formattedStudent };
      } else {
        throw new Error('Respuesta del servidor no contiene datos del estudiante.');
      }
    } else {
      throw new Error(response.data?.error || response.data?.message || 'Error desconocido del servidor.');
    }
  } catch (error) {
    console.error('Error detallado al crear el estudiante:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    let errorMessage = 'Ha ocurrido un error al crear el estudiante.';
    const rawMessage = error.response?.data?.error || error.response?.data?.message || error.message;

    if (typeof rawMessage === 'string' && rawMessage.includes('El DNI ya está registrado')) {
      errorMessage = 'El DNI ya está registrado. Por favor, usa un DNI diferente.';
    } else if (typeof rawMessage === 'string' && rawMessage.includes('Faltan datos obligatorios')) {
      errorMessage = rawMessage;
    } else if (typeof rawMessage === 'string' && rawMessage.includes('DNI debe contener entre 7 y 9 dígitos')) {
      errorMessage = 'El DNI debe contener entre 7 y 9 dígitos.';
    } else if (typeof rawMessage === 'string' && rawMessage.includes('Formato de fecha de nacimiento inválido')) {
      errorMessage = 'La fecha de nacimiento tiene un formato inválido. Usa el formato yyyy-MM-dd.';
    } else if (typeof rawMessage === 'string' && rawMessage.includes('Formato de correo electrónico no válido')) {
      errorMessage = 'El correo electrónico tiene un formato inválido.';
    } else if (typeof rawMessage === 'string' && rawMessage.includes('El número de teléfono del tutor')) {
      errorMessage = 'El número de teléfono del tutor debe tener entre 10 y 15 dígitos.';
    } else if (typeof rawMessage === 'string' && rawMessage.includes('Error al procesar imagen')) {
      errorMessage = 'Hubo un problema al subir la imagen de perfil. Asegúrate de que sea un archivo JPEG, PNG, HEIC, WEBP o GIF y no exceda los 5MB.';
    } else if (typeof rawMessage === 'string' && rawMessage.includes('Errores de validación')) {
      errorMessage = rawMessage;
    } else {
      errorMessage = `Error interno: ${rawMessage}`;
    }

    Swal.fire({
      title: '¡Error!',
      text: errorMessage,
      icon: 'error',
      confirmButtonText: 'Aceptar',
    });
    return { success: false, message: errorMessage }; // Devolver el resultado en lugar de lanzar error
  } finally {
    setLoading(false);
  }
}, [auth]);

  const deleteEstudiante = useCallback(async (id) => {
    if (auth !== 'admin') return;
    try {
      const confirmacion = await Swal.fire({
        title: '¿Estás seguro que deseas eliminar el estudiante?',
        text: 'Esta acción no se puede deshacer',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
      });
      if (confirmacion.isConfirmed) {
        await axios.delete(`/api/students/delete/${id}`, {
          withCredentials: true,
        });
        setEstudiantes(prev => prev.filter(estudiante => estudiante._id !== id));
        cache.current.set('estudiantes', cache.current.get('estudiantes').filter(est => est._id !== id));
        cache.current.delete(id);
        if (selectedStudent?._id === id) {
          setSelectedStudent(null);
        }
        Swal.fire({
          title: '¡Eliminado!',
          text: 'El estudiante ha sido eliminado correctamente',
          icon: 'success',
        });
      }
    } catch (error) {
      console.error('Error al eliminar estudiante:', error);
      Swal.fire({
        title: '¡Error!',
        text: 'No se pudo eliminar el estudiante',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
    }
  }, [auth, selectedStudent]);

  const updateEstudiante = useCallback(async (estudiante) => {
  if (auth !== 'admin') {
    Swal.fire({
      title: '¡Error!',
      text: 'No tienes permisos para actualizar estudiantes.',
      icon: 'error',
      confirmButtonText: 'Aceptar',
    });
    return { success: false, message: 'No tienes permisos para actualizar estudiantes.' };
  }

  try {
    setLoading(true);
    let profileImageUrl = estudiante.profileImage;
    if (estudiante.profileImage instanceof File) {
      const validImageTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'image/gif'];
      if (!validImageTypes.includes(estudiante.profileImage.type)) {
        throw new Error('La imagen de perfil debe ser un archivo JPEG, PNG, HEIC, WEBP o GIF.');
      }
      if (estudiante.profileImage.size > 5 * 1024 * 1024) {
        throw new Error('La imagen de perfil no debe exceder los 5MB.');
      }
      profileImageUrl = null;
    } else if (!profileImageUrl) {
      profileImageUrl = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
    }

    const estudianteData = {
      ...estudiante,
      name: capitalizeWords(estudiante.name),
      lastName: capitalizeWords(estudiante.lastName),
      guardianName: capitalizeWords(estudiante.guardianName),
      profileImage: profileImageUrl,
      birthDate: estudiante.birthDate || '',
    };

    const formData = new FormData();
    Object.keys(estudianteData).forEach(key => {
      if (key === 'profileImage' && estudiante.profileImage instanceof File) {
        formData.append('profileImageFile', estudiante.profileImage);
      } else if (estudianteData[key] !== undefined && estudianteData[key] !== null) {
        formData.append(key, typeof estudianteData[key] === 'boolean' ? estudianteData[key].toString() : estudianteData[key]);
      }
    });

    const response = await axios.put(`/api/students/update/${estudiante._id}`, formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.status === 200 && response.data?.student) {
      const updatedStudent = response.data.student;
      const formattedStudent = {
        ...updatedStudent,
        name: capitalizeWords(updatedStudent.name),
        lastName: capitalizeWords(updatedStudent.lastName),
        guardianName: capitalizeWords(updatedStudent.guardianName),
        birthDate: updatedStudent.birthDate ? new Date(updatedStudent.birthDate).toISOString().split('T')[0] : '',
      };
      setEstudiantes(prev =>
        prev.map(est => (est._id === estudiante._id ? formattedStudent : est))
      );
      cache.current.set('estudiantes', cache.current.get('estudiantes').map(est =>
        est._id === estudiante._id ? formattedStudent : est
      ));
      cache.current.set(estudiante._id, formattedStudent);
      if (selectedStudent?._id === estudiante._id) {
        setSelectedStudent(formattedStudent);
      }
      Swal.fire({
        title: '¡Éxito!',
        text: 'Estudiante actualizado correctamente.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
      });
      return { success: true, student: formattedStudent };
    } else {
      throw new Error('Respuesta inesperada del servidor al actualizar el estudiante.');
    }
  } catch (error) {
    console.error('Error al actualizar estudiante:', error);
    let errorMessage = 'Ha ocurrido un error al actualizar el estudiante.';
    const rawMessage = error.response?.data?.error || error.message;

    if (rawMessage.includes('El DNI ya está registrado')) {
      errorMessage = 'El DNI ya está registrado en otro estudiante. Por favor, usa un DNI diferente.';
    } else if (rawMessage.includes('Faltan datos obligatorios')) {
      errorMessage = rawMessage;
    } else if (rawMessage.includes('DNI debe contener entre 7 y 9 dígitos')) {
      errorMessage = 'El DNI debe contener entre 7 y 9 dígitos.';
    } else if (rawMessage.includes('Formato de fecha de nacimiento inválido')) {
      errorMessage = 'La fecha de nacimiento tiene un formato inválido. Usa el formato yyyy-MM-dd.';
    } else if (rawMessage.includes('Formato de correo electrónico no válido')) {
      errorMessage = 'El correo electrónico tiene un formato inválido.';
    } else if (rawMessage.includes('El número de teléfono del tutor')) {
      errorMessage = 'El número de teléfono del tutor debe tener entre 10 y 15 dígitos.';
    } else if (rawMessage.includes('Error al procesar imagen')) {
      errorMessage = 'Hubo un problema al procesar la imagen de perfil. Asegúrate de que sea un archivo JPEG, PNG, HEIC, WEBP o GIF y no exceda los 5MB.';
    } else if (rawMessage.includes('Errores de validación')) {
      errorMessage = rawMessage;
    } else if (rawMessage.includes('Estudiante no encontrado')) {
      errorMessage = 'El estudiante no fue encontrado.';
    } else {
      errorMessage = `Error interno: ${rawMessage}`;
    }

    Swal.fire({
      title: '¡Error!',
      text: errorMessage,
      icon: 'error',
      confirmButtonText: 'Aceptar',
    });
    return { success: false, message: errorMessage };
  } finally {
    setLoading(false);
  }
}, [auth, selectedStudent]);

  const importStudents = useCallback(async (studentList) => {
    if (auth !== 'admin') {
      Swal.fire({
        title: '¡Error!',
        text: 'No tienes permisos para importar estudiantes.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    try {
      setLoading(true);

      const formattedStudentList = await Promise.all(studentList.map(async (student) => {
        let profileImageUrl = student.profileImage;
        if (student.profileImage instanceof File) {
          profileImageUrl = await uploadToCloudinary(student.profileImage);
        } else if (!profileImageUrl) {
          profileImageUrl = 'https://i.pinimg.com/736x/24/f2/25/24f22516ec47facdc2dc114f8c3de7db.jpg';
        }
        return {
          ...student,
          name: capitalizeWords(student.name),
          lastName: capitalizeWords(student.lastName),
          guardianName: capitalizeWords(student.guardianName),
          address: capitalizeWords(student.address),
          profileImage: profileImageUrl,
          birthDate: student.birthDate || '',
        };
      }));

      const response = await axios.post('/api/students/import', { students: formattedStudentList }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });

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
        setEstudiantes(prev => [...prev, ...formattedStudents]);
        cache.current.set('estudiantes', [...(cache.current.get('estudiantes') || []), ...formattedStudents]);
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

      Swal.fire({
        title: icon === 'success' ? '¡Éxito!' : '¡Error!',
        html: swalMessage,
        icon,
        confirmButtonText: 'Aceptar',
        width: '600px',
        customClass: {
          htmlContainer: 'swal2-html-container-scroll',
        },
      });

      await obtenerEstudiantes();
    } catch (error) {
      console.error('Error al importar estudiantes:', error);
      let errorMessage = 'Ha ocurrido un error al importar estudiantes.';
      const rawMessage = error.response?.data?.message || error.response?.data?.error || error.message;

      if (error.response?.data?.errors?.length > 0) {
        errorMessage = '';
        if (error.response.data.message) {
          errorMessage += `${error.response.data.message}<br /><br />`;
        }
        errorMessage += '<strong>Errores encontrados:</strong><ul>';
        const errorGroups = error.response.data.errors.reduce((acc, error) => {
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
          errorMessage += `<li><strong>${errorType}:</strong> ${errorMessages.length} casos<ul>`;
          errorMessages.slice(0, 5).forEach(msg => {
            errorMessage += `<li>${msg}</li>`;
          });
          if (errorMessages.length > 5) {
            errorMessage += `<li>(y ${errorMessages.length - 5} errores más...)</li>`;
          }
          errorMessage += '</ul></li>';
        }
        errorMessage += '</ul>';
      } else if (rawMessage.includes('DNI ya existe')) {
        errorMessage = 'Uno o más estudiantes tienen un DNI duplicado. Por favor, revisa los DNIs en el archivo.';
      } else if (rawMessage.includes('Error al procesar la imagen')) {
        errorMessage = 'Hubo un problema al procesar una o más imágenes. Asegúrate de que sean URLs válidas.';
      } else {
        errorMessage = `Error interno: ${rawMessage}`;
      }

      Swal.fire({
        title: '¡Error!',
        html: errorMessage,
        icon: 'error',
        confirmButtonText: 'Aceptar',
        width: '600px',
        customClass: {
          htmlContainer: 'swal2-html-container-scroll',
        },
      });
    } finally {
      setLoading(false);
    }
  }, [auth, obtenerEstudiantes]);
  const countStudentsByState = useCallback((state) => {
    const studentsArray = Array.isArray(estudiantes) ? estudiantes : [];
    return studentsArray.filter(student => student.state === state).length;
  }, [estudiantes]);

  useEffect(() => {
    const fetchData = async () => {
      await waitForAuth();
      if (auth === 'admin' || auth === 'user') {
        await obtenerEstudiantes();
      }
    };
    fetchData();
  }, [auth, obtenerEstudiantes, waitForAuth]);

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