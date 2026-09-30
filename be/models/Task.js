import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    title: this.title,
    done: this.done,
    createdAt: this.createdAt,
  };
};

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
