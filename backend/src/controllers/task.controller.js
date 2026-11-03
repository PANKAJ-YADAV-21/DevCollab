import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Team from '../models/Team.js';

/**
 * Create a new task inside a project
 * Only team Admins and Team Leaders can create tasks
 * @route POST /api/tasks
 * @access Private
 */
export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      projectId,
      priority = 'Medium',
      status = 'To Do',
      dueDate,
      assignedDeveloper,
    } = req.body;

    // 1. Validate required inputs
    if (!title || title.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Task title is required and must be at least 2 characters long',
      });
    }

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid project ID is required',
      });
    }

    // 2. Load project and parent team
    const project = await Project.findById(projectId).populate('team');
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found',
      });
    }

    const team = project.team;
    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Parent team for this project could not be found',
      });
    }

    // 3. Verify caller membership and role
    const callerRole = team.getUserRole(req.user._id);
    if (!callerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: You are not a member of this project’s team',
      });
    }

    if (callerRole !== 'Admin' && callerRole !== 'Team Leader') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only team Admins and Team Leaders can create tasks',
      });
    }

    // 4. Validate priority and status
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid priority. Allowed values: ${validPriorities.join(', ')}`,
      });
    }

    const validStatuses = ['To Do', 'In Progress', 'In Review', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
      });
    }

    // 5. Validate assignedDeveloper (must belong to parent team)
    let assignedDevId = null;
    if (assignedDeveloper) {
      if (!mongoose.Types.ObjectId.isValid(assignedDeveloper)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid assigned developer ID format',
        });
      }

      if (!team.isMember(assignedDeveloper)) {
        return res.status(400).json({
          status: 'error',
          message: 'Assigned developer must be an active member of this project’s team',
        });
      }
      assignedDevId = assignedDeveloper;
    }

    // 6. Validate due date
    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid due date format',
        });
      }
    }

    // 7. Create task
    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      project: project._id,
      creator: req.user._id,
      assignedDeveloper: assignedDevId,
      priority,
      status,
      dueDate: parsedDueDate,
    });

    await task.populate('project', 'name status priority team');
    await task.populate('creator', 'name email avatar');
    await task.populate('assignedDeveloper', 'name email avatar role');

    return res.status(201).json({
      status: 'success',
      message: 'Task created successfully',
      data: {
        task,
      },
    });
  } catch (error) {
    console.error('[Create Task Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create task',
    });
  }
};

/**
 * Get tasks accessible to user
 * Filter by projectId, status, priority, assignedDeveloper, search
 * @route GET /api/tasks
 * @access Private
 */
export const getTasks = async (req, res) => {
  try {
    const { projectId, status, priority, assignedDeveloper, search } = req.query;

    const filter = {};

    if (projectId) {
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

      if (!project.team || !project.team.isMember(req.user._id)) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You do not belong to this project’s team',
        });
      }

      filter.project = projectId;
    } else {
      // Find all teams where user is a member
      const userTeams = await Team.find({ 'members.user': req.user._id }).select('_id');
      const teamIds = userTeams.map((t) => t._id);

      // Find all projects in those teams
      const accessibleProjects = await Project.find({ team: { $in: teamIds } }).select('_id');
      const projectIds = accessibleProjects.map((p) => p._id);

      filter.project = { $in: projectIds };
    }

    // Additional query filters
    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (priority && priority !== 'ALL') {
      filter.priority = priority;
    }

    if (assignedDeveloper) {
      if (assignedDeveloper === 'unassigned') {
        filter.assignedDeveloper = null;
      } else if (assignedDeveloper === 'me') {
        filter.assignedDeveloper = req.user._id;
      } else if (mongoose.Types.ObjectId.isValid(assignedDeveloper)) {
        filter.assignedDeveloper = assignedDeveloper;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { title: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
    }

    const tasks = await Task.find(filter)
      .populate('project', 'name team')
      .populate('creator', 'name email avatar')
      .populate('assignedDeveloper', 'name email avatar role')
      .populate('comments.user', 'name email avatar')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      status: 'success',
      count: tasks.length,
      data: {
        tasks,
      },
    });
  } catch (error) {
    console.error('[Get Tasks Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve tasks',
    });
  }
};

/**
 * Get individual task details
 * @route GET /api/tasks/:taskId
 * @access Private
 */
export const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid task ID format',
      });
    }

    const task = await Task.findById(taskId)
      .populate({
        path: 'project',
        select: 'name team status priority',
        populate: {
          path: 'team',
          select: 'name members',
        },
      })
      .populate('creator', 'name email avatar')
      .populate('assignedDeveloper', 'name email avatar role')
      .populate('comments.user', 'name email avatar');

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    const team = task.project?.team;
    if (!team || !team.isMember(req.user._id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You do not have access to this task’s team',
      });
    }

    const callerRole = team.getUserRole(req.user._id);

    return res.status(200).json({
      status: 'success',
      data: {
        task,
        callerRole,
      },
    });
  } catch (error) {
    console.error('[Get Task By ID Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve task details',
    });
  }
};

/**
 * Update task details (title, description, priority, dueDate, assignedDeveloper)
 * Only Admin and Team Leader can update these fields
 * @route PUT /api/tasks/:taskId
 * @access Private
 */
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      priority,
      status,
      dueDate,
      assignedDeveloper,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid task ID format',
      });
    }

    const task = await Task.findById(taskId).populate({
      path: 'project',
      populate: { path: 'team' },
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    const team = task.project?.team;
    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Parent team not found',
      });
    }

    const callerRole = team.getUserRole(req.user._id);
    if (!callerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not a member of this project’s team',
      });
    }

    // RBAC: Only Admin and Team Leader can modify task details and reassign developers
    if (callerRole !== 'Admin' && callerRole !== 'Team Leader') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only team Admins and Team Leaders can edit task details',
      });
    }

    if (title !== undefined) {
      if (title.trim().length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'Task title must be at least 2 characters long',
        });
      }
      task.title = title.trim();
    }

    if (description !== undefined) {
      task.description = description ? description.trim() : '';
    }

    if (priority !== undefined) {
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid priority. Allowed values: ${validPriorities.join(', ')}`,
        });
      }
      task.priority = priority;
    }

    if (status !== undefined) {
      const validStatuses = ['To Do', 'In Progress', 'In Review', 'Completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`,
        });
      }
      task.status = status;
    }

    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        task.dueDate = null;
      } else {
        const parsed = new Date(dueDate);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid due date format',
          });
        }
        task.dueDate = parsed;
      }
    }

    if (assignedDeveloper !== undefined) {
      if (assignedDeveloper === null || assignedDeveloper === '') {
        task.assignedDeveloper = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(assignedDeveloper)) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid assigned developer ID format',
          });
        }
        if (!team.isMember(assignedDeveloper)) {
          return res.status(400).json({
            status: 'error',
            message: 'Assigned developer must be an active member of this project’s team',
          });
        }
        task.assignedDeveloper = assignedDeveloper;
      }
    }

    await task.save();
    await task.populate('project', 'name status priority team');
    await task.populate('creator', 'name email avatar');
    await task.populate('assignedDeveloper', 'name email avatar role');
    await task.populate('comments.user', 'name email avatar');

    return res.status(200).json({
      status: 'success',
      message: 'Task updated successfully',
      data: {
        task,
      },
    });
  } catch (error) {
    console.error('[Update Task Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update task',
    });
  }
};

