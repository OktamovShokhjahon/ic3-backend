import path from 'path';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';

import User from '../models/User';
import { hashPassword } from '../utils/bcrypt';

dotenv.config();

interface ExcelRow {
  // Generic row type – actual column names come from the header row
  [key: string]: any;
}

interface CreatedLogin {
  fullName: string;
  passportNumber: string;
  username: string;
  password: string;
}

const generatePassword = (length = 10): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    result += chars[idx];
  }
  return result;
};

const normalizeUsernameBase = (firstName: string, lastName: string): string => {
  const raw = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, '');
  const cleaned = raw.replace(/[^a-z0-9._]/gi, '');
  if (!cleaned || cleaned.length < 3) {
    return 'user';
  }
  return cleaned;
};

const getFirstName = (row: ExcelRow): string => {
  const keys = Object.keys(row);
  const key =
    keys.find((k) => /ism/i.test(k)) || // ism, Ism, Ismi, etc.
    keys.find((k) => /first.?name/i.test(k));
  return key ? String(row[key]).trim() : '';
};

const getLastName = (row: ExcelRow): string => {
  const keys = Object.keys(row);
  const key =
    keys.find((k) => /familiya/i.test(k)) || // familiya, Familiyasi, etc.
    keys.find((k) => /surname/i.test(k)) ||
    keys.find((k) => /last.?name/i.test(k));
  return key ? String(row[key]).trim() : '';
};

const getPassportNumber = (row: ExcelRow): string => {
  const keys = Object.keys(row);
  const key =
    keys.find((k) => /pasport/i.test(k)) || // Pasport seriya va raqami, etc.
    keys.find((k) => /passport/i.test(k));
  return key ? String(row[key]).trim() : '';
};

const importUsersFromExcel = async () => {
  const excelPath = path.resolve(__dirname, '../..', 'users.xlsx');
  console.log(`Reading users from: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  console.log(`Found ${rows.length} rows in the sheet "${sheetName}"`);
  if (rows[0]) {
    console.log('Detected columns:', Object.keys(rows[0]).join(', '));
  }

  const createdLogins: CreatedLogin[] = [];

  for (const [index, row] of rows.entries()) {
    const firstName = getFirstName(row);
    const lastName = getLastName(row);
    const passportNumber = getPassportNumber(row);

    if (!firstName || !lastName || !passportNumber) {
      console.warn(
        `Skipping row ${index + 2} (missing required fields). ism="${firstName}", familiya="${lastName}", passport="${passportNumber}"`
      );
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
      const existsInDb = await User.exists({ username });
      if (!existsInBatch && !existsInDb) break;
      username = `${base}${suffix}`;
      suffix++;
    }

    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);

    const userDoc = new User({
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
    } catch (e) {
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

  const exportPath = path.resolve(__dirname, '../..', 'logins.xlsx');
  XLSX.writeFile(exportWb, exportPath);

  console.log(`Saved login credentials to: ${exportPath}`);
  console.log(`Total users created: ${createdLogins.length}`);
};

const run = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-platform';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await importUsersFromExcel();

    await mongoose.disconnect();
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Failed to import users from Excel:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  void run();
}

