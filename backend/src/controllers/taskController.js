const { Task, TASK_STATUSES } = require('../models/Task');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

/**
 * GET /api/tasks
 * List tasks with pagination, filter by status, search by title
 */
const getTasks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Base filter: always scope to current user
    const filter = { owner: req.user._id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Full-text search on title + description
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDirection };

    // Run query and count in parallel
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Task.countDocuments(filter),
    ]);

    return paginatedResponse(res, { data: tasks, total, page, limit });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:id
 */
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
    if (!task) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Task not found',
        code: 'TASK_NOT_FOUND',
      });
    }
    return successResponse(res, { data: task });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks
 */
const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, tags } = req.body;

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      tags,
      owner: req.user._id,
    });

    return successResponse(res, {
      statusCode: 201,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tasks/:id
 */
const updateTask = async (req, res, next) => {
  try {
    const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate', 'tags'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, {
        statusCode: 400,
        message: 'No valid fields to update',
        code: 'NO_UPDATES',
      });
    }

    // Find task owned by current user (authorization check)
    const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });
    if (!task) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Task not found',
        code: 'TASK_NOT_FOUND',
      });
    }

    // Apply updates using save() to trigger pre-save hooks (e.g., completedAt)
    Object.assign(task, updates);
    await task.save();

    return successResponse(res, {
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:id
 */
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!task) {
      return errorResponse(res, {
        statusCode: 404,
        message: 'Task not found',
        code: 'TASK_NOT_FOUND',
      });
    }
    return successResponse(res, { message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/stats
 * Summary counts per status for the current user
 */
const getTaskStats = async (req, res, next) => {
  try {
    const stats = await Task.aggregate([
      { $match: { owner: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Normalize to { todo: 0, in_progress: 0, completed: 0, archived: 0 }
    const normalized = TASK_STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
    stats.forEach(({ _id, count }) => {
      normalized[_id] = count;
    });
    normalized.total = Object.values(normalized).reduce((a, b) => a + b, 0);

    return successResponse(res, { data: normalized });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask, getTaskStats };
