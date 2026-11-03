import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, bio, skills } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: name, email, and password',
      });
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address',
      });
    }

    // 3. Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long',
      });
    }

    // 4. Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email address already exists',
      });
    }

    // 5. Create new user (password is automatically hashed by Mongoose pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || 'developer',
      bio: bio || '',
      skills: Array.isArray(skills) ? skills : [],
    });

    // 6. Generate signed JWT token
    const token = generateToken(user._id);

    // 7. Return sanitized response (password is excluded)
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio,
          skills: user.skills,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error during registration',
    });
  }
};

/**
 * Authenticate user and obtain JWT token
 * @route POST /api/auth/login
 * @access Public
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate inputs
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Find user by email and explicitly select password
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // 3. Verify password hash using bcrypt
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // 4. Generate JWT token
    const token = generateToken(user._id);

    // 5. Return sanitized response
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          bio: user.bio,
          skills: user.skills,
          createdAt: user.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error during login',
    });
  }
};

/**
 * Get profile of currently logged-in user
 * @route GET /api/auth/me
 * @access Private (Protected by protect middleware)
 */
export const getCurrentUser = async (req, res) => {
  try {
    // req.user was attached by protect middleware
    return res.status(200).json({
      status: 'success',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('[Get Current User Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error fetching user profile',
    });
  }
};
