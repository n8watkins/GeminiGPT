# Prompting System Deep Dive Analysis

## Current Issue

**User Query**: "who is elon musk"
**Expected Response**: General knowledge about Elon Musk
**Actual Response**: "Based on our previous conversations, I do not have any information about who Elon Musk is."

**Problem**: System is over-prioritizing chat history search and refusing to provide general knowledge.

---

## Architecture Overview

### Flow Diagram
```
User Message
    ↓
shouldTriggerChatHistorySearch() [Lines 72-115]
    ↓ (if true)
searchChatHistory() via pre-processing [Lines 326-355]
    ↓
Add context to history (if found) [Lines 333-351]
    ↓
Build finalHistory with system prompt [Lines 358-369]
    ↓
Send to Gemini API
```

---

## Issue #1: Overly Aggressive Pattern Matching

### Current Patterns (Lines 76-98)
```javascript
const searchPatterns = [
  /what (does|is) (.+) (do|work|do for a living)/,
  /who is (.+)/,  // ⚠️ THIS MATCHES "who is elon musk"
  /tell me about (.+)/,
  /what kind of work does (.+) do/,
  /what does (.+) do/,
  /what (is|are) (.+)/,  // ⚠️ TOO BROAD
  /how (does|do) (.+) work/,
  /explain (.+)/,
  // ... more patterns
];
```

**Problem**:
- Pattern `/who is (.+)/` matches BOTH personal questions ("who is my friend John") AND general knowledge ("who is elon musk")
- Pattern `/what (is|are) (.+)/` is WAY too broad - matches "what is photosynthesis", "what is the capital of France", etc.
- No distinction between personal/contextual questions vs. general knowledge

**Impact**:
- Triggers chat history search for general knowledge questions
- When search returns no results, Gemini gets confused

---

## Issue #2: Ambiguous System Prompt

### Current System Prompt (Lines 360-361)
```javascript
'1. When provided with information from "previous conversations", you MUST prioritize and use that information in your answer'
'4. Only provide general knowledge if NO previous conversation context is provided'
```

**Problem**:
- Unclear what "NO previous conversation context is provided" means
- When chat history search is triggered but finds nothing, Gemini interprets this as "I should say I don't have context" rather than "I should use general knowledge"
- The prompt doesn't handle the case where search was attempted but found nothing

**What Gemini sees when search finds nothing**:
1. System prompt says "prioritize previous conversations"
2. No context is added to history
3. Gemini thinks: "I should mention I don't have previous conversation context"
4. Result: Refuses to answer with general knowledge

---

## Issue #3: No Fallback Logic

### Current Pre-Search Logic (Lines 328-355)
```javascript
chatHistoryResult = await searchChatHistory(userId, message);
if (chatHistoryResult && !chatHistoryResult.includes("couldn't find any relevant past conversations")) {
  // Add context
  historyWithContext = [...context messages...]
}
// ⚠️ ELSE: No explicit instruction to Gemini to use general knowledge
```

**Problem**:
- If search returns "couldn't find relevant conversations", `historyWithContext` stays empty
- No explicit message added to tell Gemini "Search found nothing, please use general knowledge"
- Gemini is left guessing what to do

---

## Issue #4: Personal Keywords Too Broad

### Current Keywords (Lines 108-112)
```javascript
const personalKeywords = [
  'resume', 'cv', 'document', 'file', 'uploaded', 'mentioned', 'discussed',
  'previously', 'before', 'earlier', 'my', 'your', 'personal', 'favorite',
  'prefer', 'like', 'love', 'hate', 'dislike'
];
```

