import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion extends Document {
  level: number;
  number: number;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>({
  level: {
    type: Number,
    required: true,
    enum: [1, 2, 3]
  },
  number: {
    type: Number,
    required: true,
    min: 1,
    max: 90
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(options: string[]) {
        return options.length === 4;
      },
      message: 'Exactly 4 options are required'
    }
  },
  correctAnswerIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  }
}, {
  timestamps: true
});

questionSchema.index({ level: 1, number: 1 }, { unique: true });

export default mongoose.model<IQuestion>('Question', questionSchema);
