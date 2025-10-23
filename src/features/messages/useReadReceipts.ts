/**
 * Hook for subscribing to read receipts in a conversation
 */

import { useEffect, useState } from "react";
import { subscribeToReadReceipts, ParticipantReadStatus } from "./readReceipts";

export function useReadReceipts(conversationId: string) {
  const [readReceipts, setReadReceipts] = useState<ParticipantReadStatus[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToReadReceipts(
      conversationId,
      (participants) => {
        setReadReceipts(participants);
      },
      (error) => {
        console.error("Error subscribing to read receipts:", error);
      }
    );

    return unsubscribe;
  }, [conversationId]);

  return readReceipts;
}
