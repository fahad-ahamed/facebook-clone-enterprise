/**
 * Event Handler
 * Event handler registry and processing logic
 */

import { DomainEvent } from './event-types';
import { Logger } from '../../services/observability/index';

// Handler function type
export type EventHandlerFunction<T extends DomainEvent = DomainEvent> = (
  event: T,
  context: HandlerContext
) => Promise<HandlerResult>;

// Handler context
export interface HandlerContext {
  retryCount: number;
  correlationId?: string;
  startTime: number;
  logger: typeof Logger;
}

// Handler result
export interface HandlerResult {
  success: boolean;
  error?: Error;
  metrics?: Record<string, number>;
}

// Handler configuration
export interface HandlerConfig {
  name: string;
  eventType: string | string[];
  priority: number;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  enabled: boolean;
  filter?: (event: DomainEvent) => boolean;
}

// Registered handler
interface RegisteredHandler {
  config: HandlerConfig;
  handler: EventHandlerFunction;
}

/**
 * Event Handler Registry
 * Manages event handlers and their execution
 */
export class EventHandlerRegistry {
  private handlers: Map<string, RegisteredHandler[]> = new Map();
  private globalHandlers: RegisteredHandler[] = [];
  private errorHandlers: Map<string, (error: Error, event: DomainEvent) => Promise<void>> = new Map();

  /**
   * Register an event handler
   */
  register(
    config: HandlerConfig,
    handler: EventHandlerFunction
  ): () => void {
    const registered: RegisteredHandler = {
      config,
      handler,
    };

    // Handle wildcard or multiple event types
    const eventTypes = Array.isArray(config.eventType)
      ? config.eventType
      : [config.eventType];

    for (const eventType of eventTypes) {
      if (eventType === '*') {
        this.globalHandlers.push(registered);
      } else {
        if (!this.handlers.has(eventType)) {
          this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType)!.push(registered);
      }
    }

    // Sort by priority
    this.sortHandlers();

    Logger.info(`Handler registered: ${config.name} for ${eventTypes.join(', ')}`);

    // Return unregister function
    return () => {
      this.unregister(config.name, eventTypes);
    };
  }

  /**
   * Unregister a handler
   */
  private unregister(name: string, eventTypes: string[]): void {
    for (const eventType of eventTypes) {
      if (eventType === '*') {
        const index = this.globalHandlers.findIndex(h => h.config.name === name);
        if (index >= 0) {
          this.globalHandlers.splice(index, 1);
        }
      } else {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
          const index = handlers.findIndex(h => h.config.name === name);
          if (index >= 0) {
            handlers.splice(index, 1);
          }
        }
      }
    }
  }

  /**
   * Register error handler for specific event type
   */
  registerErrorHandler(
    eventType: string,
    handler: (error: Error, event: DomainEvent) => Promise<void>
  ): void {
    this.errorHandlers.set(eventType, handler);
  }

  /**
   * Get handlers for an event
   */
  getHandlers(event: DomainEvent): RegisteredHandler[] {
    const specificHandlers = this.handlers.get(event.type) || [];
    const global = this.globalHandlers;

    // Combine and filter
    const all = [...global, ...specificHandlers]
      .filter(h => h.config.enabled)
      .filter(h => !h.config.filter || h.config.filter(event));

    // Sort by priority
    return all.sort((a, b) => a.config.priority - b.config.priority);
  }

  /**
   * Execute handlers for an event
   */
  async executeHandlers(
    event: DomainEvent,
    correlationId?: string
  ): Promise<Map<string, HandlerResult>> {
    const handlers = this.getHandlers(event);
    const results = new Map<string, HandlerResult>();

    for (const { config, handler } of handlers) {
      const context: HandlerContext = {
        retryCount: 0,
        correlationId,
        startTime: Date.now(),
        logger: Logger,
      };

      let lastError: Error | undefined;
      let success = false;

      // Retry loop
      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        context.retryCount = attempt;

        try {
          // Execute with timeout
          const result = await this.executeWithTimeout(
            handler(event, context),
            config.timeout
          );

          success = result.success;
          lastError = result.error;

          if (success) {
            results.set(config.name, result);
            break;
          }
        } catch (error) {
          lastError = error as Error;
          Logger.error(`Handler ${config.name} failed (attempt ${attempt + 1}):`, error);
        }

        // Wait before retry
        if (attempt < config.maxRetries) {
          await this.delay(config.retryDelay * Math.pow(2, attempt));
        }
      }

      if (!success) {
        results.set(config.name, {
          success: false,
          error: lastError,
        });

        // Call error handler if registered
        const errorHandler = this.errorHandlers.get(event.type);
        if (errorHandler && lastError) {
          await errorHandler(lastError, event);
        }
      }
    }

    return results;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    promise: Promise<HandlerResult>,
    timeout: number
  ): Promise<HandlerResult> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<HandlerResult>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Handler timeout after ${timeout}ms`));
      }, timeout);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId!);
      return result;
    } catch (error) {
      clearTimeout(timeoutId!);
      return {
        success: false,
        error: error as Error,
      };
    }
  }

  /**
   * Sort handlers by priority
   */
  private sortHandlers(): void {
    for (const handlers of this.handlers.values()) {
      handlers.sort((a, b) => a.config.priority - b.config.priority);
    }
    this.globalHandlers.sort((a, b) => a.config.priority - b.config.priority);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): Map<string, HandlerConfig[]> {
    const result = new Map<string, HandlerConfig[]>();

    for (const [eventType, handlers] of this.handlers) {
      result.set(eventType, handlers.map(h => h.config));
    }

    if (this.globalHandlers.length > 0) {
      result.set('*', this.globalHandlers.map(h => h.config));
    }

    return result;
  }

  /**
   * Enable/disable handler
   */
  setHandlerEnabled(name: string, enabled: boolean): void {
    for (const handlers of this.handlers.values()) {
      const handler = handlers.find(h => h.config.name === name);
      if (handler) {
        handler.config.enabled = enabled;
      }
    }

    const globalHandler = this.globalHandlers.find(h => h.config.name === name);
    if (globalHandler) {
      globalHandler.config.enabled = enabled;
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers = [];
    this.errorHandlers.clear();
  }

  /**
   * Get handler count
   */
  getHandlerCount(): { specific: number; global: number } {
    let specific = 0;
    for (const handlers of this.handlers.values()) {
      specific += handlers.length;
    }

    return {
      specific,
      global: this.globalHandlers.length,
    };
  }
}

/**
 * Create a handler decorator
 */
export function Handler(config: HandlerConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const registry = EventHandlerRegistry.getInstance();

    registry.register(config, originalMethod.bind(target));

    return descriptor;
  };
}

/**
 * Get singleton instance
 */
let registryInstance: EventHandlerRegistry | null = null;

EventHandlerRegistry.getInstance = function (): EventHandlerRegistry {
  if (!registryInstance) {
    registryInstance = new EventHandlerRegistry();
  }
  return registryInstance;
};

// Add getInstance to class
(EventHandlerRegistry as any).getInstance = function (): EventHandlerRegistry {
  if (!registryInstance) {
    registryInstance = new EventHandlerRegistry();
  }
  return registryInstance;
};
