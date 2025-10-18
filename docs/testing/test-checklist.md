# 🧪 Gemini Chat App Test Checklist

## ✅ Test Results Summary

### Manual Tests Completed
- ✅ **Stock Price Function**: Working (returns demo data when API keys not configured)
- ✅ **Weather Function**: Working (returns demo data when API keys not configured)  
- ✅ **General Search Function**: Working (returns demo data when API keys not configured)
- ✅ **Function Detection Keywords**: All 6 test queries correctly detected

### Function Detection Results
1. ✅ "What is the stock price of Tesla?" → **Stock Price**
2. ✅ "How is the weather in New York?" → **Weather**
3. ✅ "Search for renewable energy information" → **General Search**
4. ✅ "Tell me about the weather in California" → **Weather**
5. ✅ "What is the price of Microsoft stock?" → **Stock Price**
6. ✅ "Find information about space exploration" → **General Search**

## 🚀 Live Testing Instructions

### 1. Start the Server
```bash
npm run dev
```

### 2. Open the Application
- Navigate to: http://localhost:5000
- You should see the chat interface with sidebar

### 3. Test Basic Functionality
- ✅ **Create New Chat**: Click "New Chat" button
- ✅ **Send Messages**: Type and send messages
- ✅ **WebSocket Connection**: Check connection indicator (green dot)

### 4. Test Function Calling

#### Stock Price Tests
Try these messages:
- "What is the stock price of Apple?"
- "Tell me the current price of Tesla stock"
- "How much is Microsoft stock worth?"

**Expected**: Should trigger stock price function and return formatted stock information

#### Weather Tests  
Try these messages:
- "What is the weather in Oregon?"
- "How is the weather in New York?"
- "Tell me about the weather in California"

**Expected**: Should trigger weather function and return formatted weather information

#### Time Tests
Try these messages:
- "What time is it in New York?"
- "What time is it in London?"
- "Current time in Tokyo"
- "What time is it in California?"

**Expected**: Should trigger time function and return formatted time information

#### Search Tests
Try these messages:
- "Search for AI news"
- "Find information about renewable energy"
- "Look up space exploration"

**Expected**: Should trigger search function and return formatted search results

### 5. Test Echo Mode (if enabled)
- Send any message
- **Expected**: Should echo back your message with "Echo:" prefix

### 6. Test Multiple Chats
- Create multiple chats
- Switch between them
- **Expected**: Each chat should maintain its own history

## 🔧 Debugging

### Check Console Logs
Look for these debug messages in the terminal:
- `🔍 Detected stock price query: [query]`
- `🌤️ Detected weather query: [query]`  
- `🔍 Detected search query: [query]`
- `📊 Function call result: [result]`

### Check Browser Console
- Open Developer Tools (F12)
- Look for WebSocket connection messages
- Check for any JavaScript errors

## 🐛 Common Issues & Solutions

### Issue: "404 Not Found" for Gemini Model
**Solution**: The model name might be incorrect. Check `websocket-server.js` line 101:
```javascript
model: 'gemini-2.0-flash-exp'  // Should be correct
```

### Issue: Function calls not working
**Solution**: Check if `ECHO_MODE=false` in environment variables

### Issue: Search results not appearing
**Solution**: 
1. Verify Google Search API key is set
2. Check Search Engine ID is correct
3. Ensure Custom Search API is enabled

### Issue: WebSocket connection failed
**Solution**:
1. Check if port 5000 is available
2. Restart the server
3. Check firewall settings

## 📊 Performance Tests

### Response Time
- **Echo Mode**: Should respond within 1-2 seconds
- **Function Calls**: Should respond within 3-5 seconds
- **Gemini API**: Should respond within 5-10 seconds

### Memory Usage
- Monitor server memory usage
- Check for memory leaks in long conversations

## 🎯 Success Criteria

### ✅ All Tests Pass If:
1. Server starts without errors
2. WebSocket connection established
3. Messages can be sent and received
4. Function detection works for all 3 types
5. Multiple chats can be created and switched
6. Chat history persists between sessions
7. No JavaScript errors in browser console
8. No server errors in terminal

### 📈 Expected Behavior:
- **Stock queries** → Formatted stock information
- **Weather queries** → Formatted weather information  
- **Search queries** → Formatted search results
- **Other queries** → Gemini AI response
- **Echo mode** → Message echoed back

## 🔄 Next Steps After Testing

1. **If all tests pass**: The app is ready for production use
2. **If some tests fail**: Check the debugging section above
3. **For production**: Set up real API keys and disable echo mode
4. **For scaling**: Consider adding rate limiting and error handling

---

**Last Updated**: October 13, 2025  
**Test Environment**: Windows 10, Node.js, Next.js, Socket.IO
