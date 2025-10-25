/**
 * Date/Time Parser for Meeting Scheduler
 * Parses natural language dates and times using chrono-node
 *
 * Supports formats:
 * - "next friday at 3pm"
 * - "11/4 at 2pm"
 * - "november 4th at 9am"
 * - "nov 4th 4pm"
 * - "thursday at 4pm"
 * - "earliest available starting at 9"
 */

import * as chrono from "chrono-node";
import { format, addDays, setHours, setMinutes, startOfDay } from "date-fns";

export interface ParsedDateTime {
  date: Date;
  isRelative: boolean;
  originalText: string;
  confidence: "high" | "medium" | "low";
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

/**
 * Parse natural language date/time string into a Date object
 */
export function parseDateTime(
  text: string,
  baseDate: Date = new Date()
): ParsedDateTime | null {
  try {
    // Use chrono for natural language parsing
    const results = chrono.parse(text, baseDate, { forwardDate: true });

    if (results.length === 0) {
      return null;
    }

    const result = results[0];
    const date = result.start.date();

    // Determine if it's a relative date
    const isRelative = /next|this|tomorrow|today|upcoming/i.test(text);

    // Determine confidence based on chrono's certainty
    let confidence: "high" | "medium" | "low" = "medium";
    if (result.start.isCertain("hour") && result.start.isCertain("day")) {
      confidence = "high";
    } else if (!result.start.isCertain("hour")) {
      confidence = "low";
    }

    return {
      date,
      isRelative,
      originalText: text,
      confidence,
    };
  } catch (error) {
    console.error("Error parsing date/time:", error);
    return null;
  }
}

/**
 * Parse "earliest available" or "his earliest" type queries
 * Returns a starting time preference
 */
export function parseEarliestAvailable(text: string): Date | null {
  try {
    // Look for time mentions like "starting at 9", "after 10am"
    const timeMatch = text.match(
      /(?:starting at|after|from)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
    );

    if (timeMatch) {
      const timeStr = timeMatch[1];
      const parsed = chrono.parse(timeStr, new Date());
      if (parsed.length > 0) {
        const time = parsed[0].start.date();
        // Set to tomorrow as default for "earliest available"
        const tomorrow = addDays(startOfDay(new Date()), 1);
        return setHours(
          setMinutes(tomorrow, time.getMinutes()),
          time.getHours()
        );
      }
    }

    // Default to 9 AM tomorrow if no specific time
    const tomorrow = addDays(startOfDay(new Date()), 1);
    return setHours(tomorrow, 9);
  } catch (error) {
    console.error("Error parsing earliest available:", error);
    return null;
  }
}

/**
 * Format date for display
 */
export function formatDateTime(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy 'at' h:mm a");
}

/**
 * Format date for display (short version)
 */
export function formatDateTimeShort(date: Date): string {
  return format(date, "MMM d 'at' h:mm a");
}

/**
 * Check if date is in the past
 */
export function isInPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Get time window (start and end) for a meeting
 * Assumes 1 hour default duration
 */
export function getTimeWindow(
  startDate: Date,
  durationMinutes: number = 60
): TimeWindow {
  const end = new Date(startDate);
  end.setMinutes(end.getMinutes() + durationMinutes);

  return {
    start: startDate,
    end,
  };
}

/**
 * Parse duration from text (e.g., "30 minutes", "1 hour", "2 hours")
 */
export function parseDuration(text: string): number {
  const match = text.match(/(\d+)\s*(minute|min|hour|hr)s?/i);
  if (!match) return 60; // Default 1 hour

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("h")) {
    return value * 60;
  }
  return value;
}

/**
 * Extract date/time from various query formats
 */
export function extractDateTime(query: string): ParsedDateTime | null {
  // Common patterns
  const patterns = [
    // "next friday at 3pm"
    /(?:next|this|on)\s+(\w+)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    // "11/4 at 2pm"
    /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    // "november 4th at 9am"
    /(\w+\s+\d{1,2}(?:st|nd|rd|th)?)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
    // "tomorrow at 2pm"
    /(tomorrow|today)\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      // Found a pattern, use chrono to parse the full matched text
      return parseDateTime(match[0]);
    }
  }

  // Fallback to general chrono parsing
  return parseDateTime(query);
}

/**
 * Validate that a date is reasonable (not too far in past/future)
 */
export function isReasonableDate(date: Date): boolean {
  const now = new Date();
  const oneYearFromNow = addDays(now, 365);
  const oneDayAgo = addDays(now, -1);

  return date >= oneDayAgo && date <= oneYearFromNow;
}

