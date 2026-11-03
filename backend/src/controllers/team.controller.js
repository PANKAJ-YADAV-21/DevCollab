import mongoose from 'mongoose';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

/**
 * Create a new team
 * Logged-in user becomes creator and initial Admin member
 * @route POST /api/teams
 * @access Private
 */
export const createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Team name is required and must be at least 2 characters long',
      });
    }

    if (name.trim().length > 60) {
      return res.status(400).json({
        status: 'error',
        message: 'Team name cannot exceed 60 characters',
      });
    }

    const team = await Team.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      creator: req.user._id,
      members: [
        {
          user: req.user._id,
          role: 'Admin',
          joinedAt: new Date(),
        },
      ],
    });

    await team.populate('creator', 'name email avatar');
    await team.populate('members.user', 'name email avatar role');

    return res.status(201).json({
      status: 'success',
      message: 'Team created successfully',
      data: {
        team,
        userRole: 'Admin',
      },
    });
  } catch (error) {
    console.error('[Create Team Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create team',
    });
  }
};

/**
 * Get all teams where logged-in user is a member
 * @route GET /api/teams
 * @access Private
 */
export const getUserTeams = async (req, res) => {
  try {
    const teams = await Team.find({
      'members.user': req.user._id,
    })
      .populate('creator', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    const teamsWithRole = teams.map((team) => {
      const userRole = team.getUserRole(req.user._id);
      return {
        ...team.toObject(),
        userRole,
      };
    });

    return res.status(200).json({
      status: 'success',
      count: teamsWithRole.length,
      data: {
        teams: teamsWithRole,
      },
    });
  } catch (error) {
    console.error('[Get User Teams Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch teams',
    });
  }
};

/**
 * Get details for a specific team
 * @route GET /api/teams/:teamId
 * @access Private (Must be a team member)
 */
export const getTeamById = async (req, res) => {
  try {
    // req.team and req.userTeamRole attached by verifyTeamMember
    return res.status(200).json({
      status: 'success',
      data: {
        team: req.team,
        userRole: req.userTeamRole,
      },
    });
  } catch (error) {
    console.error('[Get Team By ID Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve team details',
    });
  }
};

/**
 * Add a member to the team
 * - Admin can add any role (Admin, Team Leader, Developer)
 * - Team Leader can only add Developer
 * - Developer cannot add members
 * @route POST /api/teams/:teamId/members
 * @access Private (Admin or Team Leader)
 */
export const addTeamMember = async (req, res) => {
  try {
    const { email, role = 'Developer' } = req.body;
    const requesterRole = req.userTeamRole;

    // 1. Role validation
    const validRoles = ['Admin', 'Team Leader', 'Developer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid role. Allowed roles are: ${validRoles.join(', ')}`,
      });
    }

    // 2. Permission check: Team Leader can only add Developer
    if (requesterRole === 'Team Leader' && role !== 'Developer') {
      return res.status(403).json({
        status: 'error',
        message: 'Team Leaders can only add members with the Developer role',
      });
    }

    if (requesterRole === 'Developer') {
      return res.status(403).json({
        status: 'error',
        message: 'Developers do not have permission to add team members',
      });
    }

    // 3. Email input validation
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid user email address',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 4. Find user by email
    const targetUser = await User.findOne({ email: normalizedEmail });

    if (!targetUser) {
      return res.status(404).json({
        status: 'error',
        message: `No registered user found with email: ${normalizedEmail}`,
      });
    }

    // 5. Check if target user is already a member
    if (req.team.isMember(targetUser._id)) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already a member of this team',
      });
    }

    // 6. Add member to team
    req.team.members.push({
      user: targetUser._id,
      role,
      joinedAt: new Date(),
    });

    await req.team.save();
    await req.team.populate('members.user', 'name email avatar role');

    return res.status(200).json({
      status: 'success',
      message: `User ${targetUser.name} added as ${role} successfully`,
      data: {
        team: req.team,
      },
    });
  } catch (error) {
    console.error('[Add Team Member Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to add team member',
    });
  }
};

/**
 * Remove a member from the team
 * - Admin can remove any member
 * - Team Leader can only remove Developers
 * - A user can remove themselves (leave team)
 * @route DELETE /api/teams/:teamId/members/:userId
 * @access Private (Admin, Team Leader for Devs, or Self)
 */
