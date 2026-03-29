export const getErrorMsg = (error, defaultMsg = 'Ocurrió un error') => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((err) => {
        if (typeof err === 'string') return err;
        if (err?.msg) return err.msg;
        return 'Error desconocido';
      })
      .join('; ');
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return defaultMsg;
};

export default getErrorMsg;
