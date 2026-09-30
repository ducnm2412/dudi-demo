import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD theo giờ Việt Nam
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

attendanceSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    date: this.date,
    checkIn: this.checkIn,
    checkOut: this.checkOut || null,
  };
};

export default mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
