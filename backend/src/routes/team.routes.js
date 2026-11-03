import express from 'express';
import {
  createTeam,
  getUserTeams,
  getTeamById,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  deleteTeam,
} from '../controllers/team.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { verifyTeamMember, requireTeamRole } from '../middlewares/rbac.middleware.js';

const router = express.Router();

// All team routes require authentication
router.use(protect);

// Team collection routes
router.route('/')
  .post(createTeam)
  .get(getUserTeams);

// Team instance routes
router.route('/:teamId')
  .get(verifyTeamMember, getTeamById)
  .delete(verifyTeamMember, requireTeamRole(['Admin']), deleteTeam);

// Team member management routes
router.route('/:teamId/members')
  .post(verifyTeamMember, requireTeamRole(['Admin', 'Team Leader']), addTeamMember);

router.route('/:teamId/members/:userId')
  .delete(verifyTeamMember, removeTeamMember);

router.route('/:teamId/members/:userId/role')
  .put(verifyTeamMember, requireTeamRole(['Admin']), updateMemberRole);

export default router;
