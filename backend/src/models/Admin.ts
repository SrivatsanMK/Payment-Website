import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Auto-generate Admin ID like ADM-10001
const generateAdminId = () => {
  const num = Math.floor(10001 + Math.random() * 89999);
  return `ADM-${num}`;
};

const AdminSchema = new Schema({
  adminId:  { type: String, unique: true, sparse: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  displayName: { type: String, trim: true, default: '' },
  email:    { type: String, required: true, lowercase: true, trim: true },
  phone:    { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['ADMIN_1', 'ADMIN_2'], default: 'ADMIN_1' },
  profilePicture: { type: String, default: '' }
}, {
  timestamps: true
});

// Auto-assign adminId before first save if missing
AdminSchema.pre('save', async function (next) {
  if (!this.adminId) {
    // Generate a unique ID; retry if collision
    let id = generateAdminId();
    let exists = await (this.constructor as any).findOne({ adminId: id });
    while (exists) {
      id = generateAdminId();
      exists = await (this.constructor as any).findOne({ adminId: id });
    }
    this.adminId = id;
  }

  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password method
AdminSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const Admin = model('Admin', AdminSchema);
export default Admin;
