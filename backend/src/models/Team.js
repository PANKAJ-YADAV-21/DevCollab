import mongoose from 'mongoose';

const teamMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['Admin', 'Team Leader', 'Developer'],
      default: 'Developer',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a team name'],
      trim: true,
      minlength: [2, 'Team name must be at least 2 characters long'],
      maxlength: [60, 'Team name cannot exceed 60 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: '',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [teamMemberSchema],
  },
  {
    timestamps: true,
  }
);

// Method to retrieve member's role
teamSchema.methods.getUserRole = function (userId) {
  if (!userId) return null;
  const idStr = userId.toString();
  const member = this.members.find((m) => {
    const mId = m.user?._id ? m.user._id.toString() : m.user?.toString();
    return mId === idStr;
  });
  return member ? member.role : null;
};

// Method to verify team membership
teamSchema.methods.isMember = function (userId) {
  if (!userId) return false;
  const idStr = userId.toString();
  return this.members.some((m) => {
    const mId = m.user?._id ? m.user._id.toString() : m.user?.toString();
    return mId === idStr;
  });
};

const Team = mongoose.model('Team', teamSchema);

export default Team;
