import { CloudEventMessage } from '../types';

type EventHandler = (event: CloudEventMessage) => void;

class CloudEventBus {
  private listeners: Set<EventHandler> = new Set();
  private history: CloudEventMessage[] = [];

  public subscribe(handler: EventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public publish<T extends Record<string, unknown> = Record<string, unknown>>(params: {
    source: string;
    type: string;
    severity?: 'nominal' | 'warning' | 'hazard';
    title: string;
    message: string;
    data?: T;
  }): CloudEventMessage<T> {
    const event: CloudEventMessage<T> = {
      specversion: '1.0',
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: params.source,
      type: params.type,
      time: new Date().toISOString(),
      severity: params.severity ?? 'nominal',
      title: params.title,
      message: params.message,
      data: params.data,
    };

    this.history = [event, ...this.history].slice(0, 60);
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('EventBus listener error:', err);
      }
    }
    return event;
  }

  public getHistory(): CloudEventMessage[] {
    return this.history;
  }
}

export const eventBus = new CloudEventBus();
