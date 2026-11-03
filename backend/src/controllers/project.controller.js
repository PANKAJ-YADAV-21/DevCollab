import mongoose from 'mongoose';
import Project from '../models/Project.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import Task from '../models/Task.js';

/**
 * Create a new project inside a team
 * Only Admins and Team Leaders of the team can create projects
 * @route POST /api/projects
 * @access Private
 */
export const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      teamId,
      status = 'Planning',
      priority = 'Medium',
      progress = 0,
      startDate,
      deadline,
      assignedMembers = [],
    } = req.body;

    // 1. Validate required inputs
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Project name is required and must be at least 2 characters long',
      });
    }

    if (!teamId || !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid team ID is required to create a project',
      });
    }

    // 2. Load team and verify membership and role
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Team not found',
      });
    }

    const callerRole = team.getUserRole(req.user._id);
    if (!callerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: You are not a member of this team',
      });
    }

    // RBAC: Only Admin and Team Leader can create projects
    if (callerRole !== 'Admin' && callerRole !== 'Team Leader') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only team Admins or Team Leaders can create projects',
      });
    }

    // 3. Validate status & priority enums
    const validStatuses = ['Planning', 'Active', 'On Hold', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
      });
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid priority. Allowed values: ${validPriorities.join(', ')}`,
      });
    }

    // 4. Validate dates
    let parsedStartDate = startDate ? new Date(startDate) : null;
    let parsedDeadline = deadline ? new Date(deadline) : null;

    if (parsedStartDate && isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid start date format',
      });
    }

    if (parsedDeadline && isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid deadline format',
      });
    }

    if (parsedStartDate && parsedDeadline && parsedStartDate > parsedDeadline) {
      return res.status(400).json({
        status: 'error',
        message: 'Project start date cannot be later than the deadline',
      });
    }

    // 5. Validate assigned members (must belong to team)
    const validAssignedMembers = [];
    if (Array.isArray(assignedMembers) && assignedMembers.length > 0) {
      for (const mId of assignedMembers) {
        if (mongoose.Types.ObjectId.isValid(mId) && team.isMember(mId)) {
          if (!validAssignedMembers.includes(mId.toString())) {
            validAssignedMembers.push(mId.toString());
          }
        }
      }
    }

    // By default, ensure creator is assigned if no other members specified
    if (validAssignedMembers.length === 0) {
      validAssignedMembers.push(req.user._id);
    }

    // 6. Create project
    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      team: team._id,
      creator: req.user._id,
      status,
      priority,
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      startDate: parsedStartDate,
      deadline: parsedDeadline,
      assignedMembers: validAssignedMembers,
    });

    await project.populate('team', 'name description');
    await project.populate('creator', 'name email avatar');
    await project.populate('assignedMembers', 'name email avatar role');

    return res.status(201).json({
      status: 'success',
      message: 'Project created successfully',
      data: {
        project,
      },
    });
  } catch (error) {
    console.error('[Create Project Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create project',
    });
  }
};

/**
 * Get all projects accessible to the logged-in user
 * Optional query: ?teamId=... &status=...
 * @route GET /api/projects
 * @access Private
 */
export const getProjects = async (req, res) => {
  try {
    const { teamId, status } = req.query;

    let targetTeamIds = [];

    if (teamId) {
      if (!mongoose.Types.ObjectId.isValid(teamId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid team ID parameter format',
        });
      }

      // Check user is member of this requested team
      const team = await Team.findById(teamId);
      if (!team || !team.isMember(req.user._id)) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You are not a member of the requested team',
        });
      }
      targetTeamIds = [team._id];
    } else {
      // Find all teams caller is a member of
      const userTeams = await Team.find({ 'members.user': req.user._id }).select('_id');
      targetTeamIds = userTeams.map((t) => t._id);
    }

    const query = {
      team: { $in: targetTeamIds },
    };

    if (status) {
      query.status = status;
    }

    const projects = await Project.find(query)
      .populate('team', 'name description')
      .populate('creator', 'name email avatar')
      .populate('assignedMembers', 'name email avatar')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      status: 'success',
      count: projects.length,
      data: {
        projects,
      },
    });
  } catch (error) {
    console.error('[Get Projects Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve projects',
    });
  }
};

/**
 * Get single project details by ID
 * @route GET /api/projects/:projectId
 * @access Private (Must be a member of the parent team)
 */
export const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid project ID format',
      });
    }

    const project = await Project.findById(projectId)
      .populate('team')
      .populate('creator', 'name email avatar')
      .populate('assignedMembers', 'name email avatar role');

    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
    }

    // Verify user belongs to the project's parent team
    const team = project.team;
    const userRole = team.getUserRole(req.user._id);

    if (!userRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You do not have access to this project’s team',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        project,
        userTeamRole: userRole,
      },
    });
  } catch (error) {
    console.error('[Get Project By ID Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve project details',
    });
  }
};

/**
 * Update project details (name, description, status, dates, progress, priority)
 * Only Admin or Team Leader of the parent team can edit
 * @route PUT /api/projects/:projectId
 * @access Private
 */
export const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      description,
      status,
      priority,
      progress,
      startDate,
      deadline,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid project ID format',
      });
    }

    const project = await Project.findById(projectId).populate('team');
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
    }

    // Check caller's role in the parent team
    const team = project.team;
    const callerRole = team.getUserRole(req.user._id);

    if (!callerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You do not belong to this project’s team',
      });
    }

    if (callerRole !== 'Admin' && callerRole !== 'Team Leader') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only team Admins and Team Leaders can edit project details',
      });
    }

    // Apply updates with validation
    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'Project name must be at least 2 characters long',
        });
      }
      project.name = name.trim();
    }

    if (description !== undefined) {
      project.description = description ? description.trim() : '';
    }

    if (status !== undefined) {
      const validStatuses = ['Planning', 'Active', 'On Hold', 'Completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        });
      }
      project.status = status;
      // If completed and progress not explicitly updated, set to 100
      if (status === 'Completed' && progress === undefined) {
        project.progress = 100;
      }
    }

    if (priority !== undefined) {
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid priority. Allowed values: ${validPriorities.join(', ')}`,
        });
      }
      project.priority = priority;
    }

    if (progress !== undefined) {
      project.progress = Math.min(100, Math.max(0, Number(progress) || 0));
    }

    if (startDate !== undefined) {
      project.startDate = startDate ? new Date(startDate) : null;
    }

    if (deadline !== undefined) {
      project.deadline = deadline ? new Date(deadline) : null;
    }

    // Verify date ordering
    if (project.startDate && project.deadline && project.startDate > project.deadline) {
      return res.status(400).json({
        status: 'error',
        message: 'Project start date cannot be later than deadline',
      });
    }

    await project.save();
    await project.populate('creator', 'name email avatar');
    await project.populate('assignedMembers', 'name email avatar role');

    return res.status(200).json({
      status: 'success',
      message: 'Project updated successfully',
      data: {
        project,
      },
    });
  } catch (error) {
    console.error('[Update Project Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update project',
    });
  }
};

