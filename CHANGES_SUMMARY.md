# Summary of Changes for Planning Engine Code Review

## Overview
This document summarizes the changes made to address the code review requirements for the Planning Engine.

## Changes Made

### 1. Deep Input Validation Before AI Call

**File Modified:** `lib/planning/orchestrator.ts`

**Changes:**
- Added `validatePlanningInputDeep()` function that performs comprehensive validation of `PlanningInput` before calling the AI provider
- Validates that `weekStart` has valid ISO date format and falls on Monday
- Validates that `timeZone` is valid using `Intl.DateTimeFormat`
- Validates that `employees` have correct structure, required `id` fields, and supported `employmentType: "full_time"`
- Validates that `shiftDefinitions`, `staffingRequirements`, `absences`, `requests`, `existingAssignments`, `rules`, and `history` have expected shapes and required fields
- Uses existing helper functions from `lib/planning/domain/time.ts` like `isIsoDate`, `weekdayIndex`
- Rejects invalid input as `invalid_input` before any AI call is made

**Benefits:**
- Prevents AI calls with invalid data
- Ensures data integrity at the earliest possible stage
- Provides clear error messages for invalid input

### 2. Fixed Coverage and Changes Calculation (Deduplication)

**File Modified:** `lib/planning/orchestrator.ts`

**Changes:**
- Updated `computeChanges()` function to deduplicate assignments using `assignmentKey`
- Updated `computeCoverage()` function to deduplicate assignments using `assignmentKey`
- Duplicate assignments no longer artificially inflate coverage or changes count
- Original proposal remains unchanged (duplicates stay in proposal for validation to catch)
- Maintains proper distinction between `added`, `removed`, and `unchanged` changes

**Benefits:**
- Accurate coverage calculation
- Accurate change tracking
- Prevents misleading metrics

### 3. Enhanced Two-Layer PlanDraft Validation

**Files Modified:**
- `lib/planning/orchestrator.ts` - Added semantic validation
- `lib/planning/ai-provider.ts` - Enhanced `isPlanDraft()` function

**Changes in `isPlanDraft()` (ai-provider.ts):**
- Added validation for allowed `ExplanationTopic` values
- Enhanced validation of assignment structure including date format
- Enhanced validation of alternative structure
- Maintained pure structure validation without dependencies on `PlanningInput`

**Changes in Orchestrator Semantic Validation:**
- Added validation that AI proposal `weekStart` matches input `weekStart`
- Added validation that all assignments reference existing employees from input
- Added validation that assignment dates belong to the planned week
- Added validation that assignment shift kinds are valid
- Added validation for alternative assignments
- Rejects invalid AI output as `ai_invalid_output` (not `ready_for_review`)

**Benefits:**
- Better separation of concerns between structural and semantic validation
- Prevents invalid proposals from reaching validation phase
- Ensures AI output is both structurally and semantically correct

### 4. Comprehensive Test Coverage

**Files Created:**
- `lib/planning/domain/input-validation.test.ts` - Tests for invalid input rejection
- `lib/planning/domain/duplicate-assignments.test.ts` - Tests for coverage and changes deduplication
- `lib/planning/domain/plan-draft-validation.test.ts` - Tests for two-layer validation

**Tests Added:**
- Invalid input rejected before provider call (Monday weekStart, invalid timeZone, invalid employees, etc.)
- Multiple shift slots and correct coverage calculations
- Changes `added`, `removed`, and `unchanged` types
- Duplicate assignments that don't increase coverage or changes
- Invalid dates, invalid `ExplanationTopic` values, incomplete alternatives in `isPlanDraft()`
- Semantically invalid proposals (unknown employee, unknown shift, date outside week)
- Consistency of `buildPrompt` and JSON response schema

**Benefits:**
- Comprehensive test coverage for new validation logic
- Ensures backward compatibility where applicable
- Provides regression protection

### 5. Code Quality Improvements

**Changes:**
- Added proper imports for validation functions
- Improved function names and documentation
- Maintained existing architecture and design patterns
- No breaking changes to public API

## Technical Details

### Validation Rules Implemented

1. **Week Start Validation**
   - Must be valid ISO date format (`YYYY-MM-DD`)
   - Must be Monday (`weekdayIndex(input.weekStart) === 0`)

2. **Time Zone Validation**
   - Must be valid IANA time zone name
   - Must parse correctly with `Intl.DateTimeFormat`

3. **Employee Validation**
   - Required `id` field (non-empty string)
   - Must have `employmentType: "full_time"`
   - No duplicate employee IDs

4. **Shift Definition Validation**
   - Must have exactly 2 definitions
   - Must include both `morning` and `afternoon` kinds

5. **Coverage Requirement Validation**
   - Each date/shift combination must have exactly one requirement
   - No duplicate requirements
   - Required employees must be non-negative integer

6. **Assignment Deduplication**
   - Uses `assignmentKey(employeeId|date|shiftKind)` for deduplication
   - Applied to both coverage and changes calculations

### Validation Flow

```
PlanningInput → (deep validation) → AI Provider Call → PlanDraft
                                        ↓
                                    (isPlanDraft structure validation)
                                        ↓
                                 (semantic validation)
                                        ↓
                                validatePlan() → PlanningRunResult
```

## Testing Strategy

### Input Validation Tests
- Test invalid weekStart (non-Monday dates)
- Test invalid timeZone (invalid IANA names)
- Test invalid employee data (missing ID, wrong employment type)
- Test invalid shift definitions (missing kinds, wrong structure)
- Test invalid staffing requirements (duplicates, invalid counts)
- Test invalid absence/request data

### Deduplication Tests
- Test duplicate assignments don't inflate coverage
- Test duplicate assignments don't create duplicate changes
- Test duplicate assignments are still caught as validation errors
- Test mixed duplicates and unique assignments

### PlanDraft Validation Tests
- Test valid PlanDraft passes structure validation
- Test invalid dates in PlanDraft fail structure validation
- Test invalid explanation topics fail structure validation
- Test incomplete alternatives fail structure validation
- Test semantically invalid proposals fail AI validation

## Backward Compatibility

- No breaking changes to public API
- Existing tests continue to pass (with enhancements)
- New functionality is additive and defensive
- Error messages are more descriptive but don't break existing error handling

## Performance Considerations

- Input validation happens before any AI call, preventing wasted resources
- Deduplication uses efficient Map/Set operations
- All validation is deterministic and fast
- No additional memory overhead beyond existing data structures

## Security Considerations

- Input validation prevents injection of malformed data
- Semantic validation ensures AI output is constrained to valid domain
- No external dependencies added
- All validation is done locally without external API calls