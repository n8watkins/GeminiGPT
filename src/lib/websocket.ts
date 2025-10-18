import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export function setupWebSocketServer(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('send-message', async (data) => {
      try {
        const { message, chatHistory, chatId } = data;

        // Emit typing indicator
        socket.emit('typing', { chatId, isTyping: true });

        // Real Gemini 2.5 Flash integration
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        // Convert chat history to Gemini format
        const history = chatHistory.map((msg: { role: string; content: string }) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

        // Start chat with history
        const chat = model.startChat({
          history: history
        });

        // Send message and get streaming response
        const result = await chat.sendMessageStream(message);
        
        let fullResponse = '';
        
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;
          
          // Emit partial response
          socket.emit('message-response', {
            chatId,
            message: chunkText,
            isComplete: false,
            fullResponse: fullResponse
          });
        }
        
        // Emit completion
        socket.emit('message-response', {
          chatId,
          message: '',
          isComplete: true,
          fullResponse: fullResponse
        });
        
        socket.emit('typing', { chatId, isTyping: false });
        
      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', {
          chatId: data.chatId,
          error: 'Failed to generate response'
        });
        socket.emit('typing', { chatId: data.chatId, isTyping: false });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}