/**
 * Assign a member to the project
 * Caller must be Admin or Team Leader; target user must be a member of the parent team
 * @route POST /api/projects/:projectId/members
 * @access Private
 */
export const assignProjectMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, email } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid project ID format',
      });
    }

    const project = await Project.findById(projectId).populate('team');
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
    }

    const team = project.team;
    const callerRole = team.getUserRole(req.user._id);

    if (!callerRole || (callerRole !== 'Admin' && callerRole !== 'Team Leader')) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only team Admins and Team Leaders can assign members to projects',
      });
    }

    // Find target user
    let targetUser;
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid user ID format',
        });
      }
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide either a user ID or email address to assign',
      });
    }

    if (!targetUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Verify user belongs to parent team
    if (!team.isMember(targetUser._id)) {
      return res.status(400).json({
        status: 'error',
        message: 'User must be a member of this team before being assigned to the project',
      });
    }

    // Check if already assigned
    if (project.isAssigned(targetUser._id)) {
      return res.status(400).json({
        status: 'error',
        message: 'User is already assigned to this project',
      });
    }

    project.assignedMembers.push(targetUser._id);
    await project.save();
    await project.populate('assignedMembers', 'name email avatar role');

    return res.status(200).json({
      status: 'success',
      message: `${targetUser.name} assigned to project successfully`,
      data: {
        project,
      },
    });
  } catch (error) {
    console.error('[Assign Project Member Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to assign project member',
    });
  }
};

/**
 * Remove an assigned member from the project
 * Caller must be Admin, Team Leader, or removing themselves
 * @route DELETE /api/projects/:projectId/members/:userId
 * @access Private
 */
export const removeProjectMember = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid ID parameter format',
      });
    }

    const project = await Project.findById(projectId).populate('team');
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
    }

    const team = project.team;
    const callerRole = team.getUserRole(req.user._id);
    const isSelf = req.user._id.toString() === userId.toString();

    if (!isSelf) {
      if (!callerRole || (callerRole !== 'Admin' && callerRole !== 'Team Leader')) {
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden: Only team Admins and Team Leaders can remove members from projects',
        });
      }
    }

    if (!project.isAssigned(userId)) {
      return res.status(404).json({
        status: 'error',
        message: 'User is not assigned to this project',
      });
    }

    project.assignedMembers = project.assignedMembers.filter(
      (mId) => mId.toString() !== userId.toString()
    );

    await project.save();
    await project.populate('assignedMembers', 'name email avatar role');

    return res.status(200).json({
      status: 'success',
      message: isSelf ? 'You have unassigned yourself from this project' : 'Member unassigned from project',
      data: {
        project,
      },
    });
  } catch (error) {
    console.error('[Remove Project Member Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to remove project member',
    });
  }
};

/**
 * Delete a project
 * Only Admin of the parent team can delete projects
 * @route DELETE /api/projects/:projectId
 * @access Private (Admin only)
 */
export const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid project ID format',
      });
    }

    const project = await Project.findById(projectId).populate('team');
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
    }

    const team = project.team;
    const callerRole = team.getUserRole(req.user._id);

    if (callerRole !== 'Admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only team Admins can delete projects',
      });
    }

    await Project.findByIdAndDelete(projectId);
    await Task.deleteMany({ project: projectId });

    return res.status(200).json({
      status: 'success',
      message: 'Project deleted successfully',
      data: {
        projectId,
      },
    });
  } catch (error) {
    console.error('[Delete Project Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete project',
    });
  }
};
