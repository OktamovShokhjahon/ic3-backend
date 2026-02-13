import express from 'express';
import { body, validationResult } from 'express-validator';
import Question from '../models/Question';
import TestResult from '../models/TestResult';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get questions for a test
router.get('/questions/:level/:type', async (req: AuthRequest, res: express.Response) => {
  try {
    const { level, type } = req.params;
    const user = req.user!;

    // Check if user has access to this level
    if (user.role === 'user') {
      const levelKey = `level${level}` as keyof typeof user.levelAccess;
      if (!user.levelAccess[levelKey]) {
        return res.status(403).json({ message: 'Access denied for this level' });
      }
    }

    const levelNum = parseInt(level, 10);
    const baseMatch: any = { level: levelNum };

    let minNumber = 1;
    let maxNumber = 90;
    let sampleSize = 90;

    if (type === '1-45') {
      minNumber = 1;
      maxNumber = 45;
      sampleSize = 45;
    } else if (type === '46-90') {
      minNumber = 46;
      maxNumber = 90;
      sampleSize = 45;
    } else if (type === 'full') {
      minNumber = 1;
      maxNumber = 90;
      sampleSize = 90;
    } else {
      return res.status(400).json({ message: 'Invalid test type' });
    }

    const questions = await Question.aggregate([
      { $match: { ...baseMatch, number: { $gte: minNumber, $lte: maxNumber } } },
      { $sample: { size: sampleSize } },
      // Never leak the correct answer to the client
      { $project: { correctAnswerIndex: 0, __v: 0 } }
    ]);

    res.json({ questions });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit test result
router.post('/submit', [
  body('level').isIn([1, 2, 3]).withMessage('Level must be 1, 2, or 3'),
  body('type').isIn(['1-45', '46-90', 'full']).withMessage('Type must be 1-45, 46-90, or full'),
  body('questionIds').isArray({ min: 1 }).withMessage('questionIds must be a non-empty array'),
  body('answers').isArray({ min: 1 }).withMessage('Answers must be a non-empty array'),
  body('timeSpent').isInt({ min: 0 }).withMessage('Time spent must be a positive integer')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { level, type, answers, questionIds, timeSpent } = req.body as {
      level: number;
      type: '1-45' | '46-90' | 'full';
      answers: number[];
      questionIds: string[];
      timeSpent: number;
    };
    const user = req.user!;

    // Check if user has access to this level
    if (user.role === 'user') {
      const levelKey = `level${level}` as keyof typeof user.levelAccess;
      if (!user.levelAccess[levelKey]) {
        return res.status(403).json({ message: 'Access denied for this level' });
      }
    }

    if (questionIds.length !== answers.length) {
      return res.status(400).json({ message: 'questionIds and answers must have the same length' });
    }

    const questions = await Question.find({ _id: { $in: questionIds }, level }).select('correctAnswerIndex');
    if (questions.length !== questionIds.length) {
      return res.status(400).json({ message: 'Invalid question set' });
    }

    const correctMap = new Map<string, number>();
    questions.forEach((q: any) => correctMap.set(q._id.toString(), q.correctAnswerIndex));

    // Calculate results
    let correct = 0;
    for (let i = 0; i < questionIds.length; i++) {
      const qid = String(questionIds[i]);
      const userAnswer = answers[i];
      const expected = correctMap.get(qid);
      if (typeof expected === 'number' && userAnswer === expected) correct++;
    }

    const wrong = answers.length - correct;
    const score = Math.round((correct / answers.length) * 100);

    // Save test result
    const testResult = new TestResult({
      userId: user._id,
      level,
      type,
      score,
      correct,
      wrong,
      timeSpent
    });

    await testResult.save();

    res.json({
      message: 'Test submitted successfully',
      result: {
        total: answers.length,
        correct,
        wrong,
        score,
        timeSpent
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user test results
router.get('/results', async (req: AuthRequest, res: express.Response) => {
  try {
    const user = req.user!;
    const results = await TestResult.find({ userId: user._id })
      .sort({ createdAt: -1 });

    res.json({ results });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user statistics
router.get('/stats', async (req: AuthRequest, res: express.Response) => {
  try {
    const user = req.user!;
    
    const totalTests = await TestResult.countDocuments({ userId: user._id });
    const averageScore = await TestResult.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, avgScore: { $avg: '$score' } } }
    ]);

    const levelStats = await TestResult.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: '$level', count: { $sum: 1 }, avgScore: { $avg: '$score' } } }
    ]);

    const recentResults = await TestResult.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      totalTests,
      averageScore: averageScore[0]?.avgScore || 0,
      levelStats,
      recentResults
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Record completion of an external/legacy test (e.g. iSpring HTML)
router.post('/legacy-complete', [
  body('level').isIn([1, 2, 3]).withMessage('Level must be 1, 2, or 3'),
  body('type').isIn(['1-45', '46-90', 'full']).withMessage('Type must be 1-45, 46-90, or full'),
  body('timeSpent').isInt({ min: 0 }).withMessage('Time spent must be a positive integer'),
  body('score').optional().isInt({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
  body('correct').optional().isInt({ min: 0 }).withMessage('Correct must be a positive integer'),
  body('wrong').optional().isInt({ min: 0 }).withMessage('Wrong must be a positive integer')
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = req.user!;
    const {
      level,
      type,
      timeSpent,
      score: rawScore,
      correct: rawCorrect,
      wrong: rawWrong
    } = req.body as {
      level: number;
      type: '1-45' | '46-90' | 'full';
      timeSpent: number;
      score?: number;
      correct?: number;
      wrong?: number;
    };

    // Check access
    if (user.role === 'user') {
      const levelKey = `level${level}` as keyof typeof user.levelAccess;
      if (!user.levelAccess[levelKey]) {
        return res.status(403).json({ message: 'Access denied for this level' });
      }
    }

    // If external content did not provide detailed scoring, fall back to zeros
    const correct = rawCorrect ?? 0;
    const wrong = rawWrong ?? 0;
    const score = rawScore ?? 0;

    const testResult = new TestResult({
      userId: user._id,
      level,
      type,
      score,
      correct,
      wrong,
      timeSpent
    });

    await testResult.save();

    res.json({
      message: 'Legacy test recorded successfully',
      result: {
        total: correct + wrong,
        correct,
        wrong,
        score,
        timeSpent
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
