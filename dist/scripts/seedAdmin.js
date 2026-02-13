"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const bcrypt_1 = require("../utils/bcrypt");
dotenv_1.default.config();
const seedAdmin = async () => {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    console.log(`Ensuring admin user "${username}" exists...`);
    const existingAdmin = await User_1.default.findOne({ username, role: 'admin' });
    if (existingAdmin) {
        console.log(`Admin user "${username}" already exists. Skipping creation.`);
        return;
    }
    const hashedPassword = await (0, bcrypt_1.hashPassword)(password);
    const admin = new User_1.default({
        username,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        passportFullName: 'System Administrator',
        passportNumber: 'N/A',
        levelAccess: {
            level1: true,
            level2: true,
            level3: true
        }
    });
    await admin.save();
    console.log('Admin user created successfully:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
};
const run = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-platform';
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        await seedAdmin();
        await mongoose_1.default.disconnect();
        console.log('Done');
        process.exit(0);
    }
    catch (err) {
        console.error('Failed to seed admin user:', err);
        process.exit(1);
    }
};
if (require.main === module) {
    void run();
}
//# sourceMappingURL=seedAdmin.js.map