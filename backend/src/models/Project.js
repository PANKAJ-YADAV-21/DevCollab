import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a project name'],
      trim: true,
      minlength: [2, 'Project name must be at least 2 characters long'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Project description cannot exceed 1000 characters'],
      default: '',
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: [true, 'Project must belong to a team'],
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ['Planning', 'Active', 'On Hold', 'Completed'],
        message: '{VALUE} is not a valid project status',
      },
      default: 'Planning',
      required: true,
    },
    progress: {
      type: Number,
      min: [0, 'Progress cannot be less than 0%'],
      max: [100, 'Progress cannot exceed 100%'],
      default: 0,
    },
    priority: {
      type: String,
      enum: {
        values: ['Low', 'Medium', 'High', 'Critical'],
        message: '{VALUE} is not a valid priority level',
      },
      default: 'Medium',
    },
    startDate: {
      type: Date,
      default: null,
    },
    deadline: {
      type: Date,
      default: null,
    },
    assignedMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Helper method to check if a user is assigned to this project
projectSchema.methods.isAssigned = function (userId) {
  if (!userId) return false;
  const idStr = userId.toString();
  return this.assignedMembers.some((memberId) => {
    const mStr = memberId._id ? memberId._id.toString() : memberId.toString();
    return mStr === idStr;
  });
};

const Project = mongoose.model('Project', projectSchema);

export default Project;
