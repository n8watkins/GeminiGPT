import { Message } from '@/types/chat';

export async function generateResponse(messages: Message[]): Promise<string> {
  try {
    // ECHO MODE - Just echo back the user's message
    const currentMessage = messages[messages.length - 1];
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return `Echo: ${currentMessage.content}`;
    
    /* 
    // REAL GEMINI API (commented out for echo testing)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Convert messages to the format expected by Gemini
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const currentMessage = messages[messages.length - 1];
    
    const chat = model.startChat({
      history: history
    });

    const result = await chat.sendMessage(currentMessage.content);
    const response = await result.response;
    
    return response.text();
    */
  } catch (error) {
    console.error('Error generating response:', error);
    throw new Error('Failed to generate response');
  }
}
