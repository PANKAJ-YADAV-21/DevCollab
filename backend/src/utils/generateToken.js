import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token for a given user ID
 * @param {string} userId - Mongoose ObjectId string
 * @returns {string} Signed JWT token
 */
export const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }

  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};
