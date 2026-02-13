import path from "path";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import dotenv from "dotenv";

import User from "./src/models/User";
import { hashPassword, comparePassword } from "./src/utils/bcrypt";

dotenv.config();

const testPasswordUpdate = async () => {
  try {
    // Connect to database
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/test-platform";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Check existing users
    const users = await User.find({});
    console.log(`\nFound ${users.length} users in database:`);
    users.forEach((user) => {
      console.log(`- ${user.username} (${user.role})`);
    });

    // Read Excel file
    const excelPath = path.resolve(__dirname, "src/public/old-logins.xlsx");
    console.log(`\nReading Excel file: ${excelPath}`);

    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    console.log(`\nExcel file has ${rows.length} rows`);
    console.log("Columns:", Object.keys(rows[0] || {}));

    // Show first few rows
    console.log("\nFirst 3 rows from Excel:");
    rows.slice(0, 3).forEach((row: any, index) => {
      console.log(`Row ${index + 2}:`, row);
    });

    // Test password update for first user
    if (rows.length > 0 && users.length > 0) {
      const firstRow: any = rows[0];
      const firstUser = users[0];

      console.log(`\nTesting password update:`);
      console.log(`User: ${firstUser.username}`);
      console.log(`Excel row:`, firstRow);

      // Try to extract password from Excel
      const keys = Object.keys(firstRow);
      const passwordKey =
        keys.find((k) => /parol|password|pass/i.test(k)) || keys[1];
      const newPassword = String(firstRow[passwordKey] || "").trim();

      console.log(`Password column: ${passwordKey}`);
      console.log(`New password: "${newPassword}"`);

      if (newPassword) {
        // Hash and update
        const hashedPassword = await hashPassword(newPassword);
        firstUser.password = hashedPassword;
        await firstUser.save();

        console.log(`✓ Password updated for ${firstUser.username}`);

        // Test the new password
        const isValid = await comparePassword(newPassword, firstUser.password);
        console.log(
          `Password verification: ${isValid ? "✓ Valid" : "✗ Invalid"}`,
        );
      }
    }

    await mongoose.disconnect();
    console.log("\nTest completed");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

testPasswordUpdate();