export const removeTeamMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user._id.toString();
    const requesterRole = req.userTeamRole;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid member User ID format',
      });
    }

    // 1. Locate member in team
    const memberIndex = req.team.members.findIndex((m) => {
      const mId = m.user?._id ? m.user._id.toString() : m.user?.toString();
      return mId === userId.toString();
    });

    if (memberIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found in this team',
      });
    }

    const targetMember = req.team.members[memberIndex];
    const isSelf = requesterId === userId.toString();

    // 2. Prevent removing the team creator if other members exist
    const isCreator = req.team.creator.toString() === userId.toString();

    // 3. Permissions check
    if (!isSelf) {
      if (requesterRole === 'Developer') {
        return res.status(403).json({
          status: 'error',
          message: 'Developers do not have permission to remove team members',
        });
      }

      if (requesterRole === 'Team Leader') {
        if (targetMember.role !== 'Developer') {
          return res.status(403).json({
            status: 'error',
            message: `Team Leaders cannot remove members with role: ${targetMember.role}`,
          });
        }
      }

      if (isCreator && requesterRole !== 'Admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Cannot remove the team creator',
        });
      }
    } else {
      // If user is leaving the team and is the only Admin
      const adminCount = req.team.members.filter((m) => m.role === 'Admin').length;
      if (targetMember.role === 'Admin' && adminCount === 1 && req.team.members.length > 1) {
        return res.status(400).json({
          status: 'error',
          message: 'You are the only Admin. Please promote another member to Admin before leaving.',
        });
      }
    }

    // 4. Remove member
    req.team.members.splice(memberIndex, 1);

    // Cascading unassignment from any projects and tasks in this team
    const teamProjects = await Project.find({ team: req.team._id }).select('_id');
    const teamProjectIds = teamProjects.map((p) => p._id);

    await Project.updateMany(
      { team: req.team._id },
      { $pull: { assignedMembers: userId } }
    );

    await Task.updateMany(
      { project: { $in: teamProjectIds }, assignedDeveloper: userId },
      { $set: { assignedDeveloper: null } }
    );

    // If no members left, delete the team, projects, and tasks entirely
    if (req.team.members.length === 0) {
      await Team.findByIdAndDelete(req.team._id);
      await Task.deleteMany({ project: { $in: teamProjectIds } });
      await Project.deleteMany({ team: req.team._id });
      return res.status(200).json({
        status: 'success',
        message: 'Team had no remaining members and was disbanded',
        data: null,
      });
    }

    await req.team.save();
    await req.team.populate('members.user', 'name email avatar role');

    return res.status(200).json({
      status: 'success',
      message: isSelf ? 'You have successfully left the team' : 'Team member removed successfully',
      data: {
        team: req.team,
      },
    });
  } catch (error) {
    console.error('[Remove Team Member Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to remove team member',
    });
  }
};

/**
 * Update a team member's role
 * - Only Admin can change member roles
 * @route PUT /api/teams/:teamId/members/:userId/role
 * @access Private (Admin only)
 */
export const updateMemberRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const requesterRole = req.userTeamRole;

    // 1. Check requester permission
    if (requesterRole !== 'Admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only team Admins can update member roles',
      });
    }

    // 2. Validate role
    const validRoles = ['Admin', 'Team Leader', 'Developer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid role. Allowed roles are: ${validRoles.join(', ')}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid member User ID format',
      });
    }

    // 3. Locate member
    const member = req.team.members.find((m) => {
      const mId = m.user?._id ? m.user._id.toString() : m.user?.toString();
      return mId === userId.toString();
    });

    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: 'Member not found in this team',
      });
    }

    // 4. Update role
    member.role = role;
    await req.team.save();
    await req.team.populate('members.user', 'name email avatar role');

    return res.status(200).json({
      status: 'success',
      message: `Member role updated to ${role} successfully`,
      data: {
        team: req.team,
      },
    });
  } catch (error) {
    console.error('[Update Member Role Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update member role',
    });
  }
};

/**
 * Delete a team
 * - Only team creator or Admin can delete the team
 * @route DELETE /api/teams/:teamId
 * @access Private (Admin only)
 */
export const deleteTeam = async (req, res) => {
  try {
    const requesterRole = req.userTeamRole;

    if (requesterRole !== 'Admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only team Admins can delete the team',
      });
    }

    const teamProjects = await Project.find({ team: req.team._id }).select('_id');
    const teamProjectIds = teamProjects.map((p) => p._id);

    await Team.findByIdAndDelete(req.team._id);
    await Task.deleteMany({ project: { $in: teamProjectIds } });
    await Project.deleteMany({ team: req.team._id });

    return res.status(200).json({
      status: 'success',
      message: 'Team and associated projects deleted successfully',
      data: {
        teamId: req.team._id,
      },
    });
  } catch (error) {
    console.error('[Delete Team Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete team',
    });
  }
};
