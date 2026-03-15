const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const { errorResponse } = require('../utils/response');

/**
 * Protect routes - Validates JWT from HTTP-only cookie
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from HTTP-only cookie (primary) or Authorization header (fallback for API clients)
    let token = req.cookies?.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Authentication required. Please log in.',
        code: 'AUTH_REQUIRED',
      });
    }

    // Verify the token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, {
          statusCode: 401,
          message: 'Session expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid authentication token.',
        code: 'TOKEN_INVALID',
      });
    }

    if (decoded.type !== 'access') {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid token type.',
        code: 'TOKEN_INVALID',
      });
    }

    // Load user from DB (ensures user still exists and is active)
    const user = await User.findById(decoded.sub).select('-password -refreshToken');
    if (!user || !user.isActive) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'User account not found or deactivated.',
        code: 'USER_NOT_FOUND',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return errorResponse(res, { statusCode: 500, message: 'Authentication error.' });
  }
};

module.exports = { authenticate };
