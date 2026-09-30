import mongoose from 'mongoose';

export const EVENT_TAGS = ['online', 'meeting', 'offline', 'break'];

const eventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    title: { type: String, required: true, trim: true, maxlength: 120 },
    tag: { type: String, enum: EVENT_TAGS, default: 'offline' },
  },
  { timestamps: true }
);

eventSchema.index({ user: 1, date: 1, time: 1 });

eventSchema.methods.toPublic = function () {
  return { id: this._id.toString(), date: this.date, time: this.time, title: this.title, tag: this.tag };
};

export default mongoose.models.Event || mongoose.model('Event', eventSchema);
