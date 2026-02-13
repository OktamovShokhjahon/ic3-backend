import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  deviceId?: string;
  passportFullName?: string;
  passportNumber?: string;
  levelAccess: {
    level1: boolean;
    level2: boolean;
    level3: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  deviceId: {
    type: String,
    default: null
  },
  passportFullName: {
    type: String,
    default: null,
    trim: true,
    maxlength: 200
  },
  passportNumber: {
    type: String,
    default: null,
    trim: true,
    maxlength: 100
  },
  levelAccess: {
    level1: {
      type: Boolean,
      default: false
    },
    level2: {
      type: Boolean,
      default: false
    },
    level3: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', userSchema);
