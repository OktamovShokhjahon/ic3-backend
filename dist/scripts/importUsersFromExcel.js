"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const XLSX = __importStar(require("xlsx"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../models/User"));
const bcrypt_1 = require("../utils/bcrypt");
dotenv_1.default.config();
const generatePassword = (length = 10) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const idx = Math.floor(Math.random() * chars.length);
        result += chars[idx];
    }
    return result;
};
const normalizeUsernameBase = (firstName, lastName) => {
    const raw = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, '');
    const cleaned = raw.replace(/[^a-z0-9._]/gi, '');
    if (!cleaned || cleaned.length < 3) {
        return 'user';
    }
    return cleaned;
};
const getFirstName = (row) => {
    const keys = Object.keys(row);
    const key = keys.find((k) => /ism/i.test(k)) || // ism, Ism, Ismi, etc.
        keys.find((k) => /first.?name/i.test(k));
    return key ? String(row[key]).trim() : '';
};
const getLastName = (row) => {
    const keys = Object.keys(row);
    const key = keys.find((k) => /familiya/i.test(k)) || // familiya, Familiyasi, etc.
        keys.find((k) => /surname/i.test(k)) ||
        keys.find((k) => /last.?name/i.test(k));
    return key ? String(row[key]).trim() : '';
};
const getPassportNumber = (row) => {
    const keys = Object.keys(row);
    const key = keys.find((k) => /pasport/i.test(k)) || // Pasport seriya va raqami, etc.
        keys.find((k) => /passport/i.test(k));
    return key ? String(row[key]).trim() : '';
};
const importUsersFromExcel = async () => {
    const excelPath = path_1.default.resolve(__dirname, '../..', 'users.xlsx');
    console.log(`Reading users from: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    console.log(`Found ${rows.length} rows in the sheet "${sheetName}"`);
    if (rows[0]) {
        console.log('Detected columns:', Object.keys(rows[0]).join(', '));
    }
    const createdLogins = [];
    for (const [index, row] of rows.entries()) {
        const firstName = getFirstName(row);
        const lastName = getLastName(row);
        const passportNumber = getPassportNumber(row);
        if (!firstName || !lastName || !passportNumber) {
            console.warn(`Skipping row ${index + 2} (missing required fields). ism="${firstName}", familiya="${lastName}", passport="${passportNumber}"`);
            continue;
        }
        const fullName = `${firstName} ${lastName}`.trim();
        const base = normalizeUsernameBase(firstName, lastName);
        // Ensure username is unique (both in DB and within this import batch)
        let username = base;
        let suffix = 1;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const existsInBatch = createdLogins.some((u) => u.username === username);
            const existsInDb = await User_1.default.exists({ username });
            if (!existsInBatch && !existsInDb)
                break;
            username = `${base}${suffix}`;
            suffix++;
        }
        const plainPassword = generatePassword();
        const hashedPassword = await (0, bcrypt_1.hashPassword)(plainPassword);
        const userDoc = new User_1.default({
            username,
            password: hashedPassword,
            role: 'user',
            isActive: true,
            passportFullName: fullName,
            passportNumber,
            levelAccess: {
                level1: true,
                level2: false,
                level3: false
            }
        });
        try {
            await userDoc.save();
        }
        catch (e) {
            console.warn('Failed to save user, skipping row', {
                row: index + 2,
                username,
                fullName,
                error: e
            });
            continue;
        }
        createdLogins.push({
            fullName,
            passportNumber,
            username,
            password: plainPassword
        });
        console.log(`Created user: ${username} (${fullName})`);
    }
    // Export logins.xlsx
    const exportData = [
        ['Full Name', 'Passport Number', 'Username', 'Password'],
        ...createdLogins.map((u) => [u.fullName, u.passportNumber, u.username, u.password])
    ];
    const exportWb = XLSX.utils.book_new();
    const exportWs = XLSX.utils.aoa_to_sheet(exportData);
    XLSX.utils.book_append_sheet(exportWb, exportWs, 'Logins');
    const exportPath = path_1.default.resolve(__dirname, '../..', 'logins.xlsx');
    XLSX.writeFile(exportWb, exportPath);
    console.log(`Saved login credentials to: ${exportPath}`);
    console.log(`Total users created: ${createdLogins.length}`);
};
const run = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-platform';
        await mongoose_1.default.connect(mongoUri);
        console.log('Connected to MongoDB');
        await importUsersFromExcel();
        await mongoose_1.default.disconnect();
        console.log('Done');
        process.exit(0);
    }
    catch (err) {
        console.error('Failed to import users from Excel:', err);
        process.exit(1);
    }
};
if (require.main === module) {
    void run();
}
//# sourceMappingURL=importUsersFromExcel.js.map