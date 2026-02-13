import mongoose, { Document, Schema } from 'mongoose';

export interface ITestResult extends Document {
  userId: mongoose.Types.ObjectId;
  level: number;
  type: '1-45' | '46-90' | 'full';
  score: number;
  correct: number;
  wrong: number;
  timeSpent: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const testResultSchema = new Schema<ITestResult>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    required: true,
    enum: [1, 2, 3]
  },
  type: {
    type: String,
    required: true,
    enum: ['1-45', '46-90', 'full']
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  correct: {
    type: Number,
    required: true,
    min: 0
  },
  wrong: {
    type: Number,
    required: true,
    min: 0
  },
  timeSpent: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

export default mongoose.model<ITestResult>('TestResult', testResultSchema);
