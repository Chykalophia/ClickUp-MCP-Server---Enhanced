import { EventEmitter } from 'events';
import { RealTimeDataEvent } from './real-time-data-service.js';

export interface ProcessingRule {
  id: string;
  eventType: RealTimeDataEvent['type'];
  condition: (_event: RealTimeDataEvent) => boolean;
  action: (_event: RealTimeDataEvent) => Promise<void>;
  priority: number;
}

export interface StreamMetrics {
  eventsProcessed: number;
  averageProcessingTime: number;
  errorRate: number;
  throughput: number;
  lastProcessedAt: number;
}

export class EventStreamProcessor extends EventEmitter {
  private rules: Map<string, ProcessingRule> = new Map();
  private metrics: StreamMetrics = {
    eventsProcessed: 0,
    averageProcessingTime: 0,
    errorRate: 0,
    throughput: 0,
    lastProcessedAt: 0
  };
  private processingTimes: number[] = [];
  private errorCount = 0;
  private startTime = Date.now();

  addRule(rule: ProcessingRule): void {
    this.rules.set(rule.id, rule);
    this.emit('rule_added', rule);
  }

  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      this.emit('rule_removed', ruleId);
    }
    return removed;
  }

  async processEvent(event: RealTimeDataEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      const applicableRules = this.getApplicableRules(event);
      const sortedRules = applicableRules.sort((a, b) => b.priority - a.priority);

      for (const rule of sortedRules) {
        try {
          await rule.action(event);
          this.emit('rule_executed', { ruleId: rule.id, event });
        } catch (error) {
          this.errorCount++;
          this.emit('rule_error', { ruleId: rule.id, event, error });
        }
      }

      this.updateMetrics(startTime);
      this.emit('event_processed', event);

    } catch (error) {
      this.errorCount++;
      this.emit('processing_error', { event, error });
    }
  }

  private getApplicableRules(event: RealTimeDataEvent): ProcessingRule[] {
    return Array.from(this.rules.values()).filter(rule => 
      rule.eventType === event.type && rule.condition(event)
    );
  }

  private updateMetrics(startTime: number): void {
    const processingTime = Date.now() - startTime;
    this.processingTimes.push(processingTime);
    
    // Keep only last 1000 processing times for rolling average
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }

    this.metrics.eventsProcessed++;
    this.metrics.averageProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    this.metrics.errorRate = this.errorCount / this.metrics.eventsProcessed;
    this.metrics.throughput = this.metrics.eventsProcessed / ((Date.now() - this.startTime) / 1000);
    this.metrics.lastProcessedAt = Date.now();
  }

  getMetrics(): StreamMetrics {
    return { ...this.metrics };
  }

  getRules(): ProcessingRule[] {
    return Array.from(this.rules.values());
  }

  clearRules(): void {
    this.rules.clear();
    this.emit('rules_cleared');
  }

  // Predefined rule factories
  static createTaskUpdateRule(action: (_event: RealTimeDataEvent) => Promise<void>): ProcessingRule {
    return {
      id: 'task_update_rule',
      eventType: 'task_update',
      condition: () => true,
      action,
      priority: 1
    };
  }

  static createHighPriorityTaskRule(action: (_event: RealTimeDataEvent) => Promise<void>): ProcessingRule {
    return {
      id: 'high_priority_task_rule',
      eventType: 'task_created',
      condition: (_event) => _event.data.priority?.priority === 'urgent',
      action,
      priority: 10
    };
  }

  static createStatusChangeRule(action: (_event: RealTimeDataEvent) => Promise<void>): ProcessingRule {
    return {
      id: 'status_change_rule',
      eventType: 'status_changed',
      condition: () => true,
      action,
      priority: 5
    };
  }
}
