import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { withTimeout, isTimeoutError } from '@/lib/apiTimeout';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/lib/middleware/rateLimit';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

// Rate limit: 30 requests per minute
const chatRateLimit = rateLimit({
  maxRequests: 30,
  windowMs: 60 * 1000,
});

interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  message: string;
  chatHistory?: unknown;
}

const isChatHistoryEntry = (value: unknown): value is ChatHistoryEntry => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const { role, content } = candidate;

  const hasValidRole = role === 'user' || role === 'assistant';
  const hasValidContent = typeof content === 'string';

  return hasValidRole && hasValidContent;
};

const isChatRequestBody = (value: unknown): value is ChatRequestBody => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.message === 'string';
};

export async function POST(request: NextRequest) {
  // Check rate limit first
  const rateLimitResponse = chatRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = (await withTimeout(
      request.json(),
      5000, // 5 second timeout for parsing request
      'Request body parsing timeout'
    )) as unknown;

    if (!isChatRequestBody(body)) {
      return Response.json(
        {
          error: 'Invalid request payload',
          success: false,
        },
        { status: 400 }
      );
    }

    const { message } = body;
    const rawHistory = Array.isArray(body.chatHistory) ? body.chatHistory : [];

    // Use Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Convert chat history to Gemini format
    const history = rawHistory
      .filter(isChatHistoryEntry)
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    // Start chat with history
    const chat = model.startChat({
      history: history
    });

    // Send message and get response with timeout
    const result = await withTimeout(
      chat.sendMessage(message),
      30000, // 30 second timeout for Gemini API
      'AI response timeout'
    );
    const response = await result.response;
    
    return Response.json({ 
      response: response.text(),
      success: true 
    });
    
  } catch (error) {
    if (isTimeoutError(error)) {
      logger.warn('Chat API timeout', { error });
      return Response.json(
        {
          error: 'Request timeout. Please try again.',
          success: false
        },
        { status: 504 } // Gateway Timeout
      );
    }

    logger.error('Error in chat API', { error });
    return Response.json({
      error: 'Failed to generate response',
      success: false
    }, { status: 500 });
  }
}
