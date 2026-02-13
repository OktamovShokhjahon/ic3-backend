import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from './src/models/User';
import { comparePassword } from './src/utils/bcrypt';

dotenv.config();

const testLogin = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-platform';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Test the specific user
    const username = 'zulayho.matyaqubova';
    const password = 'Hw4545GwZs';

    console.log(`\nTesting login for user: ${username}`);
    console.log(`Password: ${password}`);

    // Find user
    const user = await User.findOne({ username });
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('✅ User found in database');
    console.log(`User details:`);
    console.log(`- Username: ${user.username}`);
    console.log(`- Full Name: ${user.passportFullName}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- isActive: ${user.isActive}`);
    console.log(`- deviceId: ${user.deviceId}`);

    // Test password comparison
    const isPasswordValid = await comparePassword(password, user.password);
    console.log(`\nPassword validation: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);

    if (!isPasswordValid) {
      // Test with a different password
      console.log('\nTrying to see what the hash looks like...');
      console.log(`Stored hash: ${user.password}`);
    }

    await mongoose.disconnect();
    console.log('\nTest completed');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testLogin();
