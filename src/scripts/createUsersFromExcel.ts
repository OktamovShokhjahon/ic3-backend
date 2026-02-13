import path from "path";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import dotenv from "dotenv";

import User from "../models/User";
import { hashPassword } from "../utils/bcrypt";

dotenv.config();

interface ExcelRow {
  "Full Name": string;
  "Passport Number": string;
  Username: string;
  Password: string;
}

const createUsersFromExcel = async () => {
  const excelPath = path.resolve(
    __dirname,
    "../..",
    "src/public/old-logins.xlsx",
  );
  console.log(`Reading users from: ${excelPath}`);

  try {
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    console.log(`Found ${rows.length} rows in the sheet "${sheetName}"`);

    let createdCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    for (const [index, row] of rows.entries()) {
      const fullName = row["Full Name"]?.trim() || "";
      const passportNumber = row["Passport Number"]?.trim() || "";
      const username = row["Username"]?.trim() || "";
      const password = row["Password"]?.trim() || "";

      if (!username || !password || !fullName || !passportNumber) {
        console.warn(
          `Skipping row ${index + 2} (missing required fields). fullName="${fullName}", username="${username}", password="${password}", passport="${passportNumber}"`,
        );
        skippedCount++;
        continue;
      }

      // Check if user already exists
      const existingUser = await User.findOne({ username });

      if (existingUser) {
        console.log(
          `User "${username}" already exists. Updating password and details...`,
        );

        // Update existing user
        const hashedPassword = await hashPassword(password);
        existingUser.password = hashedPassword;
        existingUser.passportFullName = fullName;
        existingUser.passportNumber = passportNumber;

        await existingUser.save();
        updatedCount++;
        console.log(`✓ Updated user: ${username}`);
      } else {
        // Create new user
        const hashedPassword = await hashPassword(password);

        const userDoc = new User({
          username,
          password: hashedPassword,
          role: "user",
          isActive: true,
          passportFullName: fullName,
          passportNumber,
          levelAccess: {
            level1: true,
            level2: false,
            level3: false,
          },
        });

        try {
          await userDoc.save();
          createdCount++;
          console.log(`✓ Created user: ${username} (${fullName})`);
        } catch (e) {
          console.warn("Failed to save user, skipping row", {
            row: index + 2,
            username,
            fullName,
            error: e,
          });
          skippedCount++;
          continue;
        }
      }
    }

    console.log(`\nUser creation completed:`);
    console.log(`- Successfully created: ${createdCount} users`);
    console.log(`- Successfully updated: ${updatedCount} users`);
    console.log(`- Skipped: ${skippedCount} rows`);
    console.log(`- Total processed: ${rows.length} rows`);
  } catch (error) {
    console.error("Error reading Excel file:", error);
    throw error;
  }
};

const run = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/test-platform";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    await createUsersFromExcel();

    await mongoose.disconnect();
    console.log("Done");
    process.exit(0);
  } catch (err) {
    console.error("Failed to create users from Excel:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  void run();
}
