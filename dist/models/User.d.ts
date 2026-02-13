import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=User.d.ts.map