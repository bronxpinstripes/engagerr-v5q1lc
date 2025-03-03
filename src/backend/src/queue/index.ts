/**
 * Entry point for the task queue system that handles background processing of content analysis, platform data fetching, analytics calculations, and other asynchronous operations in the Engagerr platform.
 */

import { TaskProcessor } from './processor';
import { TaskType, Task, TaskPriority, TaskStatus, createTask } from './tasks';
import { logger } from '../utils/logger';

/**
 * Initializes the task queue system and starts the processing of tasks
 * @param   options
 * @returns An instance of the task processor
 */
export function initializeQueue(options: any): TaskProcessor {
  // LD1: Create a new instance of TaskProcessor with provided options
  const processor = new TaskProcessor(options);

  // LD1: Start the task processing with the configured concurrency
  processor.initialize()
    .then(() => {
      logger.info('Task queue initialized successfully');
    })
    .catch(err => {
      logger.error('Task queue failed to initialize', err);
    });

  // LD1: Log successful initialization of the queue
  logger.info('Task queue initialization started');

  // LD1: Return the processor instance for further use
  return processor;
}

/**
 * Adds a task to the queue for background processing
 * @param   taskType
 * @param   payload
 * @param   priority
 * @returns The ID of the created task
 */
export function addToQueue(taskType: TaskType, payload: any, priority: TaskPriority): string {
  // LD1: Create a new task using the createTask factory function
  const task: Task = createTask(taskType, payload, priority);

  // LD1: Add the task to the queue via the global processor instance
  queueManager.addTask(task)
    .then(() => {
      logger.info({ taskId: task.id, taskType: task.type }, 'Task added to queue');
    })
    .catch(err => {
      logger.error({ taskId: task.id, taskType: task.type }, 'Failed to add task to queue', err);
    });

  // LD1: Log that a new task has been added to the queue
  logger.info({ taskId: task.id, taskType: task.type }, 'New task added to queue');

  // LD1: Return the task ID for tracking
  return task.id;
}

/**
 * Gets the current status of a task by its ID
 * @param   taskId
 * @returns The current status of the task
 */
export function getTaskStatus(taskId: string): TaskStatus {
  // LD1: Retrieve the task from the queue using the processor instance
  const status = queueManager.getTaskStatus(taskId);

  // LD1: Return the current status of the task
  return status;
}

/**
 * Gracefully shuts down the queue processing, completing in-progress tasks
 * @returns A promise that resolves when shutdown is complete
 */
export async function shutdownQueue(): Promise<void> {
  // LD1: Log that queue shutdown has been initiated
  logger.info('Queue shutdown initiated');

  // LD1: Call stopProcessing on the processor instance
  await queueManager.shutdown();

  // LD1: Log successful shutdown of the queue
  logger.info('Queue shutdown completed');
}

/**
 * Singleton class that manages the task queue across the application
 */
class QueueManager {
  private processor: TaskProcessor | null = null;
  private isInitialized: boolean = false;

  /**
   * Creates the QueueManager singleton instance
   */
  constructor() {
    // LD1: Initialize properties with default values
    this.processor = null;
    this.isInitialized = false;
  }

  /**
   * Initializes the queue processor with configuration options
   * @param   options
   */
  public initialize(options: any): void {
    // LD1: Check if already initialized and warn if true
    if (this.isInitialized) {
      logger.warn('QueueManager is already initialized');
      return;
    }

    // LD1: Create new TaskProcessor instance with options
    this.processor = new TaskProcessor(options);

    // LD1: Start the task processor
    this.processor.initialize()
      .then(() => {
        logger.info('Task processor initialized successfully');
      })
      .catch(err => {
        logger.error('Task processor failed to initialize', err);
      });

    // LD1: Set isInitialized to true
    this.isInitialized = true;

    // LD1: Log successful initialization
    logger.info('QueueManager initialized');
  }

  /**
   * Adds a task to the queue
   * @param   taskType
   * @param   payload
   * @param   priority
   * @returns The ID of the created task
   */
  public addTask(task: Task): Promise<any> {
    // LD1: Ensure the queue is initialized
    if (!this.isInitialized || !this.processor) {
      return Promise.reject(new Error('QueueManager is not initialized'));
    }

    // LD1: Add task to the processor's queue
    return this.processor.addTask(task);
  }

  /**
   * Gets the status of a task by ID
   * @param   taskId
   * @returns The current status of the task
   */
  public getTaskStatus(taskId: string): TaskStatus {
    // LD1: Ensure the queue is initialized
    if (!this.isInitialized || !this.processor) {
      logger.error('QueueManager is not initialized');
      return TaskStatus.NOT_FOUND;
    }

    // LD1: Request task status from the processor
    // LD1: Return the status or NOT_FOUND if task doesn't exist
    return TaskStatus.PENDING; // TODO: Implement actual status retrieval
  }

  /**
   * Gracefully shuts down the queue processing
   */
  public async shutdown(): Promise<void> {
    // LD1: Check if queue is initialized
    if (!this.isInitialized || !this.processor) {
      logger.warn('QueueManager is not initialized, shutdown skipped');
      return;
    }

    // LD1: Log shutdown initiation
    logger.info('QueueManager shutdown initiated');

    // LD1: Call stopProcessing on processor
    await this.processor.shutdown();

    // LD1: Set isInitialized to false
    this.isInitialized = false;

    // LD1: Log successful shutdown
    logger.info('QueueManager shutdown completed');
  }
}

// Create a single instance of the QueueManager
const queueManager = new QueueManager();

// IE3: Expose singleton queue manager instance
export { queueManager };

// IE3: Expose task types for queue consumers
export { TaskType };

// IE3: Expose task interface for queue consumers
export type { Task };

// IE3: Expose priority levels for queue consumers
export { TaskPriority };

// IE3: Expose task status types for queue consumers
export { TaskStatus };

// IE3: Expose factory function for creating tasks
export { createTask };