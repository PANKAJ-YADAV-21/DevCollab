import express from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  addComment,
  deleteComment,
} from '../controllers/task.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All task routes require JWT authentication
router.use(protect);

router.route('/')
  .post(createTask)
  .get(getTasks);

router.route('/:taskId')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.route('/:taskId/status')
  .patch(updateTaskStatus);

router.route('/:taskId/comments')
  .post(addComment);

router.route('/:taskId/comments/:commentId')
  .delete(deleteComment);

export default router;
