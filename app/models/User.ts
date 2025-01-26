import mongoose, { Document, Model } from 'mongoose';

// Interface for the base User document
export interface IUser {
  email: string;
  password: string;
  role: 'user' | 'admin' | 'guest';
  createdAt: Date;
}

// Interface for the User document with Document methods
export interface IUserDocument extends IUser, Document {}

// Interface for User model methods
export interface IUserModel extends Model<IUserDocument> {}

const userSchema = new mongoose.Schema<IUserDocument>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'guest'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Create and export the model
const User = (mongoose.models.User as IUserModel) || 
  mongoose.model<IUserDocument, IUserModel>('User', userSchema);

export default User;