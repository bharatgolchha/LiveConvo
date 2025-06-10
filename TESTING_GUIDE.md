# Testing Guide for Refactored Conversation Page

## 🚀 Quick Start

### 1. Run All Tests
```bash
cd frontend
npm test
```

### 2. Run Tests in Watch Mode
```bash
cd frontend
npm run test:watch
```

### 3. Run Tests with Coverage
```bash
cd frontend
npm run test:coverage
```

## 🧪 Testing the Refactored Page

### Option 1: Use the Refactored Page Directly

1. **Backup the current page.tsx**:
   ```bash
   cd frontend/src/app/app
   cp page.tsx page.tsx.backup
   ```

2. **Replace with refactored version**:
   ```bash
   cp page.refactored.tsx page.tsx
   ```

3. **Start the development server**:
   ```bash
   cd frontend
   npm run dev
   ```

4. **Test the application**:
   - Navigate to http://localhost:3000/app
   - Test all conversation flows

### Option 2: Create a Test Route

1. **Create a new test page**:
   ```bash
   cd frontend/src/app
   mkdir app-refactored
   ```

2. **Copy the refactored page**:
   ```bash
   cp app/page.refactored.tsx app-refactored/page.tsx
   ```

3. **Access the test route**:
   - Navigate to http://localhost:3000/app-refactored
   - Compare with original at http://localhost:3000/app

## 📋 Manual Testing Checklist

### Setup Phase
- [ ] Page loads without errors
- [ ] Context panel appears on the left
- [ ] Can enter conversation title
- [ ] Can select conversation type
- [ ] Can add context/goals text
- [ ] File upload works (drag & drop and click)
- [ ] Previous conversations selector works

### Ready Phase
- [ ] Clicking "Start Setup" moves to ready state
- [ ] AI Coach sidebar appears
- [ ] Configuration is preserved from setup
- [ ] "Start Recording" button is enabled

### Recording Phase
- [ ] Microphone permission prompt appears
- [ ] Recording starts successfully
- [ ] Duration timer updates
- [ ] Audio level indicator works
- [ ] Transcript appears in real-time
- [ ] Pause/Resume functionality works
- [ ] Talk stats update correctly
- [ ] Summary tab shows real-time summary
- [ ] Checklist tab is functional

### Processing Phase
- [ ] Stop recording transitions to processing
- [ ] Processing animation appears
- [ ] No errors in console

### Completed Phase
- [ ] Completion screen shows correct info
- [ ] "View Summary" navigates to summary page
- [ ] "Start New" resets to setup phase

### Error Handling
- [ ] Microphone denial shows error
- [ ] Network errors are handled gracefully
- [ ] Can retry after errors

## 🔧 Running Specific Tests

### Test Individual Hooks
```bash
# Test recording hook
npm test useConversationRecording.test.ts

# Test transcript hook
npm test useConversationTranscript.test.ts

# Test session management
npm test useFullSessionManagement.test.ts
```

### Test Components
```bash
# Test transcript view
npm test TranscriptView.test.tsx

# Test state view
npm test ConversationStateView.test.tsx

# Test summary view
npm test SummaryView.test.tsx
```

### Test Contexts
```bash
# Test conversation context
npm test ConversationContext.test.tsx
```

### Test Integration
```bash
# Test full conversation flow
npm test conversation-flow.test.tsx
```

## 🐛 Debugging Tips

### 1. Check Browser Console
Look for errors related to:
- Missing imports
- Undefined methods
- State management issues
- API call failures

### 2. Use React DevTools
- Install React Developer Tools extension
- Check component props and state
- Verify context values

### 3. Network Tab
- Monitor API calls
- Check for failed requests
- Verify request/response payloads

### 4. Common Issues & Solutions

**Issue: "Module not found" errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue: Tests failing due to missing mocks**
```bash
# Make sure all mocks are in place
npm run test -- --clearCache
```

**Issue: Lazy loading errors**
```bash
# Check that all lazy-loaded components exist
# Verify import paths are correct
```

## 🔍 Performance Testing

### 1. Check Bundle Size
```bash
npm run build
# Check .next/analyze/ for bundle analysis
```

### 2. Monitor Re-renders
- Use React DevTools Profiler
- Look for unnecessary re-renders
- Verify memoization is working

### 3. Test with Large Data
- Create a conversation with 1000+ transcript entries
- Verify virtualization is working
- Check memory usage

## 📊 Coverage Report

After running tests with coverage:
```bash
npm run test:coverage
```

Open the coverage report:
```bash
open coverage/lcov-report/index.html
```

Target coverage:
- Statements: > 80%
- Branches: > 70%
- Functions: > 80%
- Lines: > 80%

## 🚦 Integration with CI/CD

### GitHub Actions Example
```yaml
name: Test Refactored Code

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm test
      - run: cd frontend && npm run build
```

## 📝 Test New Features

When adding new features to the refactored code:

1. **Write tests first** (TDD approach)
2. **Update existing tests** if behavior changes
3. **Add integration tests** for new flows
4. **Document test cases** in test files

## 🎯 Acceptance Criteria

The refactoring is successful if:

1. ✅ All existing features work identically
2. ✅ No regressions in functionality
3. ✅ Performance is same or better
4. ✅ All tests pass
5. ✅ Code coverage meets targets
6. ✅ No console errors or warnings
7. ✅ Bundle size is reasonable
8. ✅ Memory usage is stable

## 🆘 Need Help?

1. Check the error message carefully
2. Look for similar issues in tests
3. Verify all dependencies are installed
4. Check that all imports are correct
5. Ensure environment variables are set

---

Remember: The refactored code should behave exactly like the original. If you notice any differences, that's a bug that needs to be fixed!