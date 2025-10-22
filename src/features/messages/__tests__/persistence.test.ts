/**
 * Persistence Tests
 * Tests for queue survival, logout hygiene, and schema migrations
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  APP_STATE_SCHEMA_VERSION,
  runMigrations,
  addToQueue,
  getQueue,
  removeFromQueue,
  updateQueueItem,
  shouldRetryMessage,
  calculateRetryDelay,
  saveDraft,
  getDraft,
  clearDraft,
  saveScrollPosition,
  getScrollPosition,
  saveSelectedConversation,
  getSelectedConversation,
  saveThemePreferences,
  getThemePreferences,
  clearAllCachesExceptPrefs,
  QueuedMessage,
} from "../persistence";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  clear: jest.fn(),
}));

describe("Persistence - Schema Migrations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize schema version on first run", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await runMigrations();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@whisper:schema_version",
      APP_STATE_SCHEMA_VERSION.toString()
    );
  });

  it("should skip migrations if already on current version", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      APP_STATE_SCHEMA_VERSION.toString()
    );

    await runMigrations();

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("should run migrations from old version to new version", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("0");

    await runMigrations();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@whisper:schema_version",
      APP_STATE_SCHEMA_VERSION.toString()
    );
  });
});

describe("Persistence - Outbound Queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should add message to queue", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const message: QueuedMessage = {
      tempId: "temp_123",
      conversationId: "conv_1",
      type: "text",
      text: "Hello",
      timestamp: Date.now(),
      retryCount: 0,
    };

    await addToQueue(message);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@whisper:outbound_queue",
      JSON.stringify([message])
    );
  });

  it("should get queue from storage", async () => {
    const messages: QueuedMessage[] = [
      {
        tempId: "temp_123",
        conversationId: "conv_1",
        type: "text",
        text: "Hello",
        timestamp: Date.now(),
        retryCount: 0,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(messages)
    );

    const queue = await getQueue();

    expect(queue).toEqual(messages);
  });

  it("should return empty array if queue is empty", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const queue = await getQueue();

    expect(queue).toEqual([]);
  });

  it("should remove message from queue by tempId", async () => {
    const messages: QueuedMessage[] = [
      {
        tempId: "temp_123",
        conversationId: "conv_1",
        type: "text",
        text: "Hello",
        timestamp: Date.now(),
        retryCount: 0,
      },
      {
        tempId: "temp_456",
        conversationId: "conv_1",
        type: "text",
        text: "World",
        timestamp: Date.now(),
        retryCount: 0,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(messages)
    );

    await removeFromQueue("temp_123");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@whisper:outbound_queue",
      JSON.stringify([messages[1]])
    );
  });

  it("should update queue item", async () => {
    const messages: QueuedMessage[] = [
      {
        tempId: "temp_123",
        conversationId: "conv_1",
        type: "text",
        text: "Hello",
        timestamp: Date.now(),
        retryCount: 0,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(messages)
    );

    await updateQueueItem("temp_123", {
      retryCount: 1,
      lastRetryAt: Date.now(),
    });

    expect(AsyncStorage.setItem).toHaveBeenCalled();
    const savedQueue = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1]
    );
    expect(savedQueue[0].retryCount).toBe(1);
    expect(savedQueue[0].lastRetryAt).toBeDefined();
  });
});

describe("Persistence - Retry Logic", () => {
  it("should calculate exponential backoff delay", () => {
    expect(calculateRetryDelay(0)).toBe(1000); // 1s
    expect(calculateRetryDelay(1)).toBe(2000); // 2s
    expect(calculateRetryDelay(2)).toBe(4000); // 4s
    expect(calculateRetryDelay(3)).toBe(8000); // 8s
    expect(calculateRetryDelay(4)).toBe(16000); // 16s
    expect(calculateRetryDelay(5)).toBe(32000); // 32s
    expect(calculateRetryDelay(6)).toBe(32000); // 32s (capped)
    expect(calculateRetryDelay(10)).toBe(32000); // 32s (capped)
  });

  it("should retry message on first attempt", () => {
    const message: QueuedMessage = {
      tempId: "temp_123",
      conversationId: "conv_1",
      type: "text",
      text: "Hello",
      timestamp: Date.now(),
      retryCount: 0,
    };

    expect(shouldRetryMessage(message)).toBe(true);
  });

  it("should not retry message after max retries", () => {
    const message: QueuedMessage = {
      tempId: "temp_123",
      conversationId: "conv_1",
      type: "text",
      text: "Hello",
      timestamp: Date.now(),
      retryCount: 6,
      lastRetryAt: Date.now(),
    };

    expect(shouldRetryMessage(message)).toBe(false);
  });

  it("should not retry message if delay has not elapsed", () => {
    const message: QueuedMessage = {
      tempId: "temp_123",
      conversationId: "conv_1",
      type: "text",
      text: "Hello",
      timestamp: Date.now(),
      retryCount: 1,
      lastRetryAt: Date.now(), // Just now
    };

    expect(shouldRetryMessage(message)).toBe(false);
  });

  it("should retry message if delay has elapsed", () => {
    const message: QueuedMessage = {
      tempId: "temp_123",
      conversationId: "conv_1",
      type: "text",
      text: "Hello",
      timestamp: Date.now(),
      retryCount: 1,
      lastRetryAt: Date.now() - 3000, // 3 seconds ago (> 2s required delay)
    };

    expect(shouldRetryMessage(message)).toBe(true);
  });
});

describe("Persistence - Drafts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should save draft", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await saveDraft("conv_1", "Hello World");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@whisper:drafts",
      JSON.stringify({ conv_1: "Hello World" })
    );
  });

  it("should get draft", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ conv_1: "Hello World" })
    );

    const draft = await getDraft("conv_1");

    expect(draft).toBe("Hello World");
  });

  it("should clear draft", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ conv_1: "Hello World", conv_2: "Goodbye" })
    );

    await clearDraft("conv_1");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@whisper:drafts",
      JSON.stringify({ conv_2: "Goodbye" })
    );
  });
});

describe("Persistence - Scroll Position", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should save scroll position", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await saveScrollPosition("conv_1", 100);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@whisper:scroll_positions",
      JSON.stringify({ conv_1: 100 })
    );
  });

  it("should get scroll position", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ conv_1: 100 })
    );

    const position = await getScrollPosition("conv_1");

    expect(position).toBe(100);
  });
});

describe("Persistence - Selected Conversation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should save selected conversation", async () => {
    await saveSelectedConversation("conv_1");

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@whisper:selected_conversation",
      "conv_1"
    );
  });

  it("should get selected conversation", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("conv_1");

    const conversationId = await getSelectedConversation();

    expect(conversationId).toBe("conv_1");
  });
});

describe("Persistence - Theme Preferences", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should save theme preferences", async () => {
    const prefs = { darkMode: true, accentColor: "#6B4CFF" };

    await saveThemePreferences(prefs);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@whisper:theme_prefs",
      JSON.stringify(prefs)
    );
  });

  it("should get theme preferences", async () => {
    const prefs = { darkMode: true, accentColor: "#6B4CFF" };
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(prefs)
    );

    const result = await getThemePreferences();

    expect(result).toEqual(prefs);
  });
});

describe("Persistence - Logout Hygiene", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should clear all caches except theme preferences on logout", async () => {
    await clearAllCachesExceptPrefs();

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      "@whisper:drafts",
      "@whisper:scroll_positions",
      "@whisper:outbound_queue",
      "@whisper:selected_conversation",
    ]);

    // Verify theme preferences key is NOT in the list
    const removedKeys = (AsyncStorage.multiRemove as jest.Mock).mock
      .calls[0][0];
    expect(removedKeys).not.toContain("@whisper:theme_prefs");
  });
});

describe("Persistence - Queue Survival After Restart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should persist queue across app restarts", async () => {
    // Simulate adding messages to queue
    const messages: QueuedMessage[] = [
      {
        tempId: "temp_123",
        conversationId: "conv_1",
        type: "text",
        text: "Hello",
        timestamp: Date.now(),
        retryCount: 0,
      },
      {
        tempId: "temp_456",
        conversationId: "conv_2",
        type: "text",
        text: "World",
        timestamp: Date.now(),
        retryCount: 1,
        lastRetryAt: Date.now() - 5000,
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    // Add first message
    await addToQueue(messages[0]);

    // Simulate app restart - get current queue state
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify([messages[0]])
    );

    // Add second message after "restart"
    await addToQueue(messages[1]);

    // Verify both messages are in queue
    const finalQueue = JSON.parse(
      (AsyncStorage.setItem as jest.Mock).mock.calls[1][1]
    );
    expect(finalQueue).toHaveLength(2);
    expect(finalQueue[0].tempId).toBe("temp_123");
    expect(finalQueue[1].tempId).toBe("temp_456");
  });

  it("should restore and process queue on app restart", async () => {
    const queuedMessages: QueuedMessage[] = [
      {
        tempId: "temp_123",
        conversationId: "conv_1",
        type: "text",
        text: "Hello",
        timestamp: Date.now() - 10000, // 10 seconds ago
        retryCount: 2,
        lastRetryAt: Date.now() - 5000, // 5 seconds ago
      },
    ];

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify(queuedMessages)
    );

    const queue = await getQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].tempId).toBe("temp_123");
    expect(queue[0].retryCount).toBe(2);

    // Verify message should be retried (5s elapsed > 4s required for retry 2)
    expect(shouldRetryMessage(queue[0])).toBe(true);
  });
});
