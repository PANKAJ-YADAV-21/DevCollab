import mongoose from 'mongoose';
import Team from '../models/Team.js';

/**
 * Middleware to load team by :teamId and verify current user is a team member
 * Attaches req.team and req.userTeamRole
 */
export const verifyTeamMember = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid Team ID format',
      });
    }

    const team = await Team.findById(teamId).populate('members.user', 'name email avatar role');

    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found',
      });
    }

    const role = team.getUserRole(req.user._id);

    if (!role) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not a member of this team',
      });
    }

    req.team = team;
    req.userTeamRole = role;
    next();
  } catch (error) {
    console.error('[Verify Team Member Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify team membership permissions',
    });
  }
};

/**
 * Factory middleware to restrict team actions to specific roles
 * @param {Array<string>} allowedRoles e.g. ['Admin', 'Team Leader']
 */
export const requireTeamRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.userTeamRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Team role could not be verified',
      });
    }

    if (!allowedRoles.includes(req.userTeamRole)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden: Only ${allowedRoles.join(' or ')} can perform this action. Your role is ${req.userTeamRole}.`,
      });
    }

    next();
  };
};
