const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, {
        statusCode: 409,
        message: 'An account with this email already exists',
        code: 'EMAIL_TAKEN',
      });
    }

    // Create user (password hashed in pre-save hook)
    const user = await User.create({ name, email, password });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Store hashed refresh token in DB
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateModifiedOnly: true });

    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return successResponse(res, {
      statusCode: 201,
      message: 'Account created successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
        // Also return token for API clients that can't use cookies
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field (normally excluded)
    const user = await User.findOne({ email }).select('+password +refreshToken');
    if (!user || !user.isActive) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Generate new tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Update refresh token and last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateModifiedOnly: true });

    // Set HTTP-only cookies
    res.cookie('accessToken', accessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

    return successResponse(res, {
      statusCode: 200,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          lastLogin: user.lastLogin,
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Accepts refresh token from cookie, issues new access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Refresh token not found',
        code: 'REFRESH_TOKEN_MISSING',
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    // Find user and verify stored refresh token matches
    const user = await User.findById(decoded.sub).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return errorResponse(res, {
        statusCode: 401,
        message: 'Refresh token reuse detected. Please log in again.',
        code: 'REFRESH_TOKEN_REUSE',
      });
    }

    // Rotate tokens (refresh token rotation)
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save({ validateModifiedOnly: true });

    res.cookie('accessToken', newAccessToken, getAccessTokenCookieOptions());
    res.cookie('refreshToken', newRefreshToken, getRefreshTokenCookieOptions());

    return successResponse(res, {
      statusCode: 200,
      message: 'Token refreshed',
      data: { accessToken: newAccessToken },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // Invalidate refresh token in DB
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    }

    // Clear cookies
    const clearOpts = getClearCookieOptions();
    res.clearCookie('accessToken', clearOpts);
    res.clearCookie('refreshToken', { ...clearOpts, path: '/api/auth/refresh' });

    return successResponse(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  return successResponse(res, {
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt,
      },
    },
  });
};

module.exports = { register, login, refreshToken, logout, getMe };
