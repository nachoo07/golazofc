import User from "../../models/users/user.model.js";
import bcrypt from "bcryptjs";
import sanitize from "mongo-sanitize";
import pino from "pino";
import { validationResult } from 'express-validator';
import { sendBadRequest, sendInternalServerError, sendNotFound } from "../_shared/controller.utils.js";
const logger = pino();

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendBadRequest(res, 'Datos inválidos', { errors: errors.array() });
  }
  return null;
};

export const getAllUsers = async (req, res, next) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const safeQuery = sanitize(req.query);
  const page = Math.max(parseInt(safeQuery.page, 10) || 1, 1);
  const limit = parseInt(safeQuery.limit, 10) || 10;
  const safeLimit = Math.min(Math.max(limit, 1), 100); // Limita entre 1 y 100

  try {
    const users = await User.find()
      .select("name mail role state lastLogin")
      .skip((page - 1) * safeLimit)
      .limit(safeLimit)
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json(users);
  } catch (error) {
    logger.error({ error: error.message }, "Error al obtener usuarios");
    return sendInternalServerError(res, "Error al obtener usuarios");
  }
};

export const createUser = async (req, res, next) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { name, mail, password, role, state } = req.body; // Evita sanitize por ahora para depuración

  // Validación de campos requeridos
  if (!name || !mail || !password || !role) {
    logger.warn({ missingFields: { name: !name, mail: !mail, password: !password, role: !role } }, "Faltan campos requeridos para crear usuario");
    return sendBadRequest(res, "Todos los campos son requeridos", {
      message: "Todos los campos son requeridos",
      missingFields: { name: !name, mail: !mail, password: !password, role: !role },
    });
  }

  try {
    const sanitizedUser = {
      name: sanitize(name),
      mail: sanitize(mail).toLowerCase().trim(),
      password: sanitize(password),
      role: sanitize(role),
      state: state !== undefined ? sanitize(state) : true, // Nuevo usuario activo por defecto
    };

    const hashedPassword = await bcrypt.hash(sanitizedUser.password, 10);
    const newUser = new User({
      name: sanitizedUser.name,
      mail: sanitizedUser.mail,
      password: hashedPassword,
      role: sanitizedUser.role,
      state: sanitizedUser.state,
    });
    await newUser.save();
    logger.info({ userId: newUser._id }, "Usuario creado");
    res.status(201).json({
      message: "Usuario creado exitosamente",
      user: {
        _id: newUser._id,
        name: newUser.name,
        mail: newUser.mail,
        role: newUser.role,
        state: newUser.state,
        lastLogin: newUser.lastLogin
      },

    });
  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, "Error al crear usuario");
    if (error.code === 11000) {
      return sendBadRequest(res, "El correo ya esta registrado");
    }
    return sendInternalServerError(res, "Error al crear usuario");
  }
};

export const updateUser = async (req, res, next) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);
  const { name, mail, role, state, password } = req.body; // Evita sanitize por ahora para depuración

  // Validación mínima: al menos un campo para actualizar
  if (!name && !mail && !role && typeof state !== "boolean") {
    logger.warn({ userId: id }, "No se proporcionaron campos para actualizar");
    return sendBadRequest(res, "Se requiere al menos un campo para actualizar (name, mail, role o state)", {
      message: "Se requiere al menos un campo para actualizar (name, mail, role o state)",
    });
  }

  if (password !== undefined) {
    return sendBadRequest(res, "La contraseña no se puede actualizar desde este endpoint");
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return sendNotFound(res, "Usuario no encontrado");
    }

    const isSelfUpdate = req.user?.userId && String(req.user.userId) === String(user._id);
    const nextRole = role ? sanitize(role) : user.role;
    const nextState = typeof state === "boolean" ? state : user.state;

    if (isSelfUpdate) {
      const roleWillChange = nextRole !== user.role;
      const stateWillChange = nextState !== user.state;

      if (roleWillChange || stateWillChange) {
        return sendBadRequest(res, "No puedes cambiar tu propio rol ni tu propio estado mientras tienes la sesión activa");
      }
    }

    const isCurrentlyActiveAdmin = user.role === "admin" && user.state === true;
    const willStopBeingActiveAdmin = isCurrentlyActiveAdmin && (nextRole !== "admin" || nextState !== true);

    if (willStopBeingActiveAdmin) {
      const activeAdmins = await User.countDocuments({
        role: "admin",
        state: true,
        _id: { $ne: user._id }
      });

      if (activeAdmins < 1) {
        return sendBadRequest(res, "Debe quedar al menos un administrador activo");
      }
    }

    if (name) user.name = sanitize(name);
    if (mail) user.mail = sanitize(mail).toLowerCase().trim();
    if (role) user.role = sanitize(role);
    if (typeof state === "boolean") user.state = state;

    await user.save();
    logger.info({ userId: id }, "Usuario actualizado");
    res.status(200).json({
      message: "Usuario actualizado exitosamente",
      user: { _id: user._id, name: user.name, mail: user.mail, role: user.role, state: user.state },
    });
  } catch (error) {
    logger.error({ error: error.message }, "Error al actualizar usuario");
    if (error.code === 11000) {
      return sendBadRequest(res, "El correo ya está registrado");
    }
    return sendInternalServerError(res, "Error al actualizar usuario");
  }
};

export const deleteUser = async (req, res, next) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { id } = sanitize(req.params);

  try {
    if (req.user?.userId && String(req.user.userId) === String(id)) {
      return sendBadRequest(res, "No puedes eliminar el usuario con sesión activa");
    }

    const userDelete = await User.findById(id).select("_id role state");
    if (!userDelete) {
      return sendNotFound(res, "Usuario no encontrado");
    }

    if (userDelete.role === "admin" && userDelete.state) {
      const activeAdmins = await User.countDocuments({ role: "admin", state: true });
      if (activeAdmins <= 1) {
        return sendBadRequest(res, "Debe quedar al menos un administrador activo");
      }
    }

    await User.findByIdAndDelete(id);
    logger.info({ userId: id }, "Usuario eliminado");
    res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    logger.error({ error: error.message }, "Error al eliminar usuario");
    return sendInternalServerError(res, "Error al eliminar usuario");
  }
};

export const updateUserState = async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return validationError;

  const { userId } = sanitize(req.params);
  const { state } = sanitize(req.body);

  if (typeof state !== "boolean") {
    return sendBadRequest(res, "El estado debe ser un booleano");
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, "Usuario no encontrado");
    }

    if (req.user?.userId && String(req.user.userId) === String(user._id)) {
      return sendBadRequest(res, "No puedes cambiar tu propio estado mientras tienes la sesión activa");
    }

    if (user.role === "admin" && user.state === true && state === false) {

      const activeAdmins = await User.countDocuments({
        role: "admin",
        state: true,
        _id: { $ne: user._id }
      });

      if (activeAdmins < 1) {
        return sendBadRequest(res, "Debe quedar al menos un administrador activo");
      }
    }

    user.state = state;
    await user.save();
    logger.info({ userId, state }, "Estado de usuario actualizado");
    res.status(200).json({
      message: `Estado del usuario actualizado a ${state ? "activo" : "inactivo"}`,
      user: { id: user._id, name: user.name, state: user.state },
    });
  } catch (error) {
    logger.error({ error: error.message }, "Error al actualizar estado de usuario");
    return sendInternalServerError(res, "Error al actualizar estado de usuario");
  }
};