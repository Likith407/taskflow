const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
} = require('../controllers/taskController');
const { authenticate } = require('../middleware/auth');
const {
  createTaskValidator,
  updateTaskValidator,
  taskQueryValidator,
  handleValidationErrors,
} = require('../middleware/validate');
const { param } = require('express-validator');

// All task routes require authentication
router.use(authenticate);

router.get('/stats', getTaskStats);
router.get('/', taskQueryValidator, getTasks);
router.post('/', createTaskValidator, createTask);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid task ID'), handleValidationErrors], getTaskById);
router.patch('/:id', updateTaskValidator, updateTask);
router.delete('/:id', [param('id').isMongoId().withMessage('Invalid task ID'), handleValidationErrors], deleteTask);

module.exports = router;
