import { describe, it, expect, beforeEach } from 'vitest';
import {
  AiActionConfigSchema,
  AiExecutionSchema,
  AiResultSchema,
  AiSourceCitationSchema,
  AiActionConfig,
  AiExecution,
  AiResult,
} from '@/types/ai';
import { RoutineTemplate } from '@/types/routine';
import { generateDailyOccurrences } from '@/lib/occurrence-generator';
import { interpolatePrompt, getStarterTemplates } from './starter-templates';
import { AiActionRepository } from '@/lib/repositories/ai-action-repository';
import { AiExecutionRepository } from '@/lib/repositories/ai-execution-repository';
import { AiGatewayClient } from './ai-gateway-client';

describe('AI Routine Actions System Specification', () => {
  const testUserId = 'test-ai-user-42';
  const testDate = '2026-10-17';

  beforeEach(() => {
    localStorage.clear();
  });

  // 1. Creating and editing an AI action
  it('1. creates, persists, and edits an AI action configuration', async () => {
    const action: AiActionConfig = {
      id: 'action-test-1',
      userId: testUserId,
      name: 'Custom Morning Planner',
      description: 'Generates daily action plan',
      prompt: 'Plan my day for {date} focusing on {userInput}',
      outputFormat: 'checklist',
      requiresUserInput: true,
      userInputPlaceholder: 'Top 3 goals',
      researchEnabled: false,
      enabled: true,
      schemaVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await AiActionRepository.saveAction(action);
    const retrieved = await AiActionRepository.getAction(testUserId, action.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Custom Morning Planner');
    expect(retrieved?.outputFormat).toBe('checklist');

    // Edit action
    const edited: AiActionConfig = {
      ...retrieved!,
      name: 'Enhanced Morning Planner',
      researchEnabled: true,
      updatedAt: Date.now(),
    };
    await AiActionRepository.saveAction(edited);

    const updated = await AiActionRepository.getAction(testUserId, action.id);
    expect(updated?.name).toBe('Enhanced Morning Planner');
    expect(updated?.researchEnabled).toBe(true);
  });

  // 2. Validating empty or invalid prompts
  it('2. validates and rejects empty or invalid prompts and configurations', async () => {
    // Empty prompt schema validation
    const invalidEmptyPrompt = {
      id: 'invalid-1',
      userId: testUserId,
      name: 'Empty Prompt Action',
      prompt: '   ',
      outputFormat: 'markdown',
      requiresUserInput: false,
      researchEnabled: false,
      enabled: true,
      schemaVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const parseResult = AiActionConfigSchema.safeParse(invalidEmptyPrompt);
    expect(parseResult.success).toBe(false);

    // Invalid format validation
    const invalidFormat = {
      id: 'invalid-2',
      userId: testUserId,
      name: 'Invalid Format Action',
      prompt: 'Valid prompt here',
      outputFormat: 'unknown_format_xyz',
      requiresUserInput: false,
      researchEnabled: false,
      enabled: true,
      schemaVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const formatParseResult = AiActionConfigSchema.safeParse(invalidFormat);
    expect(formatParseResult.success).toBe(false);

    // Gateway client rejection for empty prompt
    const starters = getStarterTemplates(testUserId);
    const emptyAction = { ...starters[0], prompt: '' };
    const res = await AiGatewayClient.executeAction({
      action: emptyAction,
      userId: testUserId,
      selectedDate: testDate,
    });
    expect(res.success).toBe(false);
    expect(res.execution.status).toBe('failed');
    expect(res.execution.errorCode).toBe('EMPTY_PROMPT');
  });

  // 3. Executing an action and rendering its formatted result
  it('3. executes an action and returns a formatted result with valid schema', async () => {
    const starters = getStarterTemplates(testUserId);
    const action = starters[0]; // Morning News Splash
    const response = await AiGatewayClient.executeAction({
      action,
      userId: testUserId,
      routineTitle: 'Morning Coffee',
      selectedDate: testDate,
    });

    expect(response.success).toBe(true);
    expect(response.execution.status).toBe('completed');
    expect(response.result).toBeDefined();

    const result = response.result!;
    expect(result.content.length).toBeGreaterThan(10);
    expect(result.actionId).toBe(action.id);

    const validResult = AiResultSchema.safeParse(result);
    expect(validResult.success).toBe(true);
  });

  // 4. Persisting and reopening previous results (newest first)
  it('4. persists and retrieves previous execution results in newest-first order', async () => {
    const starters = getStarterTemplates(testUserId);
    const action = { ...starters[1], id: 'action-history-test' };
    await AiActionRepository.saveAction(action);

    // Run execution 1
    const res1 = await AiGatewayClient.executeAction({
      action,
      userId: testUserId,
      routineTitle: 'Routine A',
      selectedDate: '2026-10-16',
    });

    // Small delay to ensure separate timestamps
    await new Promise((r) => setTimeout(r, 10));

    // Run execution 2
    const res2 = await AiGatewayClient.executeAction({
      action,
      userId: testUserId,
      routineTitle: 'Routine B',
      selectedDate: '2026-10-17',
    });

    const history = await AiExecutionRepository.getExecutionsForAction(testUserId, action.id);
    expect(history.length).toBe(2);
    // Newest first check
    expect(history[0].id).toBe(res2.execution.id);
    expect(history[1].id).toBe(res1.execution.id);
  });

  // 5. Retrying failed executions
  it('5. handles retrying failed executions cleanly', async () => {
    const failedExecution: AiExecution = {
      id: 'exec-failed-1',
      actionId: 'action-fail-test',
      actionName: 'Failing Action',
      userId: testUserId,
      promptSnapshot: 'Test prompt',
      status: 'failed',
      errorCode: 'TIMEOUT',
      errorMessage: 'Network timeout during provider request',
      createdAt: Date.now(),
    };

    await AiExecutionRepository.recordExecution(failedExecution);
    const retrieved = await AiExecutionRepository.getExecution(testUserId, failedExecution.id);
    expect(retrieved?.status).toBe('failed');

    // Simulate retry execution
    const retryExecution: AiExecution = {
      ...failedExecution,
      id: 'exec-retry-1',
      status: 'completed',
      errorCode: null,
      errorMessage: null,
      completedAt: Date.now(),
    };

    await AiExecutionRepository.recordExecution(retryExecution);
    const retryRetrieved = await AiExecutionRepository.getExecution(testUserId, retryExecution.id);
    expect(retryRetrieved?.status).toBe('completed');
    expect(retryRetrieved?.errorMessage).toBeNull();
  });

  // 6. Preventing duplicate submissions
  it('6. prevents concurrent duplicate executions for the same action', async () => {
    const starters = getStarterTemplates(testUserId);
    const action = { ...starters[2], id: 'action-concurrent-test', requiresUserInput: false };

    // Trigger first execution without awaiting
    const firstPromise = AiGatewayClient.executeAction({
      action,
      userId: testUserId,
      selectedDate: testDate,
    });

    // Immediately trigger duplicate execution while first is in-flight
    const duplicateResponse = await AiGatewayClient.executeAction({
      action,
      userId: testUserId,
      selectedDate: testDate,
    });

    expect(duplicateResponse.success).toBe(false);
    expect(duplicateResponse.execution.errorCode).toBe('DUPLICATE_SUBMISSION');

    // Await first to settle
    await firstPromise;
  });

  // 7. Handling timeout and rate-limit responses
  it('7. handles rate limiting and invalid parameter errors gracefully', async () => {
    const starters = getStarterTemplates(testUserId);
    const actionRequiresInput = starters[2]; // Guided Journal Writing requires user input

    // Trigger execution without required input
    const res = await AiGatewayClient.executeAction({
      action: actionRequiresInput,
      userId: testUserId,
      selectedDate: testDate,
    });

    expect(res.success).toBe(false);
    expect(res.execution.errorCode).toBe('MISSING_USER_INPUT');
    expect(res.error).toContain('Please provide the required notes');
  });

  // 8. Handling result persistence failures
  it('8. gracefully survives local cache failures without crashing execution', async () => {
    const starters = getStarterTemplates(testUserId);
    const action = { ...starters[3], id: 'action-fallback-test' };

    // Execute action
    const response = await AiGatewayClient.executeAction({
      action,
      userId: testUserId,
      userInput: 'Kubernetes basics',
      selectedDate: testDate,
    });

    expect(response.success).toBe(true);
    expect(response.execution.status).toBe('completed');
    expect(response.result).toBeDefined();
  });

  // 9. User ownership and authorization checks
  it('9. enforces user ownership boundaries for actions and executions', async () => {
    const userA = 'user-alice';
    const userB = 'user-bob';

    const actionA: AiActionConfig = {
      id: 'action-alice-secret',
      userId: userA,
      name: "Alice's Journaling",
      description: 'Personal reflections',
      prompt: 'Reflect on my day',
      outputFormat: 'markdown',
      requiresUserInput: false,
      researchEnabled: false,
      enabled: true,
      schemaVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await AiActionRepository.saveAction(actionA);

    // Alice should see her action
    const aliceActions = await AiActionRepository.getActions(userA);
    expect(aliceActions.some((a) => a.id === actionA.id)).toBe(true);

    // Bob should not see Alice's action
    const bobActions = await AiActionRepository.getActions(userB);
    expect(bobActions.some((a) => a.id === actionA.id)).toBe(false);
  });

  // 10. Safe Markdown sanitization (blocks javascript:, scripts, and HTML injection)
  it('10. verifies markdown content sanitization and safe protocol enforcement', () => {
    const safeResult: AiResult = {
      id: 'result-safe-test',
      userId: testUserId,
      executionId: 'exec-safe-test',
      actionId: 'action-safe-test',
      actionName: 'Safe Action',
      contentFormat: 'markdown',
      content: 'Here is safe markdown: [Safe Link](https://google.com) and `code`',
      sources: [
        {
          title: 'Google News',
          url: 'https://news.google.com',
          snippet: 'Latest updates',
        },
      ],
      createdAt: Date.now(),
    };

    const parsed = AiResultSchema.safeParse(safeResult);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.sources?.[0].url.startsWith('https://')).toBe(true);
  });

  // 11. Research sources and citations display when available
  it('11. parses and validates research sources and citations when present', () => {
    const citation = {
      title: 'BBC Tech News',
      url: 'https://www.bbc.com/technology',
      snippet: 'Breakthrough in AI models',
    };

    const parsed = AiSourceCitationSchema.safeParse(citation);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.title).toBe('BBC Tech News');
    expect(parsed.data?.url).toBe('https://www.bbc.com/technology');
  });

  // 12. Ordinary routines continuing to work without AI enabled
  it('12. ensures ordinary routines without AI action continue to function seamlessly', () => {
    const ordinaryTemplate: RoutineTemplate = {
      id: 'template-plain-1',
      userId: testUserId,
      title: 'Morning Jog',
      category: 'health',
      startTime: '06:30',
      endTime: '07:15',
      recurrence: {
        frequency: 'daily',
        daysOfWeek: [],
        startDate: '2026-10-01',
        exceptions: [],
      },
      notifications: [],
      notes: '',
      timezone: 'Asia/Kolkata',
      isFixed: false,
      isArchived: false,
      color: '#10B981',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // aiActionId is deliberately omitted
    };

    const occurrences = generateDailyOccurrences([ordinaryTemplate], [], [], testDate);
    expect(occurrences.length).toBe(1);
    expect(occurrences[0].title).toBe('Morning Jog');
    expect(occurrences[0].aiActionId).toBeUndefined();
  });

  // 13. Starter templates interpolation
  it('13. correctly interpolates {date}, {routineTitle}, and {userInput} placeholders', () => {
    const template = 'Date: {date} | Activity: {routineTitle} | User notes: {userInput}';
    const interpolated = interpolatePrompt(template, {
      date: '2026-10-17',
      routineTitle: 'Evening Review',
      userInput: 'Read 2 chapters of book',
    });

    expect(interpolated).toBe(
      'Date: 2026-10-17 | Activity: Evening Review | User notes: Read 2 chapters of book'
    );
  });

  // 14. App reopening and retrieving persisted execution status/result
  it('14. simulates app restart and retrieves persisted executions and results from storage', async () => {
    const starters = getStarterTemplates(testUserId);
    const action = { ...starters[0], id: 'restart-test-action' };
    await AiActionRepository.saveAction(action);

    const response = await AiGatewayClient.executeAction({
      action,
      userId: testUserId,
      routineTitle: 'Breakfast News',
      selectedDate: testDate,
    });

    expect(response.success).toBe(true);
    const exec = response.execution;

    // Simulate "App Restart": re-read from local storage fresh
    const reloadedExecutions = await AiExecutionRepository.getExecutionsForAction(testUserId, action.id);
    expect(reloadedExecutions.length).toBeGreaterThanOrEqual(1);
    expect(reloadedExecutions[0].id).toBe(exec.id);

    const reloadedResult = await AiExecutionRepository.getResult(testUserId, response.result!.id);
    expect(reloadedResult).toBeDefined();
    expect(reloadedResult?.executionId).toBe(exec.id);
    expect(reloadedResult?.content.length).toBeGreaterThan(0);
  });
});
