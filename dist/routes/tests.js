"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const Question_1 = __importDefault(require("../models/Question"));
const TestResult_1 = __importDefault(require("../models/TestResult"));
const router = express_1.default.Router();
// Get questions for a test
router.get('/questions/:level/:type', async (req, res) => {
    try {
        const { level, type } = req.params;
        const user = req.user;
        // Check if user has access to this level
        if (user.role === 'user') {
            const levelKey = `level${level}`;
            if (!user.levelAccess[levelKey]) {
                return res.status(403).json({ message: 'Access denied for this level' });
            }
        }
        const levelNum = parseInt(level, 10);
        const baseMatch = { level: levelNum };
        let minNumber = 1;
        let maxNumber = 90;
        let sampleSize = 90;
        if (type === '1-45') {
            minNumber = 1;
            maxNumber = 45;
            sampleSize = 45;
        }
        else if (type === '46-90') {
            minNumber = 46;
            maxNumber = 90;
            sampleSize = 45;
        }
        else if (type === 'full') {
            minNumber = 1;
            maxNumber = 90;
            sampleSize = 90;
        }
        else {
            return res.status(400).json({ message: 'Invalid test type' });
        }
        const questions = await Question_1.default.aggregate([
            { $match: { ...baseMatch, number: { $gte: minNumber, $lte: maxNumber } } },
            { $sample: { size: sampleSize } },
            // Never leak the correct answer to the client
            { $project: { correctAnswerIndex: 0, __v: 0 } }
        ]);
        res.json({ questions });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Submit test result
router.post('/submit', [
    (0, express_validator_1.body)('level').isIn([1, 2, 3]).withMessage('Level must be 1, 2, or 3'),
    (0, express_validator_1.body)('type').isIn(['1-45', '46-90', 'full']).withMessage('Type must be 1-45, 46-90, or full'),
    (0, express_validator_1.body)('questionIds').isArray({ min: 1 }).withMessage('questionIds must be a non-empty array'),
    (0, express_validator_1.body)('answers').isArray({ min: 1 }).withMessage('Answers must be a non-empty array'),
    (0, express_validator_1.body)('timeSpent').isInt({ min: 0 }).withMessage('Time spent must be a positive integer')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { level, type, answers, questionIds, timeSpent } = req.body;
        const user = req.user;
        // Check if user has access to this level
        if (user.role === 'user') {
            const levelKey = `level${level}`;
            if (!user.levelAccess[levelKey]) {
                return res.status(403).json({ message: 'Access denied for this level' });
            }
        }
        if (questionIds.length !== answers.length) {
            return res.status(400).json({ message: 'questionIds and answers must have the same length' });
        }
        const questions = await Question_1.default.find({ _id: { $in: questionIds }, level }).select('correctAnswerIndex');
        if (questions.length !== questionIds.length) {
            return res.status(400).json({ message: 'Invalid question set' });
        }
        const correctMap = new Map();
        questions.forEach((q) => correctMap.set(q._id.toString(), q.correctAnswerIndex));
        // Calculate results
        let correct = 0;
        for (let i = 0; i < questionIds.length; i++) {
            const qid = String(questionIds[i]);
            const userAnswer = answers[i];
            const expected = correctMap.get(qid);
            if (typeof expected === 'number' && userAnswer === expected)
                correct++;
        }
        const wrong = answers.length - correct;
        const score = Math.round((correct / answers.length) * 100);
        // Save test result
        const testResult = new TestResult_1.default({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get user test results
router.get('/results', async (req, res) => {
    try {
        const user = req.user;
        const results = await TestResult_1.default.find({ userId: user._id })
            .sort({ createdAt: -1 });
        res.json({ results });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get user statistics
router.get('/stats', async (req, res) => {
    try {
        const user = req.user;
        const totalTests = await TestResult_1.default.countDocuments({ userId: user._id });
        const averageScore = await TestResult_1.default.aggregate([
            { $match: { userId: user._id } },
            { $group: { _id: null, avgScore: { $avg: '$score' } } }
        ]);
        const levelStats = await TestResult_1.default.aggregate([
            { $match: { userId: user._id } },
            { $group: { _id: '$level', count: { $sum: 1 }, avgScore: { $avg: '$score' } } }
        ]);
        const recentResults = await TestResult_1.default.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .limit(5);
        res.json({
            totalTests,
            averageScore: averageScore[0]?.avgScore || 0,
            levelStats,
            recentResults
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Record completion of an external/legacy test (e.g. iSpring HTML)
router.post('/legacy-complete', [
    (0, express_validator_1.body)('level').isIn([1, 2, 3]).withMessage('Level must be 1, 2, or 3'),
    (0, express_validator_1.body)('type').isIn(['1-45', '46-90', 'full']).withMessage('Type must be 1-45, 46-90, or full'),
    (0, express_validator_1.body)('timeSpent').isInt({ min: 0 }).withMessage('Time spent must be a positive integer'),
    (0, express_validator_1.body)('score').optional().isInt({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100'),
    (0, express_validator_1.body)('correct').optional().isInt({ min: 0 }).withMessage('Correct must be a positive integer'),
    (0, express_validator_1.body)('wrong').optional().isInt({ min: 0 }).withMessage('Wrong must be a positive integer')
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const user = req.user;
        const { level, type, timeSpent, score: rawScore, correct: rawCorrect, wrong: rawWrong } = req.body;
        // Check access
        if (user.role === 'user') {
            const levelKey = `level${level}`;
            if (!user.levelAccess[levelKey]) {
                return res.status(403).json({ message: 'Access denied for this level' });
            }
        }
        // If external content did not provide detailed scoring, fall back to zeros
        const correct = rawCorrect ?? 0;
        const wrong = rawWrong ?? 0;
        const score = rawScore ?? 0;
        const testResult = new TestResult_1.default({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=tests.js.map