/**
 * Filename Sanitization Utility
 *
 * Prevents path traversal attacks (CWE-22)
 */

export const sanitizeFilename = (filename: string): string => {
  return filename
    // Remove path separators
    .replace(/[/\\]/g, '_')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Replace dangerous characters
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Remove consecutive dots (path traversal)
    .replace(/\.{2,}/g, '.')
    // Ensure it doesn't start with a dot
    .replace(/^\.+/, '')
    // Limit length
    .substring(0, 255)
    // Ensure not empty
    || 'unnamed_file';
};

export const validateFileExtension = (
  filename: string,
  allowedExtensions: string[]
): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? allowedExtensions.includes(ext) : false;
};
