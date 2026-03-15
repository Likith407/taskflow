const mongoose = require('mongoose');

const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'archived'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUSES,
        message: `Status must be one of: ${TASK_STATUSES.join(', ')}`,
      },
      default: 'todo',
    },
    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITIES,
        message: `Priority must be one of: ${TASK_PRIORITIES.join(', ')}`,
      },
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 10,
        message: 'Cannot have more than 10 tags',
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

taskSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      this.completedAt = null;
    }
  }
  next();
});

taskSchema.index({ owner: 1, status: 1 });
taskSchema.index({ owner: 1, createdAt: -1 });
taskSchema.index({ title: 'text', description: 'text' });

const Task = mongoose.model('Task', taskSchema);

module.exports = { Task, TASK_STATUSES, TASK_PRIORITIES };