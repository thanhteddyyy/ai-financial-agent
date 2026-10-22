import { GoogleGenAI } from '@google/genai';
import { Langfuse } from 'langfuse';
import cryptoService from './cryptoService';
import { AiAgentResponse } from '../types/gemini';
import { currencyService } from './currencyService';
import stockService from './stockService';
interface MessagePart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

interface Message {
  role: 'user' | 'model';
  parts: MessagePart[];
}

class GeminiService {
  private ai: GoogleGenAI | null = null;
  private langfuse: Langfuse | null = null;
  private model: string = 'gemini-2.5-flash';

  private sessions = new Map <string, Message[]>();

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

  private initializeLangfuse(): void {
    if (this.langfuse !== null) return;

    const secretKey = process.env.LANGFUSE_SECRET_KEY;
    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const host = process.env.LANGFUSE_HOST;

    if (!secretKey || !publicKey) {
      console.warn(
        '⚠️  Langfuse keys not set. Observability features will be disabled. ' +
        'Set LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, and LANGFUSE_HOST in .env'
      );
      return;
    }

    this.langfuse = new Langfuse({
      secretKey,
      publicKey,
      baseUrl: host || 'https://jp.cloud.langfuse.com',
    });
    console.log(`✓ Langfuse initialized successfully (${host || 'https://jp.cloud.langfuse.com'})`);
  }

  /**
   * Define the getCryptoPrice tool for Gemini
   */
  private getGetCryptoPriceTool() {
    return {
      name: 'getCryptoPrice',
      description: 'Fetches the current price of a cryptocurrency in multiple currencies (USD, EUR, GBP)',
      parameters: {
        type: 'OBJECT',
        properties: {
          cryptoId: {
            type: 'STRING',
            description: 'The cryptocurrency ID in lowercase (e.g., "bitcoin", "ethereum", "cardano")',
          },
        },
        required: ['cryptoId'],
      },
    };
  }

