/**
 * Standardized API response helpers
 */

const successResponse = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const errorResponse = (res, { statusCode = 500, message = 'Internal server error', errors = null, code = null }) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  if (code) response.code = code;
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, { data, total, page, limit, message = 'Success' }) => {
  const totalPages = Math.ceil(total / limit);
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
};

module.exports = { successResponse, errorResponse, paginatedResponse };
