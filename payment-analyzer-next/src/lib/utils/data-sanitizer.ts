/**
 * Data sanitization utilities to prevent JSON serialization issues
 */

import type { StringKeyObject } from "@/types/core";

/**
 * Check if value should be skipped during sanitization
 */
function shouldSkipValue(value: unknown): boolean {
  return typeof value === "function" || value === undefined;
}

/**
 * Sanitize an object's entries
 */
function sanitizeObject(obj: object): StringKeyObject | null {
  // Check for circular references or problematic objects
  try {
    JSON.stringify(obj);
  } catch (error) {
    console.warn("Object cannot be serialized, returning null:", error);
    return null;
  }

  const sanitized: StringKeyObject = {};
  for (const [key, value] of Object.entries(obj)) {
    if (shouldSkipValue(value)) {
      continue;
    }
    sanitized[key] = sanitizeForJson(value);
  }
  return sanitized;
}

/**
 * Safely convert unknown type to string or JSON
 */
function convertToSafeString(obj: unknown): unknown {
  try {
    // Check if obj is an object type that would stringify poorly
    if (typeof obj === "object" && obj !== null) {
      try {
        return JSON.stringify(obj);
      } catch {
        console.warn("Cannot serialize object, returning null");
        return null;
      }
    }
    return String(obj);
  } catch (error) {
    console.warn("Cannot convert to string, returning null:", error);
    return null;
  }
}

export function sanitizeForJson(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    return obj;
  }

  // Handle dates
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForJson(item));
  }

  // Handle objects
  if (typeof obj === "object") {
    return sanitizeObject(obj);
  }

  // For any other type, convert safely
  return convertToSafeString(obj);
}

export function isSerializable(obj: unknown): boolean {
  try {
    const sanitized = sanitizeForJson(obj);
    JSON.stringify(sanitized);
    return true;
  } catch {
    return false;
  }
}

export function safeStringify(obj: unknown): string {
  try {
    const sanitized = sanitizeForJson(obj);
    return JSON.stringify(sanitized);
  } catch (error) {
    console.warn("Failed to stringify object, returning empty object:", error);
    return "{}";
  }
}

export function safeParse<T>(str: string, defaultValue: T): T {
  try {
    if (typeof str !== "string") {
      return defaultValue;
    }

    // Check for the problematic "[object Object]" pattern
    if (str.includes("[object Object]") || str === "[object Object]") {
      console.warn('Detected "[object Object]" pattern in JSON string');
      return defaultValue;
    }

    const parsed = JSON.parse(str);
    return parsed ?? defaultValue;
  } catch (error) {
    console.warn("Failed to parse JSON string:", error);
    return defaultValue;
  }
}
