/**
 * useFileUpdateDetection Hook
 *
 * Detects which files have been updated since the last analysis.
 * Compares file fingerprints with historical data to identify changes.
 *
 * @example
 * ```tsx
 * const { fileUpdateFlags, isLoading } = useFileUpdateDetection(uploadedFiles);
 *
 * // Use in component
 * {fileUpdateFlags[fileKey]?.isUpdated && (
 *   <FileUpdateMarker
 *     isUpdated={true}
 *     changeType={fileUpdateFlags[fileKey].changeType}
 *     lastProcessed={fileUpdateFlags[fileKey].lastProcessed}
 *   />
 * )}
 * ```
 */

"use client";

import { useEffect, useState } from "react";
import { FileFingerprintService } from "@/lib/services/file-fingerprint-service";

/**
 * File update flag information
 */
export interface FileUpdateFlag {
  /**
   * Whether the file has been updated
   */
  isUpdated: boolean;

  /**
   * Type of change detected
   */
  changeType?: "name" | "size" | "content" | "timestamp";

  /**
   * When the file was last processed
   */
  lastProcessed?: number;

  /**
   * Hash of the previous version
   */
  previousHash?: string;

  /**
   * Hash of the current version
   */
  currentHash?: string;

  /**
   * Whether this is a completely new file
   */
  isNew: boolean;
}

/**
 * Map of file keys to update flags
 */
export type FileUpdateFlags = Record<string, FileUpdateFlag>;

/**
 * Generate a unique key for a file
 */
function generateFileKey(file: File): string {
  return `${file.name}-${file.size}`;
}

/**
 * Hook to detect file updates by comparing with historical fingerprints
 *
 * @param files - Array of files to check for updates
 * @returns Object containing file update flags and loading state
 */
export function useFileUpdateDetection(files: File[]): {
  fileUpdateFlags: FileUpdateFlags;
  isLoading: boolean;
  error: string | null;
} {
  const [fileUpdateFlags, setFileUpdateFlags] = useState<FileUpdateFlags>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function detectUpdates() {
      if (!files || files.length === 0) {
        setFileUpdateFlags({});
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const updateFlags: FileUpdateFlags = {};

        // Process each file
        for (const file of files) {
          const fileKey = generateFileKey(file);

          try {
            // Compare with existing fingerprints
            const comparison = await FileFingerprintService.compareWithExisting(file);

            // Determine if file is updated
            const isUpdated =
              comparison.hasChanged && !comparison.isDuplicate && !!comparison.previousFingerprint;

            // Generate current hash for reference
            const currentHash = await FileFingerprintService.generateHash(file);

            // Create update flag
            updateFlags[fileKey] = {
              isUpdated,
              changeType: comparison.changeType,
              lastProcessed: comparison.previousFingerprint?.processedAt,
              previousHash: comparison.previousFingerprint?.hash,
              currentHash,
              isNew: !comparison.previousFingerprint,
            };
          } catch (fileError) {
            console.error(`Failed to detect updates for file ${file.name}:`, fileError);
            // Mark as new file if we can't determine update status
            updateFlags[fileKey] = {
              isUpdated: false,
              isNew: true,
            };
          }
        }

        if (isMounted) {
          setFileUpdateFlags(updateFlags);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("File update detection failed:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to detect file updates");
          setIsLoading(false);
        }
      }
    }

    detectUpdates();

    return () => {
      isMounted = false;
    };
  }, [files]);

  return {
    fileUpdateFlags,
    isLoading,
    error,
  };
}

/**
 * Helper function to check if any files have updates
 */
export function hasAnyUpdates(fileUpdateFlags: FileUpdateFlags): boolean {
  return Object.values(fileUpdateFlags).some((flag) => flag.isUpdated);
}

/**
 * Helper function to get count of updated files
 */
export function getUpdatedFilesCount(fileUpdateFlags: FileUpdateFlags): number {
  return Object.values(fileUpdateFlags).filter((flag) => flag.isUpdated).length;
}

/**
 * Helper function to get count of new files
 */
export function getNewFilesCount(fileUpdateFlags: FileUpdateFlags): number {
  return Object.values(fileUpdateFlags).filter((flag) => flag.isNew).length;
}
