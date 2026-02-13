import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from '../models/User';
import { hashPassword } from '../utils/bcrypt';

dotenv.config();

const seedAdmin = async () => {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'a@a@admina@a@';

  console.log(`Ensuring admin user "${username}" exists...`);

  const existingAdmin = await User.findOne({ username, role: 'admin' });

  if (existingAdmin) {
    console.log(`Admin user "${username}" already exists. Skipping creation.`);
    return;
  }

  const hashedPassword = await hashPassword(password);

  const admin = new User({
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
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    await seedAdmin();

    await mongoose.disconnect();
    console.log('Done');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin user:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  void run();
}

