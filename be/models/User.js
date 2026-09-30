import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    // Tài khoản Facebook đăng ký bằng SĐT có thể không có email, nên email không bắt buộc
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    phoneVerified: { type: Boolean, default: false },
    passwordHash: { type: String, select: false },
    googleId: { type: String, unique: true, sparse: true },
    facebookId: { type: String, unique: true, sparse: true },
    name: { type: String, trim: true },
    avatar: { type: String },
    provider: { type: String, enum: ['local', 'google', 'facebook'], required: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    phone: this.phone,
    phoneVerified: this.phoneVerified,
    name: this.name,
    avatar: this.avatar,
    provider: this.provider,
    googleLinked: Boolean(this.googleId),
    facebookLinked: Boolean(this.facebookId),
    createdAt: this.createdAt,
  };
};

export default mongoose.models.User || mongoose.model('User', userSchema);
