import express from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  assignProjectMember,
  removeProjectMember,
} from '../controllers/project.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All project routes require JWT authentication
router.use(protect);

router.route('/')
  .post(createProject)
  .get(getProjects);

router.route('/:projectId')
  .get(getProjectById)
  .put(updateProject)
  .delete(deleteProject);

router.route('/:projectId/members')
  .post(assignProjectMember);

router.route('/:projectId/members/:userId')
  .delete(removeProjectMember);

export default router;
