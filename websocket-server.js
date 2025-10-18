const { Server: SocketIOServer } = require('socket.io');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getStockPrice, getWeather, getTime, getGeneralSearch, searchChatHistory } = require('./searchService');
// Import real implementations for production
const { addMessage, searchChats } = require('./vectorDB');
const { processDocumentAttachment } = require('./documentProcessor');

// 🆕 Import prompts module (V3 Architecture)
const { getFullPrompt, buildToolsArray } = require('./lib/websocket/prompts');

// 🆕 Import services (V3 Architecture)
const { RateLimiter } = require('./lib/websocket/services/RateLimiter');

/**
 * ============================================
 * RATE LIMITING
 * ============================================
 * Now handled by lib/websocket/services/RateLimiter.js
 * See that file for configuration and implementation details.
 */

// 🆕 V3 Architecture: Services extracted to lib/websocket/services/
const rateLimiter = new RateLimiter();
console.log('✅ Rate limiter initialized:', rateLimiter.getStats());

const { HistoryProcessor } = require('./lib/websocket/services/HistoryProcessor');
const historyProcessor = new HistoryProcessor();

/**
 * Create message objects for indexing
 */
function createMessageObjects(message, responseText) {
  const userMessage = {
    id: `user-${Date.now()}`,
    content: message,
    role: 'user',
    timestamp: new Date()
  };

  const assistantMessage = {
    id: `assistant-${Date.now()}`,
    content: responseText,
    role: 'assistant',
    timestamp: new Date()
  };

  return { userMessage, assistantMessage };
}

/**
 * Get chat title from history or generate default
 */
function getChatTitle(chatHistory) {
  return chatHistory.length > 0 ?
    (chatHistory[0].role === 'user' && chatHistory[0].parts && chatHistory[0].parts[0] ?
      chatHistory[0].parts[0].text.substring(0, 50) + '...' : 'Chat') :
    'New Chat';
}

/**
 * Index messages to vector database
 */
async function indexMessages(userId, chatId, userMessage, assistantMessage, chatTitle) {
  if (!userId) return;

  try {
    // Index both messages asynchronously
    await Promise.all([
      addMessage(userId, chatId, userMessage, chatTitle).catch(err =>
        console.error('Error indexing user message:', err)
      ),
      addMessage(userId, chatId, assistantMessage, chatTitle).catch(err =>
        console.error('Error indexing assistant message:', err)
      )
    ]);
  } catch (error) {
    console.error('Error in background indexing:', error);
  }
}

/**
 * Handle message indexing with chat title extraction
 */
async function indexMessagePair(userId, chatId, message, responseText, chatHistory) {
  const chatTitle = getChatTitle(chatHistory);
  const { userMessage, assistantMessage } = createMessageObjects(message, responseText);
  await indexMessages(userId, chatId, userMessage, assistantMessage, chatTitle);
}

// REMOVED: Pre-emptive pattern matching
// Now letting Gemini decide when to search chat history via function calling

console.log('Environment check:');
console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🆕 V3 Architecture: Function tools now defined in lib/websocket/prompts/functionTools.js
// To edit function descriptions, edit that file instead of this one!
const tools = buildToolsArray();
console.log(`✅ Loaded ${tools[0].function_declarations.length} function tools from prompts module`);

