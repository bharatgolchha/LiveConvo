# Baseline Test Status - Pre-Refactoring

**Date**: December 9, 2024  
**Branch**: refactor/app-page-breakdown  
**Total Test Suites**: 25  
**Passing Test Suites**: 12  
**Failing Test Suites**: 13  
**Total Tests**: 200  
**Passing Tests**: 150  
**Failing Tests**: 50  

## Summary

The codebase has an existing test suite with 75% of tests passing. The failing tests are primarily in:

1. **API Tests** - Chat prompt formatting and transcript endpoints
2. **Library Tests** - Deepgram transcription service and utilities
3. **Component Tests** - AI Coach sidebar and other React components

## Known Failing Tests

### API Tests
- `chatPrompt.test.ts` - Chat history formatting expectations
- `transcript.test.ts` - NextRequest mocking issues
- `checklist-generate.test.ts` - Test setup issues

### Library Tests  
- `deepgramTranscription.test.ts` - Connection timeout issues
- `utils.test.ts` - Date utility test expectations
- `webrtc.test.ts` - MediaStream mocking issues

### Component Tests
- `AICoachSidebar.test.tsx` - Component rendering tests
- `FloatingChatGuidance.test.tsx` - Hook usage issues
- Various other component tests with mocking issues

## Test Coverage

Current coverage before refactoring:
- Statements: ~40%
- Branches: ~35%
- Functions: ~35%
- Lines: ~40%

## Important Notes

1. **Existing failures are not blockers** for refactoring - they represent pre-existing issues
2. **Our goal** is to not introduce NEW failures during refactoring
3. **Test improvements** can be addressed after structural refactoring is complete
4. **Focus on** maintaining current functionality, not fixing existing test issues

## Action Items for Refactoring

1. Keep track of any NEW test failures introduced during refactoring
2. Ensure refactored code maintains same behavior as original
3. Add tests for new hooks/utilities as they are created
4. Document any behavior changes discovered during refactoring