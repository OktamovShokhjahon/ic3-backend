import mongoose, { Document } from 'mongoose';
export interface IQuestion extends Document {
    level: number;
    number: number;
    question: string;
    options: string[];
    correctAnswerIndex: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IQuestion, {}, {}, {}, mongoose.Document<unknown, {}, IQuestion, {}, {}> & IQuestion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Question.d.ts.map