function setupWebSocketServer(server) {
  console.log('🚀 Setting up WebSocket server...');

  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 10 * 1024 * 1024, // 10MB limit for large documents
    pingTimeout: 60000, // 60 second timeout
    pingInterval: 25000, // Check connection every 25 seconds
    transports: ['websocket', 'polling']
  });

  console.log('✅ WebSocket server configured');

  io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id, 'Transport:', socket.conn.transport.name);

    // Handle connection errors
    socket.on('error', (error) => {
      console.error('❌ Socket error:', socket.id, error);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', socket.id, error);
    });

    socket.on('send-message', async (data) => {
      try {
        console.log('Received message:', {
          message: data.message?.substring(0, 100) + '...',
          chatId: data.chatId,
          hasAttachments: !!data.attachments?.length,
          userId: data.userId
        });

        const { message, chatHistory, chatId, attachments, userId } = data;

        // ============================================
        // RATE LIMITING CHECK
        // ============================================
        const rateLimit = rateLimiter.checkLimit(userId);

        // Send rate limit info to client (for UI display)
        socket.emit('rate-limit-info', {
          remaining: rateLimit.remaining,
          limit: rateLimit.limit,
          resetAt: rateLimit.resetAt
        });

        // If rate limited, reject the request
        if (!rateLimit.allowed) {
          const retryInSeconds = Math.ceil(rateLimit.retryAfter / 1000);
          const retryInMinutes = Math.ceil(retryInSeconds / 60);
          const limitTypeText = rateLimit.limitType === 'minute' ? 'minute' : 'hour';

          console.log(`🚫 Rate limit exceeded for user ${userId}. Retry after ${retryInSeconds}s`);

          // Calculate the exact time when they can send again (in their timezone)
          const resetTime = new Date(rateLimit.resetAt[rateLimit.limitType]);
          const resetTimeString = resetTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          // Create a friendly message without mentioning "rate limit"
          let waitMessage;
          if (retryInSeconds < 60) {
            waitMessage = `${retryInSeconds} seconds`;
          } else if (retryInMinutes < 60) {
            waitMessage = `${retryInMinutes} minute${retryInMinutes > 1 ? 's' : ''}`;
          } else {
            const hours = Math.ceil(retryInMinutes / 60);
            waitMessage = `${hours} hour${hours > 1 ? 's' : ''}`;
          }

          // Send friendly message to client
          socket.emit('message-response', {
            chatId,
            message: `### You've reached your message limit\n\nTo prevent abuse, there's a limit on how many messages you can send per ${limitTypeText}.\n\n**You can send more messages in ${waitMessage}** (at ${resetTimeString}).\n\n**Current usage:**\n- ${rateLimit.remaining.minute} of ${rateLimit.limit.minute} messages remaining this minute\n- ${rateLimit.remaining.hour} of ${rateLimit.limit.hour} messages remaining this hour\n\nThank you for your patience! 🙏`,
            isComplete: true,
            rateLimited: true
          });

          socket.emit('typing', { chatId, isTyping: false });
          return; // Stop processing
        }

        console.log(`✅ Rate limit check passed for user ${userId}. Remaining: ${rateLimit.remaining.minute}/min, ${rateLimit.remaining.hour}/hr`);
        
        // Debug: Log chat history details
        console.log('📝 Chat History Debug:');
        console.log('  - Chat ID:', chatId);
        console.log('  - History length:', chatHistory ? chatHistory.length : 'undefined');
        console.log('  - User ID:', userId);
        if (chatHistory && chatHistory.length > 0) {
          console.log('  - First message:', {
            role: chatHistory[0].role,
            content: chatHistory[0].content?.substring(0, 50) + '...',
            hasAttachments: !!chatHistory[0].attachments?.length
          });
          console.log('  - Last message:', {
            role: chatHistory[chatHistory.length - 1].role,
            content: chatHistory[chatHistory.length - 1].content?.substring(0, 50) + '...',
            hasAttachments: !!chatHistory[chatHistory.length - 1].attachments?.length
          });
        } else {
          console.log('  - No chat history provided!');
        }
        
        // Emit typing indicator
        socket.emit('typing', { chatId, isTyping: true });

        // Real Gemini 2.5 Flash integration with function calling
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash',
          tools: tools
        });
        
        // 🆕 V3 Architecture: History processing now handled by HistoryProcessor service
        // This converts chat history to Gemini format and adds system prompts
        const finalHistory = historyProcessor.processHistory(chatHistory);
        
        // Start chat with history and system prompt
        const chat = model.startChat({
          history: finalHistory
        });

        // Prepare message parts (text + images + PDFs)
        let enhancedMessage = message;
        const messageParts = [];
        
        // Process attachments
        if (attachments && attachments.length > 0) {
          console.log(`📎 Processing ${attachments.length} attachments`);
          for (const attachment of attachments) {
            try {
              console.log(`📎 Attachment details:`, {
                name: attachment.name,
                type: attachment.type,
                mimeType: attachment.mimeType,
                hasUrl: !!attachment.url,
                urlLength: attachment.url?.length
              });

              if (attachment.type === 'image' && attachment.url) {
                // Handle images
                const base64Data = attachment.url.split(',')[1];
                if (base64Data) {
                  const sizeInMB = (base64Data.length / (1024 * 1024)).toFixed(2);
                  console.log(`🖼️  Processing image: ${attachment.name}, size: ${sizeInMB}MB (${base64Data.length} chars)`);

                  // Check image size (limit to 10MB base64 to match document limit)
                  if (base64Data.length > 10 * 1024 * 1024) {
                    console.warn(`❌ Image too large: ${attachment.name} (${sizeInMB}MB), skipping`);
                    enhancedMessage += `\n\n**Image: ${attachment.name}**\n[Image too large to process - please use an image under 10MB]`;
                  } else {
                    console.log(`✅ Image accepted: ${attachment.name} (${sizeInMB}MB)`);
                    console.log(`📤 Adding image to message parts with mimeType: ${attachment.mimeType || 'image/jpeg'}`);
                    messageParts.push({
                      inlineData: {
                        mimeType: attachment.mimeType || 'image/jpeg',
                        data: base64Data
                      }
                    });
                    console.log(`✓ Image successfully added to messageParts. Total parts so far: ${messageParts.length}`);
                  }
                } else {
                  console.warn(`⚠️  No base64 data found for image: ${attachment.name}`);
                }
              } else if ((attachment.mimeType === 'application/pdf' || 
                         attachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                         attachment.mimeType === 'application/msword' ||
                         attachment.name?.toLowerCase().endsWith('.pdf') ||
                         attachment.name?.toLowerCase().endsWith('.docx') ||
                         attachment.name?.toLowerCase().endsWith('.doc')) && attachment.url) {
              // Handle PDFs and DOCX files - extract text content with timeout
              try {
                const base64Data = attachment.url.split(',')[1];
                console.log(`Document attachment details:`, {
                  name: attachment.name,
                  mimeType: attachment.mimeType,
                  urlPrefix: attachment.url?.substring(0, 50),
                  base64Length: base64Data?.length
                });
                
                if (base64Data) {
                  console.log(`Processing document: ${attachment.name}`);
                  
                  // Add timeout to document processing to prevent hanging
                  const documentProcessingPromise = processDocumentAttachment(base64Data, attachment.name, attachment.mimeType);
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Document processing timeout after 30 seconds')), 30000)
                  );
                  
                  const documentResult = await Promise.race([documentProcessingPromise, timeoutPromise]);
                  
                  if (documentResult.success) {
                    // Limit document text to prevent token overflow
                    const maxTextLength = 8000; // Reasonable limit for Gemini
                    const truncatedText = documentResult.extractedText.length > maxTextLength 
                      ? documentResult.extractedText.substring(0, maxTextLength) + '\n\n[Text truncated due to length]'
                      : documentResult.extractedText;
                    
                    // Add document text content to the message
                    const docType = attachment.mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
                    enhancedMessage += `\n\n**${docType} Document: ${attachment.name}**\n${truncatedText}`;
                    console.log(`Document processed successfully: ${documentResult.textLength} characters extracted (${truncatedText.length} sent)`);
                  } else {
                    const docType = attachment.mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
                    enhancedMessage += `\n\n**${docType} Document: ${attachment.name}**\n[Error processing document: ${documentResult.error}]`;
                    console.log(`Document processing failed: ${documentResult.error}`);
                  }
                }
              } catch (error) {
                console.error('Error processing document:', error);
                console.error('Document error details:', {
                  fileName: attachment.name,
                  mimeType: attachment.mimeType,
                  urlLength: attachment.url?.length,
                  errorMessage: error.message,
                  errorStack: error.stack
                });
                const docType = attachment.mimeType === 'application/pdf' ? 'PDF' : 'DOCX';
                enhancedMessage += `\n\n**${docType} Document: ${attachment.name}**\n[Error processing document: ${error.message}]`;
              }
            } else if (attachment.type === 'file' && attachment.url) {
              // Handle other text files
              try {
                const base64Data = attachment.url.split(',')[1];
                if (base64Data) {
                  const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
                  enhancedMessage += `\n\n**File: ${attachment.name}**\n${textContent}`;
                  console.log(`Text file processed: ${attachment.name}`);
                }
              } catch (error) {
                console.error('Error processing text file:', error);
                enhancedMessage += `\n\n**File: ${attachment.name}**\n[Error processing file: ${error.message}]`;
              }
            }
            } catch (attachmentError) {
              console.error('Error processing attachment:', attachmentError);
              enhancedMessage += `\n\n**Attachment Error: ${attachment.name}**\n[Error: ${attachmentError.message}]`;
            }
          }
        }
        
        // Add the enhanced message (with any file content) as text
        messageParts.push({ text: enhancedMessage });

        console.log(`📨 Sending to Gemini with ${messageParts.length} parts:`);
        messageParts.forEach((part, index) => {
          if (part.text) {
            console.log(`  Part ${index}: text (${part.text.length} chars)`);
          } else if (part.inlineData) {
            console.log(`  Part ${index}: ${part.inlineData.mimeType} (${part.inlineData.data.length} chars)`);
          }
        });

        // Send message and get response
        console.log('🚀 Calling Gemini API...');

        // Emit debug info for request
        socket.emit('debug-info', {
          type: 'request',
          timestamp: new Date().toISOString(),
          chatId,
          message: enhancedMessage,
          historyLength: finalHistory.length,
          parts: messageParts.map(part => part.text ? 'text' : part.inlineData ? part.inlineData.mimeType : 'unknown')
        });

        // Use streaming API for better UX
        const result = await chat.sendMessageStream(messageParts);

        let fullResponse = '';
        let hasFunctionCalls = false;
        let functionCalls = [];

        console.log('✅ Streaming response from Gemini...');

        // Stream the response chunks
        for await (const chunk of result.stream) {
          // Check for prompt feedback (safety/content filtering issues)
          if (chunk.promptFeedback) {
            console.log('📋 Prompt Feedback:', JSON.stringify(chunk.promptFeedback, null, 2));
            if (chunk.promptFeedback.blockReason) {
              console.error('🚫 Content blocked by safety filter:', chunk.promptFeedback.blockReason);
              socket.emit('message-response', {
                chatId,
                message: `Sorry, I cannot respond to this request due to content safety filters. Block reason: ${chunk.promptFeedback.blockReason}`,
                isComplete: true
              });
              socket.emit('typing', { chatId, isTyping: false });
              return;
            }
          }

          // Check for safety ratings in candidates
          if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].safetyRatings) {
            console.log('🛡️ Safety Ratings:', chunk.candidates[0].safetyRatings);
          }

          // Check if response was blocked
          if (chunk.candidates && chunk.candidates[0] && chunk.candidates[0].finishReason === 'SAFETY') {
            console.error('🚫 Response blocked due to safety concerns');
            socket.emit('message-response', {
              chatId,
              message: 'Sorry, I cannot provide a response due to content safety filters.',
              isComplete: true
            });
            socket.emit('typing', { chatId, isTyping: false });
            return;
          }

          const chunkText = chunk.text();
          console.log('📨 Chunk received, length:', chunkText?.length || 0);

          // Check for function calls in this chunk
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
            hasFunctionCalls = true;
            functionCalls = chunk.functionCalls;
            console.log('Function calls detected:', functionCalls);
            break; // Stop streaming if function calls are needed
          }

          if (chunkText) {
            fullResponse += chunkText;

            // Send streaming chunk to client
            socket.emit('message-response', {
              chatId,
              message: chunkText,
              isComplete: false
            });
          }
        }

        // Check if the response contains function calls
        if (hasFunctionCalls && functionCalls.length > 0) {
          let functionResponse = '';

          // Process each function call
          for (const functionCall of functionCalls) {
            const functionName = functionCall.name;
            const functionArgs = functionCall.args;

            console.log(`Calling function: ${functionName} with args:`, functionArgs);

            let functionResult = '';

            try {
              switch (functionName) {
                case 'get_stock_price':
                  functionResult = await getStockPrice(functionArgs.symbol);
                  break;
                case 'get_weather':
                  functionResult = await getWeather(functionArgs.location);
                  break;
                case 'get_time':
                  functionResult = await getTime(functionArgs.location);
                  break;
                case 'search_web':
                  functionResult = await getGeneralSearch(functionArgs.query);
                  break;
                case 'search_chat_history':
                  functionResult = await searchChatHistory(userId, functionArgs.query);
                  break;
                default:
                  functionResult = `Unknown function: ${functionName}`;
              }

              // Send function result back to Gemini with streaming
              const followUpResult = await chat.sendMessageStream([
                {
                  functionResponse: {
                    name: functionName,
                    response: { result: functionResult }
                  }
                }
              ]);

              // Stream the follow-up response
              for await (const chunk of followUpResult.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                  functionResponse += chunkText;

                  // Send streaming chunk to client
                  socket.emit('message-response', {
                    chatId,
                    message: chunkText,
                    isComplete: false
                  });
                }
              }

            } catch (error) {
              console.error(`Error executing function ${functionName}:`, error);
              const errorMsg = `Error executing ${functionName}: ${error.message}`;
              functionResponse += errorMsg;

              socket.emit('message-response', {
                chatId,
                message: errorMsg,
                isComplete: false
              });
            }
          }

          // Emit debug info for response
          socket.emit('debug-info', {
            type: 'response',
            timestamp: new Date().toISOString(),
            chatId,
            response: functionResponse,
            hadFunctionCalls: true,
            functionNames: functionCalls.map(fc => fc.name)
          });

          // Send completion signal
          socket.emit('message-response', {
            chatId,
            message: '',
            isComplete: true
          });

          // Index the messages
          await indexMessagePair(userId, chatId, message, functionResponse, chatHistory);
          
        } else {
          // No function calls - streaming already completed
          // fullResponse contains the complete streamed text

          console.log('Gemini streamed response complete');
          console.log('Response text length:', fullResponse.length);

          // Check if response is empty (potential issue)
          if (fullResponse.length === 0) {
            console.error('🚨 CRITICAL: Gemini returned empty response!');
            console.error('This could be due to:');
            console.error('  1. Content safety filters blocking the response');
            console.error('  2. API quota/rate limits');
            console.error('  3. Model refusing to generate content for this prompt');
            console.error('Original message:', message);
            console.error('Chat history length:', chatHistory?.length || 0);

            // Send helpful error message to user
            socket.emit('message-response', {
              chatId,
              message: 'I apologize, but I was unable to generate a response. This could be due to content safety filters or the nature of the request. Could you please rephrase your question?',
              isComplete: true
            });

            socket.emit('typing', { chatId, isTyping: false });
            return;
          }

          // CRITICAL: Check if response contains [object Object] placeholder
          if (fullResponse.includes('[object Object]')) {
            console.error('🚨 CRITICAL: Gemini response contains [object Object] placeholder!');
            console.error('Full response:', fullResponse);
          }

          // Emit debug info for response
          socket.emit('debug-info', {
            type: 'response',
            timestamp: new Date().toISOString(),
            chatId,
            response: fullResponse,
            hadFunctionCalls: false,
            wasStreamed: true
          });

          // Send completion signal
          socket.emit('message-response', {
            chatId,
            message: '',
            isComplete: true
          });

          // Index the messages
          await indexMessagePair(userId, chatId, message, fullResponse, chatHistory);
        }
        
        socket.emit('typing', { chatId, isTyping: false });
        
      } catch (error) {
        console.error('Error processing message:', error);
        console.error('Error stack:', error.stack);
        console.error('Message data:', { 
          message: data.message?.substring(0, 100), 
          chatId: data.chatId, 
          hasAttachments: !!data.attachments?.length 
        });
        
        // Send error response to client
        socket.emit('message-response', {
          chatId: data.chatId,
          message: `Sorry, I encountered an error processing your message: ${error.message}. Please try again.`,
          isComplete: true
        });
        
        socket.emit('typing', { chatId: data.chatId, isTyping: false });
      }
    });

    socket.on('delete-chat', async (data) => {
      try {
        const { chatId, userId } = data;
        console.log(`Deleting chat ${chatId} for user ${userId} from vector database`);
        
        const { deleteChat } = require('./vectorDB');
        await deleteChat(userId, chatId);
        
        console.log(`Successfully deleted chat ${chatId} from vector database`);
      } catch (error) {
        console.error('Error deleting chat from vector database:', error);
      }
    });

    socket.on('reset-vector-db', async (data) => {
      try {
        const { userId } = data;
        console.log(`Resetting vector database for user ${userId}`);
        
        const { deleteUserChats } = require('./vectorDB');
        await deleteUserChats(userId);
        
        console.log(`Successfully reset vector database for user ${userId}`);
        socket.emit('vector-db-reset', { success: true });
      } catch (error) {
        console.error('Error resetting vector database:', error);
        socket.emit('vector-db-reset', { success: false, error: error.message });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
    });
  });

  console.log('✅ WebSocket event handlers registered');
  return io;
}

module.exports = { setupWebSocketServer };
