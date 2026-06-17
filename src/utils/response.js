export const sendResponse = (res, statusCode, success, message, data = null, pagination = null) => {
  const response = {
    success,
    message,
    data,
  };
  
  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};
