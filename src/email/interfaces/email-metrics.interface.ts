export interface EmailMetrics {
  totalSent: number;
  totalFailed: number;
  averageDeliveryTime: number;
  queueLength?: number;
  lastError?: {
    timestamp: Date;
    error: string;
  };
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  processingTime: {
    avg: number;
    min: number;
    max: number;
  };
}

export interface EmailHealthStatus {
  status: 'up' | 'down';
  details: {
    mailer: boolean;
    queue?: boolean;
    lastCheck: Date;
    error?: string;
  };
} 