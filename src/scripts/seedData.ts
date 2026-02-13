import mongoose from 'mongoose';
import User from '../models/User';
import Question from '../models/Question';
import TestResult from '../models/TestResult';
import { hashPassword } from '../utils/bcrypt';

const sampleUsers = [
  { username: 'admin', password: 'admin123', role: 'admin', isActive: true },
  { username: 'admin2', password: 'admin123', role: 'admin', isActive: true },
  { username: 'admin3', password: 'admin123', role: 'admin', isActive: true },
  { username: 'admin4', password: 'admin123', role: 'admin', isActive: true },
  { username: 'admin5', password: 'admin123', role: 'admin', isActive: true },
  { username: 'admin6', password: 'admin123', role: 'admin', isActive: true },
  { username: 'admin7', password: 'admin123', role: 'admin', isActive: true },
  { username: 'admin8', password: 'admin123', role: 'admin', isActive: true },
  { username: 'admin9', password: 'admin123', role: 'admin', isActive: true },
  { username: 'user1', password: 'user123', role: 'user', isActive: true },
  { username: 'user2', password: 'user123', role: 'user', isActive: true },
  { username: 'user3', password: 'user123', role: 'user', isActive: true },
  { username: 'user4', password: 'user123', role: 'user', isActive: true },
  { username: 'user5', password: 'user123', role: 'user', isActive: true },
  { username: 'user6', password: 'user123', role: 'user', isActive: true },
  { username: 'user7', password: 'user123', role: 'user', isActive: true },
  { username: 'user8', password: 'user123', role: 'user', isActive: true },
  { username: 'user9', password: 'user123', role: 'user', isActive: true }
];

const generateMockFirstTestQuestionsLevel1 = () => {
  // Deterministic mock data for the "first test" (Level 1 questions 1–45)
  // - stable wording
  // - stable correct answers (cycle 0..3)
  const questions = [];
  for (let number = 1; number <= 45; number++) {
    const correctAnswerIndex = (number - 1) % 4;
    questions.push({
      level: 1,
      number,
      question: `Level 1 • Mock Test • Question ${number}: Choose the correct option.`,
      options: [
        `Option A (Q${number})`,
        `Option B (Q${number})`,
        `Option C (Q${number})`,
        `Option D (Q${number})`
      ],
      correctAnswerIndex
    });
  }
  return questions;
};

const generateQuestions = (level: number, startNumber: number, endNumber: number) => {
  const questions = [];
  const topics = [
    'Mathematics', 'Science', 'History', 'Geography', 'Literature',
    'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics'
  ];
  
  for (let number = startNumber; number <= endNumber; number++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    questions.push({
      level,
      number,
      question: `Level ${level} - ${topic} Question ${number}: What is the correct answer for this ${topic} problem?`,
      options: [
        `Option A for ${topic} question ${number}`,
        `Option B for ${topic} question ${number}`,
        `Option C for ${topic} question ${number}`,
        `Option D for ${topic} question ${number}`
      ],
      correctAnswerIndex: Math.floor(Math.random() * 4)
    });
  }
  return questions;
};

const generateTestResults = async (users: any[]) => {
  const testResults = [];
  const testTypes = ['1-45', '46-90', 'full'];
  
  for (let i = 0; i < 5; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const level = Math.floor(Math.random() * 3) + 1;
    const type = testTypes[Math.floor(Math.random() * testTypes.length)] as '1-45' | '46-90' | 'full';
    
    let totalQuestions = type === '1-45' ? 45 : type === '46-90' ? 45 : 90;
    let correct = Math.floor(Math.random() * totalQuestions);
    let wrong = totalQuestions - correct;
    let score = Math.round((correct / totalQuestions) * 100);
    let timeSpent = Math.floor(Math.random() * 3600) + 600; // 10-70 minutes
    
    testResults.push({
      userId: user._id,
      level,
      type,
      score,
      correct,
      wrong,
      timeSpent
    });
  }
  
  return testResults;
};

export const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Question.deleteMany({});
    await TestResult.deleteMany({});
    
    console.log('Cleared existing data');
    
    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const hashedPassword = await hashPassword(userData.password);
      const user = new User({
        ...userData,
        password: hashedPassword,
        levelAccess: {
          level1: userData.role === 'admin' || Math.random() > 0.5,
          level2: userData.role === 'admin' || Math.random() > 0.7,
          level3: userData.role === 'admin' || Math.random() > 0.9
        }
      });
      await user.save();
      createdUsers.push(user);
    }
    
    console.log(`Created ${createdUsers.length} users`);
    
    // Create questions
    const allQuestions = [
      // Level 1 "first test" mock data (1–45)
      ...generateMockFirstTestQuestionsLevel1(),
      // Remaining questions keep random-ish topics
      ...generateQuestions(1, 46, 90),
      ...generateQuestions(2, 1, 90),
      ...generateQuestions(3, 1, 90)
    ];
    
    await Question.insertMany(allQuestions);
    console.log(`Created ${allQuestions.length} questions`);
    
    // Create test results
    const testResults = await generateTestResults(createdUsers);
    await TestResult.insertMany(testResults);
    console.log(`Created ${testResults.length} test results`);
    
    console.log('Database seeded successfully!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// Run if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test-platform')
    .then(() => {
      console.log('Connected to MongoDB');
      return seedDatabase();
    })
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}
