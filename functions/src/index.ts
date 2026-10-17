import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { GeminiModelProvider } from './gemini-provider';
import { AiModelProvider } from './provider-interface';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const provider: AiModelProvider = new GeminiModelProvider();

// In-memory token bucket for lightweight per-user rate limiting (10 requests per 5 minutes)
const userRateLimits = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxRequests = 10;

  const timestamps = (userRateLimits.get(userId) || []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxRequests) {
    return false;
  }
  timestamps.push(now);
  userRateLimits.set(userId, timestamps);
  return true;
}

export const executeAiRoutineAction = onCall(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 35,
    memory: '256MiB',
  },
  async (request) => {
    // 1. Authenticate user
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated to execute AI Routine Actions.');
    }

    const userId = request.auth.uid;

    // 2. Enforce per-user quota / rate limit
    if (!checkRateLimit(userId)) {
      throw new HttpsError(
        'resource-exhausted',
        'You have exceeded the rate limit of 10 AI executions per 5 minutes. Please wait before retrying.'
      );
    }

    const data = request.data || {};
    const {
      actionId,
      actionName,
      prompt,
      outputFormat = 'markdown',
      routineId,
      routineTitle,
      userInput,
      researchEnabled = false,
    } = data;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'A valid non-empty prompt is required.');
    }

    if (prompt.length > 8000) {
      throw new HttpsError('invalid-argument', 'Prompt exceeds maximum allowed length of 8,000 characters.');
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    const executionRecord: any = {
      id: executionId,
      userId,
      actionId: actionId || 'custom_action',
      actionName: actionName || 'Custom Action',
      routineId: routineId || null,
      routineTitle: routineTitle || '',
      status: 'running',
      promptSnapshot: prompt,
      inputSnapshot: userInput || null,
      createdAt: now,
      completedAt: null,
      errorCode: null,
      errorMessage: null,
    };

    const executionDocRef = db.doc(`users/${userId}/ai_executions/${executionId}`);
    await executionDocRef.set(executionRecord);

    try {
      // 3. Invoke secure model provider
      const modelResponse = await provider.generate({
        prompt,
        outputFormat,
        researchEnabled: Boolean(researchEnabled),
        maxOutputTokens: 2048,
      });

      const completedAt = Date.now();
      const resultId = `result_${executionId}`;

      const resultRecord: any = {
        id: resultId,
        userId,
        executionId,
        actionId: actionId || 'custom_action',
        actionName: actionName || 'Custom Action',
        contentFormat: outputFormat,
        content: modelResponse.content,
        sections: modelResponse.sections || null,
        checklistItems: modelResponse.checklistItems || null,
        sources: modelResponse.sources || null,
        createdAt: completedAt,
      };

      // 4. Save result & update execution status atomically
      const resultDocRef = db.doc(`users/${userId}/ai_results/${resultId}`);
      await resultDocRef.set(resultRecord);

      executionRecord.status = 'completed';
      executionRecord.completedAt = completedAt;
      executionRecord.modelMetadata = modelResponse.modelMetadata;
      executionRecord.usageMetadata = modelResponse.usageMetadata || null;

      await executionDocRef.update({
        status: 'completed',
        completedAt,
        modelMetadata: modelResponse.modelMetadata,
        usageMetadata: modelResponse.usageMetadata || null,
      });

      return {
        success: true,
        execution: executionRecord,
        result: resultRecord,
      };
    } catch (err: any) {
      const failedAt = Date.now();
      const errorMessage = err.message || 'An error occurred during AI action execution.';

      executionRecord.status = 'failed';
      executionRecord.completedAt = failedAt;
      executionRecord.errorCode = 'EXECUTION_FAILED';
      executionRecord.errorMessage = errorMessage;

      await executionDocRef.update({
        status: 'failed',
        completedAt: failedAt,
        errorCode: 'EXECUTION_FAILED',
        errorMessage,
      });

      return {
        success: false,
        execution: executionRecord,
        error: errorMessage,
      };
    }
  }
);
