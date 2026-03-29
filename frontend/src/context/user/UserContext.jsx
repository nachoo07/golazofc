import { useEffect, useState, createContext, useContext, useCallback } from "react";
import client from "../../api/axios";
import { LoginContext } from "../login/LoginContext";
import { useNavigate } from "react-router-dom";
import { getErrorMsg } from "../../utils/helperError/ErrorMsg";
import { showSuccessToast, showErrorAlert, showConfirmAlert } from "../../utils/alerts/Alerts";

export const UsersContext = createContext();

const UsersProvider = ({ children }) => {
  const { auth, authReady, userData } = useContext(LoginContext);
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate(); // Agregar navigate

  const obtenerUsuarios = useCallback(async () => {
    if (auth !== "admin") return;
    try {
      setIsLoading(true);
      const response = await client.get("/users");
      const data = Array.isArray(response.data) ? response.data : [];
      setUsuarios(data);
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);
      if (error.response?.status === 401) {
        navigate("/login");
        return;
      }
      const msg = getErrorMsg(error, "No se pudieron cargar los usuarios");
      showErrorAlert("Error de Carga", msg);
    } finally {
      setIsLoading(false);
    }
  }, [auth, navigate]);

  const addUsuarioAdmin = async (usuario) => {
    if (auth !== "admin") return;
    try {
      const response = await client.post("/users/create", usuario);
      if (response.status === 201 && response.data.user) {
        setUsuarios((prev) => [...prev, response.data.user]);
        showSuccessToast("Usuario creado correctamente");
      }
    } catch (error) {
      const msg = getErrorMsg(error, "No se pudo crear el usuario");
      const isFormValidationError = error.response?.status === 400 && Array.isArray(error.response?.data?.errors);

      if (!isFormValidationError) {
        showErrorAlert("Error al crear", msg);
      }
      throw error;
    }
  };

  const updateUsuarioAdmin = async (id, usuarioActualizado) => {
    if (auth !== "admin") return;
    if (!id) {
      showErrorAlert("Error", "ID de usuario no válido");
      throw new Error("ID de usuario no válido");
    }
    try {
      const response = await client.put(`/users/update/${id}`, usuarioActualizado);
      if (response.status === 200 && response.data.user) {
        setUsuarios((prev) => prev.map((u) => (u._id === id ? response.data.user : u)));
        showSuccessToast("Usuario actualizado correctamente");
      }
    } catch (error) {
      const msg = getErrorMsg(error, "No se pudo actualizar el usuario");
      const isFormValidationError = error.response?.status === 400 && Array.isArray(error.response?.data?.errors);
      if (error.response?.status !== 401 && !isFormValidationError) { // 401 redirige, validación se muestra inline
        showErrorAlert("Error al actualizar", msg);
      }
      throw error;
    }
  };

  const deleteUsuarioAdmin = async (id) => {
    if (auth !== "admin") return;
    if (!id) {
      showErrorAlert("Error", "ID de usuario no válido");
      return;
    }
    try {
      const userToDelete = usuarios.find((u) => u._id === id);
      if (usuarios.length <= 1) {
        showErrorAlert("Restricción", "Debe quedar al menos un usuario cargado.");
        return;
      }
      if (userData?.id && String(userData.id) === String(id)) {
        showErrorAlert("Restricción", "No puedes eliminar el usuario con sesión activa.");
        return;
      }
      const activeAdmins = usuarios.filter((u) => u.role === "admin" && !!u.state);
      if (userToDelete?.role === "admin" && userToDelete?.state && activeAdmins.length <= 1) {
        showErrorAlert("Restricción", "Debe quedar al menos un administrador activo.");
        return;
      }

      // Usamos tu alerta de confirmación
      const isConfirmed = await showConfirmAlert("¿Eliminar usuario?", "Esta acción no se puede deshacer.");

      if (isConfirmed) {
        await client.delete(`/users/delete/${id}`);
        setUsuarios((prev) => prev.filter((u) => u._id !== id));
        showSuccessToast("Usuario eliminado correctamente");
      }
    } catch (error) {
      const msg = getErrorMsg(error, "No se pudo eliminar el usuario");
      showErrorAlert("Error", msg);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!authReady) return;
      if (auth === "admin") {
        await obtenerUsuarios();
      } else {
        setUsuarios([]);
      }
    };
    fetchData();
  }, [auth, authReady, obtenerUsuarios]);

  return (
    <UsersContext.Provider
      value={{
        usuarios,
        isLoading,
        obtenerUsuarios,
        addUsuarioAdmin,
        updateUsuarioAdmin,
        deleteUsuarioAdmin,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export default UsersProvider;