**Problems**:
- "like" is too common: "What does Elon Musk like to do?" → triggers search (but it's general knowledge)
- "before" is too broad: "Has this been done before in history?" → triggers search
- "my" catches everything: "What is my IP address?" (general tech question) vs "What is my favorite color?" (personal)

---

## Root Cause Analysis

### The Flow for "who is elon musk":

1. ✅ Message received: "who is elon musk"
2. ✅ `shouldTriggerChatHistorySearch()` → TRUE (matches `/who is (.+)/`)
3. ✅ `searchChatHistory(userId, "who is elon musk")` called
4. ✅ Returns: "I couldn't find any relevant past conversations about elon musk"
5. ❌ Condition fails: `!chatHistoryResult.includes("couldn't find")`
6. ❌ No context added (historyWithContext = [])
7. ❌ System prompt still says "prioritize previous conversations"
8. ❌ Gemini sees: "I should prioritize previous conversations, but I don't have any"
9. ❌ Response: "Based on our previous conversations, I do not have any information..."

**The Core Problem**: Gemini is being asked to prioritize something that doesn't exist, with no clear instruction on what to do when search returns nothing.

---

## Additional Issues Found

### Issue #5: Redundant Manual Function Detection
Lines 366-395 have manual function detection that duplicates the tool system. This could cause confusion.

### Issue #6: Empty Response Fallback
Lines 423-464 have complex fallback logic for empty responses. This suggests the prompting might be causing Gemini to return empty responses sometimes.

---

## Proposed Solutions

### Solution 1: Smarter Pattern Matching
Only trigger chat history search for ACTUALLY personal questions:
- "who is [person I know]" → search
- "who is [famous person]" → general knowledge
- Requires: Named entity recognition OR more specific patterns

### Solution 2: Explicit "No Results" Handling
When search returns nothing, add explicit instruction:
```javascript
if (searchReturnsNothing) {
  historyWithContext = [{
    role: 'user',
    parts: [{ text: 'No relevant chat history found. Please answer using your general knowledge.' }]
  }];
}
```

### Solution 3: Clearer System Prompt
```javascript
'1. IF you receive information from previous conversations, use it to answer
2. IF chat history was searched but nothing was found, answer using general knowledge
3. IF no chat history search was triggered, answer using general knowledge
4. NEVER say "I don\'t have information" for general knowledge questions'
```

### Solution 4: Reduce False Positives
- Remove overly broad patterns like `/what (is|are) (.+)/`
- Only trigger on clearly personal questions
- Use negative patterns: Don't trigger if question contains famous people, places, concepts

### Solution 5: Two-Tier Search Strategy
1. Quick check: Is this a personal question? (my/your/I/we/us)
2. If unclear: Don't search, let Gemini use general knowledge
3. Only search if CLEARLY personal

---

## Recommended Fix Priority

1. **HIGH PRIORITY**: Fix system prompt to handle "no results" case explicitly
2. **HIGH PRIORITY**: Add explicit instruction when search finds nothing
3. **MEDIUM PRIORITY**: Remove overly broad patterns (`/what (is|are) (.+)/`)
4. **MEDIUM PRIORITY**: Make `/who is (.+)/` more specific (exclude famous people)
5. **LOW PRIORITY**: Refine personal keywords list

---

## Testing Plan

After fixes, test these queries:
- [ ] "who is elon musk" → Should return general knowledge
- [ ] "who is my best friend" → Should search chat history, fallback to "I don't know your best friend"
- [ ] "what is photosynthesis" → Should return general knowledge
- [ ] "what is my favorite color" → Should search chat history
- [ ] "tell me about Python programming" → Should return general knowledge
- [ ] "tell me about the document I uploaded" → Should search chat history
- [ ] "what does my resume say about my experience" → Should search chat history
- [ ] "what does NASA do" → Should return general knowledge

---

## Next Steps

1. ✅ Document analysis complete
2. ✅ **FIX #2 COMPLETE**: Implement system prompt fix (Lines 378-386)
3. ✅ **FIX #1 COMPLETE**: Add "no results" handling (Lines 358-371)
4. ✅ **FIX #3 COMPLETE**: Refine search patterns (Lines 72-122)
5. ⏳ Test with example queries

---

## Fix #1 Implementation Details

**Location**: `websocket-server.js` lines 358-371

**What was added**:
```javascript
} else {
  // Search was attempted but found nothing - explicitly tell Gemini to use general knowledge
  console.log('⚠️ Chat history search found no results - will use general knowledge');
  historyWithContext = [
    {
      role: 'user',
      parts: [{ text: 'Note: I searched for relevant information in our previous conversations but found nothing. Please answer this question using your general knowledge.' }]
    },
    {
      role: 'model',
      parts: [{ text: 'Understood! Since no relevant previous conversation history was found, I will answer using my general knowledge.' }]
    }
  ];
}
```

**Impact**:
- When search returns "couldn't find relevant conversations", Gemini now gets EXPLICIT instruction to use general knowledge
- Prevents "Based on our previous conversations, I don't have information" responses
- Maintains context awareness while allowing general knowledge fallback

---

## Fix #2 Implementation Details

**Location**: `websocket-server.js` lines 378-386

**What was changed**:

**BEFORE**:
```javascript
'1. When provided with information from "previous conversations", you MUST prioritize and use that information in your answer'
'4. Only provide general knowledge if NO previous conversation context is provided'
```

**AFTER**:
```javascript
'1. IF you receive context from previous conversations, use that information to answer
2. IF you are told that chat history was searched but nothing was found, answer using your general knowledge
3. IF no chat history search was mentioned, answer using your general knowledge
4. NEVER say "I don\'t have information from previous conversations" for general knowledge questions'
```

**Impact**:
- Clearer three-way logic: context found → use it, search found nothing → use general knowledge, no search → use general knowledge
- Explicit prohibition against refusing general knowledge questions
- More conversational and less rigid tone
- Better alignment with actual system behavior

---

## Fix #3 Implementation Details

**Location**: `websocket-server.js` lines 72-122

**What was removed** (overly broad patterns):
```javascript
/who is (.+)/,                    // ❌ Matched "who is elon musk"
/tell me about (.+)/,             // ❌ Matched "tell me about Python"
/what (is|are) (.+)/,             // ❌ Matched "what is photosynthesis"
/how (does|do) (.+) work/,        // ❌ Matched "how does gravity work"
/explain (.+)/,                   // ❌ Matched "explain quantum physics"
```

**What was added** (personal-only patterns):
```javascript
// Explicit personal questions (with "my", "I", "we", "our")
/what (is|are) my (.+)/,          // ✅ "what is my favorite color"
/what did i (.+)/,                // ✅ "what did I say about X"
/do i (.+)/,                      // ✅ "do I like X"

// Questions about uploaded/discussed content
/what (did|does) (the|my) (document|file|resume|cv) (.+)/,
/what (is|was) in (the|my) (document|file|resume|cv)/,

// Questions explicitly referencing previous conversations
/what did (we|you and i) (discuss|talk about)/,
```

**Keywords refined**:
- ❌ Removed: 'like', 'before', 'earlier', 'my', 'your' (too broad)
- ✅ Kept: 'uploaded', 'my resume', 'my document', 'discussed with you'
- ✅ Made more specific: 'my favorite', 'my preference' (instead of just 'favorite')

**Impact**:
- "who is elon musk" → NO search (uses general knowledge)
- "what is my favorite color" → SEARCH (personal question)
- "what is photosynthesis" → NO search (uses general knowledge)
- "what did I upload" → SEARCH (personal content)
- "tell me about Python" → NO search (general knowledge)
- "tell me about my resume" → SEARCH (personal document)
