import { Router } from 'express';
import aiController from '../controllers/aiController';

const router = Router();

/**
 * POST /api/ai/ask
 * Send a natural language prompt to the AI agent
 * The agent can use tools like getCryptoPrice to fetch real-time data
 *
 * Request body:
 * {
 *   "prompt": "What is the current price of Bitcoin?"
 * }
 *
 * Example:
 * curl -X POST http://localhost:3000/api/ai/ask \
 *   -H "Content-Type: application/json" \
 *   -d '{"prompt": "What is the price of ethereum in USD and EUR?"}'
 */
router.post('/ask', (req, res, next) => aiController.askAiAgent(req, res, next));

export default router;