/**
 * Update task status (Optimized for Drag & Drop Kanban column moves)
 * - Admin and Team Leader can update status of any task
 * - Developer can ONLY update status if task is assigned to them
 * @route PATCH /api/tasks/:taskId/status
 * @access Private
 */
export const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid task ID format',
      });
    }

    const validStatuses = ['To Do', 'In Progress', 'In Review', 'Completed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid task status. Allowed values: ${validStatuses.join(', ')}`,
      });
    }

    const task = await Task.findById(taskId).populate({
      path: 'project',
      populate: { path: 'team' },
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    const team = task.project?.team;
    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Parent team not found',
      });
    }

    const callerRole = team.getUserRole(req.user._id);
    if (!callerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You are not a member of this project’s team',
      });
    }

    // RBAC: Developers can only update status of tasks assigned to them
    if (callerRole === 'Developer') {
      const assignedId = task.assignedDeveloper
        ? (task.assignedDeveloper._id || task.assignedDeveloper).toString()
        : null;

      if (!assignedId || assignedId !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden: Developers can only update the status of tasks assigned to them',
        });
      }
    }

    task.status = status;
    await task.save();

    await task.populate('project', 'name team');
    await task.populate('creator', 'name email avatar');
    await task.populate('assignedDeveloper', 'name email avatar role');

    return res.status(200).json({
      status: 'success',
      message: `Task moved to ${status}`,
      data: {
        task,
      },
    });
  } catch (error) {
    console.error('[Update Task Status Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update task status',
    });
  }
};

