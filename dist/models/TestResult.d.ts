import mongoose, { Document } from 'mongoose';
export interface ITestResult extends Document {
    userId: mongoose.Types.ObjectId;
    level: number;
    type: '1-45' | '46-90' | 'full';
    score: number;
    correct: number;
    wrong: number;
    timeSpent: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ITestResult, {}, {}, {}, mongoose.Document<unknown, {}, ITestResult, {}, {}> & ITestResult & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=TestResult.d.ts.map