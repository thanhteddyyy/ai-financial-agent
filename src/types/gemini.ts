/**
 * Response từ Gemini API khi có tool call
 */
export interface GeminiToolUse {
  toolName: string;
  toolUseId: string;
  args: Record<string, unknown>;
}

/**
 * Response cho AI agent
 */
export interface AiAgentResponse {
  status: 'success' | 'error';
  response: string;
  toolsUsed?: string[];
  timestamp: string;
}

/**
 * Tool function response
 */
export interface ToolFunctionResult {
  id: string;
  result: unknown;
}

/**
 * Gemini function declaration schema
 */
export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}