/**
 * Delete a task
 * Only Admin and Team Leader can delete tasks
 * @route DELETE /api/tasks/:taskId
 * @access Private
 */
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid task ID format',
      });
    }

    const task = await Task.findById(taskId).populate({
      path: 'project',
      populate: { path: 'team' },
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    const team = task.project?.team;
    if (!team) {
      return res.status(404).json({
        status: 'error',
        message: 'Parent team not found',
      });
    }

    const callerRole = team.getUserRole(req.user._id);
    if (callerRole !== 'Admin' && callerRole !== 'Team Leader') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: Only team Admins and Team Leaders can delete tasks',
      });
    }

    await Task.findByIdAndDelete(taskId);

    return res.status(200).json({
      status: 'success',
      message: 'Task deleted successfully',
      data: {
        taskId,
      },
    });
  } catch (error) {
    console.error('[Delete Task Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete task',
    });
  }
};

/**
 * Add a comment to a task
 * Any member of the parent team can comment
 * @route POST /api/tasks/:taskId/comments
 * @access Private
 */
export const addComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Comment text is required',
      });
    }

    if (text.trim().length > 1000) {
      return res.status(400).json({
        status: 'error',
        message: 'Comment cannot exceed 1000 characters',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid task ID format',
      });
    }

    const task = await Task.findById(taskId).populate({
      path: 'project',
      populate: { path: 'team' },
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    const team = task.project?.team;
    if (!team || !team.isMember(req.user._id)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You do not belong to this project’s team',
      });
    }

    task.comments.push({
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    });

    await task.save();
    await task.populate('comments.user', 'name email avatar');

    const addedComment = task.comments[task.comments.length - 1];

    return res.status(201).json({
      status: 'success',
      message: 'Comment added successfully',
      data: {
        comment: addedComment,
        task,
      },
    });
  } catch (error) {
    console.error('[Add Comment Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to add comment',
    });
  }
};

/**
 * Delete a comment from a task
 * Caller must be the author of the comment or a team Admin
 * @route DELETE /api/tasks/:taskId/comments/:commentId
 * @access Private
 */
export const deleteComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid ID parameter format',
      });
    }

    const task = await Task.findById(taskId).populate({
      path: 'project',
      populate: { path: 'team' },
    });

    if (!task) {
      return res.status(404).json({
        status: 'error',
        message: 'Task not found',
      });
    }

    const commentIndex = task.comments.findIndex(
      (c) => c._id.toString() === commentId.toString()
    );

    if (commentIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Comment not found',
      });
    }

    const targetComment = task.comments[commentIndex];
    const team = task.project?.team;
    const callerRole = team?.getUserRole(req.user._id);

    const isAuthor = targetComment.user.toString() === req.user._id.toString();
    const isAdmin = callerRole === 'Admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: You can only delete your own comments',
      });
    }

    task.comments.splice(commentIndex, 1);
    await task.save();

    return res.status(200).json({
      status: 'success',
      message: 'Comment deleted successfully',
      data: {
        commentId,
      },
    });
  } catch (error) {
    console.error('[Delete Comment Error]:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to delete comment',
    });
  }
};
