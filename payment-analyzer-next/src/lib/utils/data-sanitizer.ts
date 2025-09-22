/**
 * Data sanitization utilities to prevent JSON serialization issues
 */

import type { StringKeyObject } from '@/types/core';

export function sanitizeForJson(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  // Handle dates
  if (obj instanceof Date) {
    return obj.toISOString();
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForJson(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    // Check for circular references or problematic objects
    try {
      JSON.stringify(obj);
    } catch (error) {
      console.warn('Object cannot be serialized, returning null:', error);
      return null;
    }

    const sanitized: StringKeyObject = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip functions and undefined values
      if (typeof value === 'function' || value === undefined) {
        continue;
      }

      // Recursively sanitize nested objects
      sanitized[key] = sanitizeForJson(value);
    }
    return sanitized;
  }

  // For any other type, try to convert to string safely
  try {
    const str = String(obj);
    // Don't return "[object Object]" strings
    if (str === '[object Object]') {
      return null;
    }
    return str;
  } catch (error) {
    console.warn('Cannot convert to string, returning null:', error);
    return null;
  }
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
    console.warn('Failed to stringify object, returning empty object:', error);
    return '{}';
  }
}

export function safeParse<T>(str: string, defaultValue: T): T {
  try {
    if (typeof str !== 'string') {
      return defaultValue;
    }

    // Check for the problematic "[object Object]" pattern
    if (str.includes('[object Object]') || str === '[object Object]') {
      console.warn('Detected "[object Object]" pattern in JSON string');
      return defaultValue;
    }

    const parsed = JSON.parse(str);
    return parsed ?? defaultValue;
  } catch (error) {
    console.warn('Failed to parse JSON string:', error);
    return defaultValue;
  }
}