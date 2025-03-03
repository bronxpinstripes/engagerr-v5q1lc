/**
 * Queue Task Definitions
 * 
 * This module defines task types, interfaces, and utilities for the background
 * processing queue system in Engagerr. It provides structured definitions for
 * asynchronous tasks like content analysis, metric calculations, and AI processing.
 */

import { v4 as uuidv4 } from 'uuid'; // v8.3.2
import { TaskPriority, TaskStatus } from '../types';
import { logger } from '../utils/logger';
import {
  ContentRelationshipPayload,
  AnalyticsCalculationPayload, 
  AIProcessingPayload,
  EmailNotificationPayload,
  PlatformSyncPayload,
  WebhookProcessingPayload
} from '../types/queue';

/**
 * Enum defining all possible task types in the system
 */
export enum TaskType {
  CONTENT_ANALYSIS = 'content_analysis',
  ANALYTICS_CALCULATION = 'analytics_calculation',
  AI_PROCESSING = 'ai_processing',
  EMAIL_NOTIFICATION = 'email_notification',
  PLATFORM_SYNC = 'platform_sync',
  WEBHOOK_PROCESSING = 'webhook_processing'
}

/**
 * Generic interface for all queue tasks with type safety for payload
 */
export interface Task<T = unknown> {
  /** Unique identifier for the task */
  id: string;
  
  /** Type of task */
  type: TaskType;
  
  /** Task-specific payload data */
  payload: T;
  
  /** Task priority level */
  priority: TaskPriority;
  
  /** Current status of the task */
  status: TaskStatus;
  
  /** Number of processing attempts */
  attempts: number;
  
  /** When the task was created */
  created: Date;
  
  /** When the task was last updated */
  updated?: Date;
  
  /** Error message if task failed */
  error?: string;
}

/**
 * Creates a new task with the specified type, payload, and optional priority
 * 
 * @param taskType The type of task to create
 * @param payload The task-specific payload data
 * @param priority The priority level for the task (defaults to NORMAL)
 * @returns A fully configured task object with generated ID and metadata
 */
export function createTask<T>(
  taskType: TaskType,
  payload: T,
  priority: TaskPriority = TaskPriority.NORMAL
): Task<T> {
  const task: Task<T> = {
    id: uuidv4(),
    type: taskType,
    payload,
    priority,
    status: TaskStatus.PENDING,
    attempts: 0,
    created: new Date()
  };
  
  logger.info({ 
    message: 'Task created', 
    taskId: task.id, 
    taskType: task.type, 
    priority: task.priority
  });
  
  return task;
}

/**
 * Helper function to create a content analysis task
 * 
 * @param payload The content analysis payload data
 * @param priority The priority level (defaults to NORMAL)
 * @returns A fully configured content analysis task
 */
export function createContentAnalysisTask(
  payload: ContentRelationshipPayload,
  priority: TaskPriority = TaskPriority.NORMAL
): Task<ContentRelationshipPayload> {
  return createTask(TaskType.CONTENT_ANALYSIS, payload, priority);
}

/**
 * Helper function to create an analytics calculation task
 * 
 * @param payload The analytics calculation payload data
 * @param priority The priority level (defaults to NORMAL)
 * @returns A fully configured analytics calculation task
 */
export function createAnalyticsCalculationTask(
  payload: AnalyticsCalculationPayload,
  priority: TaskPriority = TaskPriority.NORMAL
): Task<AnalyticsCalculationPayload> {
  return createTask(TaskType.ANALYTICS_CALCULATION, payload, priority);
}

/**
 * Helper function to create an AI processing task
 * 
 * @param payload The AI processing payload data
 * @param priority The priority level (defaults to NORMAL)
 * @returns A fully configured AI processing task
 */
export function createAIProcessingTask(
  payload: AIProcessingPayload,
  priority: TaskPriority = TaskPriority.NORMAL
): Task<AIProcessingPayload> {
  return createTask(TaskType.AI_PROCESSING, payload, priority);
}

/**
 * Helper function to create an email notification task
 * 
 * @param payload The email notification payload data
 * @param priority The priority level (defaults to NORMAL)
 * @returns A fully configured email notification task
 */
export function createEmailNotificationTask(
  payload: EmailNotificationPayload,
  priority: TaskPriority = TaskPriority.NORMAL
): Task<EmailNotificationPayload> {
  return createTask(TaskType.EMAIL_NOTIFICATION, payload, priority);
}

/**
 * Helper function to create a platform sync task
 * 
 * @param payload The platform sync payload data
 * @param priority The priority level (defaults to NORMAL)
 * @returns A fully configured platform sync task
 */
export function createPlatformSyncTask(
  payload: PlatformSyncPayload,
  priority: TaskPriority = TaskPriority.NORMAL
): Task<PlatformSyncPayload> {
  return createTask(TaskType.PLATFORM_SYNC, payload, priority);
}

/**
 * Helper function to create a webhook processing task
 * 
 * @param payload The webhook processing payload data
 * @param priority The priority level (defaults to NORMAL)
 * @returns A fully configured webhook processing task
 */
export function createWebhookProcessingTask(
  payload: WebhookProcessingPayload,
  priority: TaskPriority = TaskPriority.NORMAL
): Task<WebhookProcessingPayload> {
  return createTask(TaskType.WEBHOOK_PROCESSING, payload, priority);
}