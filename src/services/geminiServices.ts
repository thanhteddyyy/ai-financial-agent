import { GoogleGenAI } from '@google/genai';
import cryptoService from './cryptoService';
import { AiAgentResponse } from '../types/gemini';
import { currencyService } from './currencyService';
interface MessagePart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
}

interface Message {
  role: 'user' | 'model';
  parts: MessagePart[];
}

class GeminiService {
  private ai: GoogleGenAI | null = null;
  private model: string = 'gemini-2.5-flash'; //lazy init

  private initializeAi(): void {
    if (this.ai !== null) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set in environment variables. ' +
        'Please check your .env file or set the environment variable.'
      );
    }
    console.log('✓ GEMINI_API_KEY loaded successfully');
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Define the getCryptoPrice tool for Gemini
   */
  private getGetCryptoPriceTool() {
    return {
      name: 'getCryptoPrice',
      description: 'Fetches the current price of a cryptocurrency in multiple currencies (USD, EUR, GBP)',
      parameters: {
        type: 'object',
        properties: {
          cryptoId: {
            type: 'string',
            description: 'The cryptocurrency ID (e.g., "bitcoin", "ethereum", "cardano")',
          },
        },
        required: ['cryptoId'],
      },
    };
  }
private getConvertCurrencyTool() {
  return {
    name: 'convertCurrency',
    description: 'Quy đổi một số tiền từ loại tiền tệ này sang loại tiền tệ khác (ví dụ: đổi từ USD sang VND, EUR sang USD, USD sang JPY).',
    parameters: {
      type: 'OBJECT',
      properties: {
        amount: {
          type: 'NUMBER',
          description: 'Số lượng tiền cần quy đổi.',
        },
        from: {
          type: 'STRING',
          description: 'Mã tiền tệ nguồn dạng 3 chữ cái viết hoa (ví dụ: USD, EUR).',
        },
        to: {
          type: 'STRING',
          description: 'Mã tiền tệ đích dạng 3 chữ cái viết hoa (ví dụ: VND, USD, JPY).',
        },
      },
      required: ['amount', 'from', 'to'],
    },
  };
}
  /**
   * Execute the getCryptoPrice tool with given arguments
   */
  private async executeCryptoTool(args: Record<string, unknown>): Promise<string> {
    const cryptoId = args.cryptoId as string;

    if (!cryptoId || typeof cryptoId !== 'string') {
      return JSON.stringify({
        error: 'Invalid crypto ID provided',
      });
    }

    try {
      const priceData = await cryptoService.getCryptoPrice(cryptoId);
      return JSON.stringify(priceData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return JSON.stringify({
        error: errorMessage,
      });
    }
  }

  /**
   * Main function to interact with Gemini using the ReAct pattern
   * Handles tool calls automatically and returns the final response
   */
  async askAiAgent(userPrompt: string): Promise<AiAgentResponse> {
    try {
      // Initialize AI on first use (lazy initialization)
      this.initializeAi();

      const toolDefinitions = [
        this.getGetCryptoPriceTool(),
        this.getConvertCurrencyTool(),
      ];

      const messages: Message[] = [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ];

      let toolsUsed: string[] = [];
      let finalResponse = '';
      let iterationCount = 0;
      const maxIterations = 10;

      const requestConfig = {
        systemInstruction: 'You are an AI Financial Agent. You have tools to check real-time crypto prices (getCryptoPrice) and convert currencies (convertCurrency). Always use these tools when users ask for real-time prices or currency conversions.',
        tools: [
          {
            functionDeclarations: toolDefinitions,
          },
        ],
        toolConfig: {
          functionCallingConfig: {
            mode: 'AUTO',
          },
        },
      };

      while (iterationCount < maxIterations) {
        iterationCount++;

        if (!this.ai) {
          throw new Error('AI service not initialized');
        }

        const response = await this.ai.models.generateContent({
          model: this.model,
          contents: messages,
          config: requestConfig,
        } as Parameters<typeof this.ai.models.generateContent>[0]);

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
          break;
        }

        const candidate = candidates[0];
        if (!candidate.content?.parts) {
          break;
        }

        console.log('--- Candidate Parts ---', candidate.content?.parts);

        const textParts: string[] = [];
        const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

        for (const part of candidate.content.parts) {
          const messagePart = part as MessagePart;
          if (messagePart.text) {
            textParts.push(messagePart.text);
          }
          if (messagePart.functionCall) {
            functionCalls.push({
              name: messagePart.functionCall.name,
              args: messagePart.functionCall.args as Record<string, unknown>,
            });
          }
        }

        if (functionCalls.length > 0) {
          console.log('---> AI yêu cầu gọi Tool:', functionCalls);
        }

        if (textParts.length > 0 && functionCalls.length === 0) {
          finalResponse = textParts.join('\n');
          break;
        }

        if (functionCalls.length > 0) {
          messages.push({
            role: 'model',
            parts: candidate.content.parts as MessagePart[],
          });

          for (const functionCall of functionCalls) {
            const { name, args } = functionCall;

            if (!toolsUsed.includes(name)) {
              toolsUsed.push(name);
            }

            let toolResult: string;

            if (name === 'getCryptoPrice') {
              toolResult = await this.executeCryptoTool(args);
            } else if (name === 'convertCurrency') {
              try {
                const amount = Number(args.amount);
                const from = String(args.from);
                const to = String(args.to);

                const result = await currencyService.convertCurrency(amount, from, to);
                toolResult = JSON.stringify(result);
              } catch (err) {
                toolResult = JSON.stringify({ error: (err as Error).message });
              }
            } else {
              toolResult = JSON.stringify({ error: `Unknown tool: ${name}` });
            }

            messages.push({
              role: 'user',
              parts: [
                {
                  text: `Tool "${name}" executed.\nInput: ${JSON.stringify(args)}\nResult: ${toolResult}`,
                },
              ],
            });
          }
        } else {
          break;
        }
      }

      return {
        status: 'success',
        response: finalResponse || 'No response generated',
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in askAiAgent:', errorMessage);

      return {
        status: 'error',
        response: `Error processing request: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default new GeminiService();
