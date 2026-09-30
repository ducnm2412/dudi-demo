import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    name: { type: String, trim: true },
    avatar: { type: String },
    provider: { type: String, enum: ['local', 'google'], required: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    email: this.email,
    phone: this.phone,
    name: this.name,
    avatar: this.avatar,
    provider: this.provider,
    googleLinked: Boolean(this.googleId),
    createdAt: this.createdAt,
  };
};

export default mongoose.models.User || mongoose.model('User', userSchema);