  /**
   * Define the convertCurrency tool for Gemini
   */
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
  // Khai báo Tool tra cứu Chứng khoán
  private getGetStockPriceTool() {
    return {
      name: 'getStockPrice',
      description: 'Tra cứu giá hiện tại và mức độ biến động của một mã cổ phiếu (chứng khoán Mỹ).',
      parameters: {
        type: 'OBJECT',
        properties: {
          symbol: {
            type: 'STRING',
            description: 'Mã Ticker của cổ phiếu (Ví dụ: AAPL cho Apple, TSLA cho Tesla, MSFT cho Microsoft, GOOGL cho Google).',
          },
        },
        required: ['symbol'],
      },
    };
  }
  // ham GetMarketNewsTool
  private getGetMarketNewsTool() {
    return {
      name: 'getMarketNews',
      description: 'Lấy 3 tin tức tài chính và thị trường mới nhất.',
      parameters: {
        type: 'OBJECT',
        properties: {
          category: {
            type: 'STRING',
            description: 'Danh mục tin tức. Các giá trị hợp lệ: "general" (chung), "forex" (ngoại hối), "crypto" (tiền điện tử). Mặc định là "general".',
          },
        },
      },
    };
  }
  // Hàm chạy Tool
  private async executeStockTool(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const symbol = args.symbol as string;
    if (!symbol || typeof symbol !== 'string') {
      return { error: 'Invalid stock symbol provided' };
    }
    try {
      const stockData = await stockService.getStockPrice(symbol);
      console.log(`[Tool Result - ${symbol}]:`, stockData);
      return { result: stockData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { error: errorMessage };
    }
  }
  private async executeNewsTool(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const category = (args.category as string) || 'general';
    try {
      const newsData = await stockService.getMarketNews(category);
      return { result: newsData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { error: errorMessage };
    }
  }
  /**
   * Execute the getCryptoPrice tool with given arguments
   */
  private async executeCryptoTool(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    const cryptoId = args.cryptoId as string;

    if (!cryptoId || typeof cryptoId !== 'string') {
      return { error: 'Invalid crypto ID provided' };
    }

    try {
      const priceData = await cryptoService.getCryptoPrice(cryptoId);
      return { result: priceData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { error: errorMessage };
    }
  }

  /**
   * Main function to interact with Gemini using the ReAct pattern
   * Handles tool calls automatically and returns the final response
   */
  async askAiAgent(userPrompt: string, sessionId: string = 'default'): Promise<AiAgentResponse> {
    // Khởi tạo dependencies
    this.initializeAi();
    this.initializeLangfuse();

    // Khởi tạo Trace ở ngoài khối try để bắt được cả trạng thái lỗi trong catch
    const trace = this.langfuse?.trace({
      name: 'Financial_ReAct_Agent',
      input: userPrompt,
      sessionId: sessionId,
    });

    try {
      const toolDefinitions = [
        this.getGetCryptoPriceTool(),
        this.getConvertCurrencyTool(),
        this.getGetStockPriceTool(),
        this.getGetMarketNewsTool(),
      ];
      
      const messages: Message[] = this.sessions.get(sessionId) || [];
      
      // 3. Thêm câu hỏi mới của user vào mảng bối cảnh
      messages.push({
        role: 'user',
        parts: [{ text: userPrompt }],
      });

      const toolsUsed: string[] = [];
      let finalResponse = '';
      let iterationCount = 0;
      const maxIterations = 10;

      const requestConfig = {
        systemInstruction:
        'You are an AI Financial Agent. You have tools to check crypto prices (getCryptoPrice), convert currencies (convertCurrency), check stock prices (getStockPrice), and fetch market news (getMarketNews). ' +
          'When users ask about companies like Apple, Tesla, figure out their ticker symbol (AAPL, TSLA) and use getStockPrice. ' +
          'When users ask for general market updates, financial news, or why a market is crashing, use getMarketNews with appropriate category ("general" or "crypto"). ' +
          'If a user wants a price in VND, get the USD price first, then use convertCurrency, then output in Vietnamese. ' +
          'Summarize news briefly and provide insights in Vietnamese.', 
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

        // 1. Tạo Generation trên Langfuse để đo lường từng lượt gọi Gemini (Token & Latency)
        const generation = trace?.generation({
          name: `Gemini_ReAct_Step_${iterationCount}`,
          model: this.model,
          input: messages,
        });

        const response = await this.ai.models.generateContent({
          model: this.model,
          contents: messages,
          config: requestConfig,
        } as Parameters<typeof this.ai.models.generateContent>[0]);

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
          generation?.end({ output: 'No candidates returned' });
          break;
        }

        const candidate = candidates[0];
        const parts = candidate.content?.parts || [];

        console.log(`--- [Vòng ${iterationCount}] Candidate Parts ---`, parts);

        // Ghi nhận kết quả và lượng token tiêu thụ vào Langfuse Generation
        generation?.end({
          output: parts,
          usage: {
            input: response.usageMetadata?.promptTokenCount,
            output: response.usageMetadata?.candidatesTokenCount,
            total: response.usageMetadata?.totalTokenCount,
          },
        });

        if (parts.length === 0) {
          break;
        }

        const textParts: string[] = [];
        const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

        for (const part of parts) {
          const messagePart = part as MessagePart;
          if (messagePart.text) {
            textParts.push(messagePart.text);
          }
          if (messagePart.functionCall) {
            functionCalls.push({
              name: messagePart.functionCall.name,
              args: (messagePart.functionCall.args as Record<string, unknown>) || {},
            });
          }
        }

        // Trường hợp AI đã có câu trả lời cuối cùng và không gọi thêm tool nào nữa
        if (textParts.length > 0 && functionCalls.length === 0) {
          finalResponse = textParts.join('\n');
          break;
        }

        // Trường hợp AI yêu cầu gọi Tool
        if (functionCalls.length > 0) {
          console.log('---> AI yêu cầu gọi Tool:', functionCalls);

          // Lưu nguyên vẹn phản hồi của model (bao gồm cả thoughtSignature nếu có) vào lịch sử
          messages.push({
            role: 'model',
            parts: parts as MessagePart[],
          });

          const responseParts: MessagePart[] = [];

          for (const functionCall of functionCalls) {
            const { name, args } = functionCall;

            if (!toolsUsed.includes(name)) {
              toolsUsed.push(name);
            }

            // Bắt đầu đo Span thực thi Tool trên Langfuse
            const toolSpan = trace?.span({
              name: `Tool Execution: ${name}`,
              input: args,
            });

            let toolResultObj: Record<string, unknown>;

            if (name === 'getCryptoPrice') {
              toolResultObj = await this.executeCryptoTool(args);
            } else if (name === 'convertCurrency') {
              try {
                const amount = Number(args.amount);
                const from = String(args.from);
                const to = String(args.to);

                const result = await currencyService.convertCurrency(amount, from, to);
                toolResultObj = { result };
              } catch (err) {
                toolResultObj = { error: (err as Error).message };
              }
            }
            else if (name === 'getStockPrice') { // 👈 THÊM NHÁNH NÀY
              toolResultObj = await this.executeStockTool(args);
            }
            else if (name === 'getMarketNews'){
              toolResultObj = await this.executeNewsTool(args);
            }
            else {
              toolResultObj = { error: `Unknown tool: ${name}` };
            }

            // Kết thúc đo Span của Tool
            toolSpan?.end({
              output: toolResultObj,
            });

            // Đóng gói kết quả theo đúng chuẩn functionResponse của Gemini SDK
            responseParts.push({
              functionResponse: {
                name,
                response: toolResultObj,
              },
            });
          }

          // Đẩy toàn bộ kết quả thực thi tool vào lịch sử hội thoại cho vòng lặp tiếp theo
          messages.push({
            role: 'user',
            parts: responseParts,
          });
        } else {
          break;
        }
      }
      if (finalResponse) {
        messages.push({
          role: 'model',
          parts: [{ text: finalResponse }],
        });
      }

      // Lưu toàn bộ lịch sử hội thoại vào bộ nhớ Map theo sessionId
      this.sessions.set(sessionId, messages);

      // Cập nhật kết quả cuối cùng cho Trace và ép đẩy dữ liệu lên Langfuse Cloud ngay lập tức
      if (trace) {
        trace.update({ output: finalResponse || 'No response generated' });
        await this.langfuse?.flushAsync();
      }
      this.sessions.set(sessionId, messages); // luu lai lich su tro chuyen vao map
      return {
        status: 'success',
        response: finalResponse || 'No response generated',
        toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in askAiAgent:', errorMessage);

      if (trace) {
        trace.update({
          output: `Error: ${errorMessage}`,
          metadata: { status: 'error' },
        });
        await this.langfuse?.flushAsync();
      }

      return {
        status: 'error',
        response: `Error processing request: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default new GeminiService();