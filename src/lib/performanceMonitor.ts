/**
 * Performance Monitoring
 * Tracks message delivery times and other performance metrics
 */

interface MessageMetrics {
  sendStartTime: number;
  deliveryTime?: number;
  messageId: string;
  tempId: string;
  conversationId: string;
}

const metrics = new Map<string, MessageMetrics>();

/**
 * Start timing a message send operation
 */
export function startMessageTimer(
  tempId: string,
  conversationId: string
): void {
  metrics.set(tempId, {
    sendStartTime: Date.now(),
    messageId: "",
    tempId,
    conversationId,
  });
}

/**
 * End timing a message send operation and return delivery time
 */
export function endMessageTimer(tempId: string, messageId: string): number {
  const metric = metrics.get(tempId);
  if (!metric) return -1;

  const deliveryTime = Date.now() - metric.sendStartTime;
  metric.deliveryTime = deliveryTime;
  metric.messageId = messageId;

  // Log performance
  if (deliveryTime > 300) {
    console.warn(
      `⚠️ Slow message delivery: ${deliveryTime}ms (tempId: ${tempId})`
    );
  } else if (deliveryTime > 200) {
    console.log(`🟡 Moderate message delivery: ${deliveryTime}ms`);
  } else {
    console.log(`✅ Fast message delivery: ${deliveryTime}ms`);
  }

  // Clean up after 30 seconds
  setTimeout(() => metrics.delete(tempId), 30000);

  return deliveryTime;
}

/**
 * Get average delivery time across all recent messages
 */
export function getAverageDeliveryTime(): number {
  const deliveryTimes = Array.from(metrics.values())
    .filter((m) => m.deliveryTime !== undefined)
    .map((m) => m.deliveryTime!);

  if (deliveryTimes.length === 0) return 0;
  return Math.round(
    deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
  );
}

/**
 * Get detailed metrics for debugging
 */
export function getDetailedMetrics(): {
  count: number;
  average: number;
  min: number;
  max: number;
  recent: MessageMetrics[];
} {
  const completedMetrics = Array.from(metrics.values()).filter(
    (m) => m.deliveryTime !== undefined
  );

  if (completedMetrics.length === 0) {
    return {
      count: 0,
      average: 0,
      min: 0,
      max: 0,
      recent: [],
    };
  }

  const deliveryTimes = completedMetrics.map((m) => m.deliveryTime!);

  return {
    count: completedMetrics.length,
    average: Math.round(
      deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length
    ),
    min: Math.min(...deliveryTimes),
    max: Math.max(...deliveryTimes),
    recent: completedMetrics.slice(-10), // Last 10 messages
  };
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  metrics.clear();
}
