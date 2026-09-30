import mongoose from 'mongoose';

// Giữ kết nối qua các lần hot-reload ở môi trường dev
let cached = global._mongoose;
if (!cached) cached = global._mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('Thiếu biến môi trường MONGODB_URI');
    // Báo lỗi sau 10s thay vì treo 30s khi không kết nối được Atlas (sai URI, IP chưa được whitelist...)
    cached.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }).catch((err) => {
      cached.promise = null;
      throw err;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
