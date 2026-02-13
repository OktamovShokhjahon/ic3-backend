import path from "path";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import dotenv from "dotenv";

import User from "../models/User";
import { hashPassword } from "../utils/bcrypt";

dotenv.config();

interface ExcelRow {
  [key: string]: any;
}

const updatePasswordsFromExcel = async () => {
  const excelPath = path.resolve(
    __dirname,
    "../..",
    "src/public/old-logins.xlsx",
  );
  console.log(`Reading passwords from: ${excelPath}`);

  try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    console.log(`Found ${rows.length} rows in the sheet "${sheetName}"`);
    if (rows[0]) {
      console.log("Detected columns:", Object.keys(rows[0]).join(", "));
    }

    let updatedCount = 0;
    let notFoundCount = 0;
    let processedCount = 0;

    // Show first row structure for debugging
    if (rows.length > 0) {
      console.log("\nFirst row structure:");
      console.log("Columns:", Object.keys(rows[0]));
      console.log("Values:", rows[0]);
    }

    for (const [index, row] of rows.entries()) {
      processedCount++;

      // Only show detailed debug for first few rows
      const showDebug = processedCount <= 2;

      if (showDebug) {
        console.log(`\n--- Processing row ${index + 2} ---`);
      }

      // Try to find username and password columns
      const username = getUsername(row, showDebug);
      const password = getPassword(row, showDebug);

      if (!username || !password) {
        console.warn(
          `Skipping row ${index + 2} (missing username or password). username="${username}", password="${password}"`,
        );
        continue;
      }

      // Find user in database
      const user = await User.findOne({ username: username.trim() });

      if (!user) {
        console.warn(`User "${username}" not found in database. Skipping.`);
        notFoundCount++;
        continue;
      }

      // Hash the new password
      const hashedPassword = await hashPassword(password.trim());

      // Update user password
      user.password = hashedPassword;
      await user.save();

      console.log(`✓ Updated password for user: ${username}`);
      updatedCount++;
    }

    console.log(`\nPassword update completed:`);
    console.log(`- Successfully updated: ${updatedCount} users`);
    console.log(`- Users not found: ${notFoundCount}`);
    console.log(`- Total processed: ${rows.length} rows`);
  } catch (error) {
    console.error("Error reading Excel file:", error);
    throw error;
  }
};

const getUsername = (row: ExcelRow, showDebug = false): string => {
  const keys = Object.keys(row);

  if (showDebug) {
    console.log("Available columns:", keys);
  }

  // Try different column name patterns
  const key =
    keys.find((k) => /login|username|user/i.test(k)) ||
    keys.find((k) => k.toLowerCase().includes("login")) ||
    keys.find((k) => k.toLowerCase().includes("f.i.o.")) ||
    keys.find((k) => k.toLowerCase().includes("fio")) ||
    keys[0]; // fallback to first column

  if (showDebug) {
    console.log(`Using column "${key}" for username:`, row[key]);
  }
  return key ? String(row[key]).trim() : "";
};

const getPassword = (row: ExcelRow, showDebug = false): string => {
  const keys = Object.keys(row);

  // Try different column name patterns
  const key =
    keys.find((k) => /parol|password|pass/i.test(k)) ||
    keys.find((k) => k.toLowerCase().includes("parol")) ||
    keys.find((k) => k.toLowerCase().includes("password")) ||
    keys[1]; // fallback to second column

  if (showDebug) {
    console.log(`Using column "${key}" for password:`, row[key]);
  }
  return key ? String(row[key]).trim() : "";
};

const run = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/test-platform";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    await updatePasswordsFromExcel();

    await mongoose.disconnect();
    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.error("Failed to update passwords from Excel:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  void run();
}
