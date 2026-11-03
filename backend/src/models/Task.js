import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text cannot be empty'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
      minlength: [2, 'Task title must be at least 2 characters long'],
      maxlength: [100, 'Task title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Task must belong to a project'],
      index: true,
    },
    assignedDeveloper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: '{VALUE} is not a valid priority level',
      },
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['To Do', 'In Progress', 'In Review', 'Completed'],
        message: '{VALUE} is not a valid task status',
      },
      default: 'To Do',
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    comments: [commentSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for querying tasks by project and status
taskSchema.index({ project: 1, status: 1 });

const Task = mongoose.model('Task', taskSchema);

export default Task;
