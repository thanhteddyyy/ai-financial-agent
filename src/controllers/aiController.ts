import { Request, Response, NextFunction } from 'express';
import geminiService from '../services/geminiServices';
import { ApiResponse } from '../types/crypto';

interface AskAiRequest extends Request {
  body: {
    prompt?: string;
    sessionId?: string;
  };
}

class AiController {
  /**
   * POST /api/ai/ask
   * Send a prompt to the AI agent and get a response
   * The AI agent can use tools like getCryptoPrice to answer questions
   */
  async askAiAgent(
    req: AskAiRequest,
    res: Response<ApiResponse<{ response: string; toolsUsed?: string[] }>>,
    next: NextFunction
  ): Promise<void> {
    try {
      const { prompt, sessionId } = req.body;

      if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        res.status(400).json({
          status: 'error',
          message: 'A valid "prompt" string is required in request body',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await geminiService.askAiAgent(prompt, sessionId);

      if (result.status === 'error') {
        res.status(500).json({
          status: 'error',
          message: result.response,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: {
          response: result.response,
          toolsUsed: result.toolsUsed,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AiController();
