import mongoose from 'mongoose';

// Đăng ký đang chờ xác minh OTP. Chỉ tạo User thật sau khi nhập đúng mã.
const pendingSignupSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    passwordHash: { type: String, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sends: { type: Number, default: 1 },
    lastSentAt: { type: Date, required: true },
    // MongoDB tự xoá bản ghi khi tới thời điểm này (TTL index)
    purgeAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export default mongoose.models.PendingSignup || mongoose.model('PendingSignup', pendingSignupSchema);
