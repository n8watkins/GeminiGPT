import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

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
  try {
    const body = (await request.json()) as unknown;

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

    // Send message and get response
    const result = await chat.sendMessage(message);
    const response = await result.response;
    
    return Response.json({ 
      response: response.text(),
      success: true 
    });
    
  } catch (error) {
    console.error('Error in chat API:', error);
    return Response.json({ 
      error: 'Failed to generate response',
      success: false 
    }, { status: 500 });
  }
}
