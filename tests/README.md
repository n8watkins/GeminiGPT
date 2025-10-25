# Test Suite

## Gemini Response Tests

### Purpose

The `gemini-responses.test.js` test suite verifies that legitimate technical questions do not trigger false-positive safety filter blocks.

### Running Tests

```bash
# Set your API key
export GEMINI_API_KEY=your_key_here

# Run tests
node tests/gemini-responses.test.js
```

### What It Tests

The test suite sends 8 common programming questions to the Gemini API and verifies:

1. **No Empty Responses**: Response contains actual content
2. **No Safety Blocks**: Not blocked by content filters
3. **Relevant Content**: Response contains expected keywords
4. **Proper Error Handling**: Gracefully handles API errors

### Test Cases

- JavaScript async/await
- Python list comprehension
- React useState hook
- SQL JOIN types
- Git rebase vs merge
- CSS flexbox
- Algorithm complexity (Big O)
- RESTful API design

### Expected Output

```
╔════════════════════════════════════════════════════╗
║     Gemini Response False-Positive Test Suite     ║
╚════════════════════════════════════════════════════╝

Running 8 tests...

Testing: JavaScript async/await
Query: "Explain how async/await works in JavaScript"
✓ PASSED
  Response length: 142 chars
  Found keywords: async, await, promise
  Preview: Async/await is syntactic sugar built on top of Promises...

[... more tests ...]

╔════════════════════════════════════════════════════╗
║                   Test Summary                     ║
╚════════════════════════════════════════════════════╝

Total Tests: 8
Passed: 8
Failed: 0
Pass Rate: 100.0%

All tests passed!
```

### Debugging Failed Tests

If tests fail, check:

1. **API Key**: Ensure `GEMINI_API_KEY` is valid
2. **Rate Limits**: Tests include 1-second delays between requests
3. **API Quota**: Check your Google Cloud quota usage
4. **Network Issues**: Verify internet connectivity

### Adding New Test Cases

To add a new test case to `LEGITIMATE_QUERIES`:

```javascript
{
  name: 'Test Name',
  query: 'Your question here',
  expectedKeywords: ['keyword1', 'keyword2', 'keyword3']
}
```

The test will verify:
- Response is not empty
- No safety filter blocks
- At least one expected keyword is found

### Integration with CI/CD

To run tests in CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run Gemini Response Tests
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  run: node tests/gemini-responses.test.js
```

### Known Issues

**False Positives**: If you encounter false-positive safety blocks, check:

1. **Safety Settings**: Review `safetySettings` in `GeminiService.js`
2. **Model Version**: Ensure using latest model (`gemini-2.5-flash`)
3. **Context**: Check if chat history contains problematic content
4. **API Status**: Check Google Cloud Status Dashboard

### Related Files

- `/lib/websocket/services/GeminiService.js` - Main service handling Gemini API
- `/lib/websocket/prompts/systemPrompts.js` - System instructions sent to AI
- `/lib/logger.js` - Logging configuration
