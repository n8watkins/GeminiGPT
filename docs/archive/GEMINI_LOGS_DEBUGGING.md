# Gemini Logs Debugging

## Issues Identified

### Issue 1: Infinite Loop
**Status**: 🔴 CRITICAL
**Observed**: API being called repeatedly in a loop
```
GET /api/gemini-logs?chatId=9cdfe94f-70e9-4ed2-b148-3f67ae9f4961&userId=%5Bobject+Object%5D&limit=50
```

### Issue 2: userId is `[object Object]`
**Status**: 🔴 CRITICAL
**Observed**: `userId: '[object Object]'` in API logs
**Expected**: `userId: 'USER-XXXXXXXX-XXXX-XXXX-XXXX'`

**Root Cause**: `useUserId()` hook is returning an object instead of a string, causing:
1. Object reference changes on every render
2. useCallback dependencies change
3. fetchLogs is recreated
4. useEffect triggers
5. INFINITE LOOP

### Issue 3: No Logs in Database
**Status**: ⚠️ WARNING
**Observed**: `Raw logs from DB: 0`
**Possible Causes**:
- Logs not being created when messages are sent
- Wrong chatId being queried
- Logs created with different userId

## Debugging Steps

### Step 1: Check useUserId Hook
**File**: `src/hooks/useUserId.ts`
**Action**: Verify what this hook returns

### Step 2: Fix userId Type Issue
**Action**: Ensure useUserId returns a string, not an object

### Step 3: Fix Infinite Loop
**Action**: Prevent object reference changes in dependencies

### Step 4: Verify Log Creation
**Action**: Check if GeminiLogger is actually creating logs when messages are sent

## Test Plan

1. ✅ Add logging to trace data flow
2. ✅ Check useUserId return type
3. ✅ Fix userId serialization
4. ✅ Prevent infinite loop
5. ⏳ **READY TO TEST** - Send test message and verify log creation
6. ⏳ Verify logs display in UI

## Next Steps

### Test the Fix
1. Refresh the page to load the updated code
2. Open browser console (F12)
3. Open Gemini Logs panel
4. Verify NO infinite loop (should only see 1-2 requests max)
5. Check console logs for userId value (should be `USER-XXXX...`)
6. Send a test message in the chat
7. Refresh Gemini Logs panel
8. Check if logs appear

### Expected Behavior After Fix
- ✅ No infinite loop when opening Gemini Logs
- ✅ userId in API request should be `USER-XXXXXXXX-XXXX...`
- ✅ Console should show `[GeminiLogs] Fetching logs with: { userId: 'USER-...', ... }`
- ✅ API should respond with logs array (may be empty if no messages sent yet)

### If No Logs Appear After Sending Message
This indicates a separate issue:
- Logs may not be created by websocket server
- Different database file being used
- userId mismatch between websocket and API

## Fixes Applied

### Fix 1: Destructure userId from useUserId hook
**File**: `src/components/GeminiLogs.tsx:50`
**Before**: `const userId = useUserId();`
**After**: `const { userId } = useUserId();`
**Reason**: useUserId() returns an object `{ userId, isLoading, isAuthenticated, isAnonymous }`, not a string

**Impact**:
- ✅ Fixes `userId: '[object Object]'` issue
- ✅ Prevents infinite loop (primitive string doesn't change reference)
- ✅ Allows proper URL parameter serialization
