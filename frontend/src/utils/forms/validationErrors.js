export const isValidationErrorResponse = (error) =>
  error?.response?.status === 400 &&
  (Array.isArray(error?.response?.data?.errors) || typeof error?.response?.data?.message === 'string');

export const mapValidationErrors = (error) => {
  const apiErrors = error?.response?.data?.errors;
  if (!Array.isArray(apiErrors)) return {};

  return apiErrors.reduce((acc, item) => {
    if (item?.path && item?.msg) {
      acc[item.path] = item.msg;
    }
    return acc;
  }, {});
};

export const getFirstValidationMessage = (error) => {
  const apiErrors = error?.response?.data?.errors;
  if (Array.isArray(apiErrors)) {
    return apiErrors.find((item) => item?.msg)?.msg || '';
  }
  return error?.response?.data?.message || '';
};
