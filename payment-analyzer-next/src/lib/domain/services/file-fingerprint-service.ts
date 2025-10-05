/**
 * FileFingerprintService Domain Service
 * Creates unique fingerprints for file combinations to detect duplicates
 */

export interface FileInfo {
  name: string;
  size: number;
  lastModified: number;
  content?: string; // For additional content-based fingerprinting
}

export interface FingerprintResult {
  fingerprint: string;            // Modern SHA-256 fingerprint (primary)
  legacyFingerprint?: string;     // Legacy Base64 + 32-bit hash (for compatibility)
  components: {
    fileHashes: string[];
    combinedHash: string;
    metadata: {
      fileCount: number;
      totalSize: number;
      fileTypes: string[];
    };
  };
}

export class FileFingerprintService {
  /**
   * Creates a unique fingerprint for a set of files
   * This matches the original system's duplicate detection logic
   */
  async createFingerprint(files: FileInfo[]): Promise<FingerprintResult> {
    if (files.length === 0) {
      throw new Error('Cannot create fingerprint for empty file list');
    }

    // Sort files by name to ensure consistent fingerprinting
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

    // Create individual file hashes
    const fileHashes = await Promise.all(
      sortedFiles.map(file => this.createFileHash(file))
    );

    // Combine file hashes with metadata
    const metadata = {
      fileCount: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      fileTypes: [...new Set(files.map(file => this.getFileType(file.name)))],
    };

    // Create combined hash
    const combinedData = {
      fileHashes: fileHashes.sort(), // Sort hashes for consistency
      metadata,
    };

    const combinedHash = await this.hashString(JSON.stringify(combinedData));

    // Generate legacy fingerprint for backward compatibility
    const legacyFingerprint = this.createLegacyFingerprint(sortedFiles);

    return {
      fingerprint: combinedHash,
      legacyFingerprint,
      components: {
        fileHashes,
        combinedHash,
        metadata,
      },
    };
  }

  /**
   * Creates a fingerprint from manual entry data
   * Used when no files are uploaded
   */
  async createManualFingerprint(data: {
    userId: string;
    startDate: Date;
    endDate: Date;
    entries: Array<{
      date: Date;
      consignments: number;
      paidAmount: number;
    }>;
  }): Promise<string> {
    const fingerprintData = {
      source: 'manual',
      userId: data.userId,
      period: {
        start: data.startDate.toISOString(),
        end: data.endDate.toISOString(),
      },
      entries: data.entries
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(entry => ({
          date: entry.date.toISOString(),
          consignments: entry.consignments,
          paidAmount: Math.round(entry.paidAmount * 100), // Round to avoid floating point issues
        })),
    };

    return await this.hashString(JSON.stringify(fingerprintData));
  }

  /**
   * Checks if two fingerprints are similar (for near-duplicate detection)
   */
  areSimilar(fingerprint1: string, fingerprint2: string): boolean {
    // Exact match for now - could implement fuzzy matching later
    return fingerprint1 === fingerprint2;
  }

  /**
   * Creates legacy-compatible fingerprint using Base64 + 32-bit hash algorithm
   * Exact replica of original system (lines 7123-7154) for backward compatibility
   */
  private createLegacyFingerprint(files: FileInfo[]): string {
    // Create file info object matching legacy format
    const fileInfo = files.map(file => ({
      name: file.name,
      size: file.size,
      lastModified: file.lastModified
    }));

    // Convert to JSON string (same as legacy)
    const jsonString = JSON.stringify(fileInfo);

    // Convert to Base64 (browser btoa equivalent)
    const base64 = typeof btoa !== 'undefined'
      ? btoa(jsonString)
      : Buffer.from(jsonString).toString('base64');

    // Calculate 32-bit hash using exact legacy algorithm
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      // JavaScript uses 32-bit integers for bitwise operations
      hash = ((hash << 5) - hash) + jsonString.charCodeAt(i);
      // Force 32-bit integer by using bitwise OR with 0
      hash = hash | 0;
    }

    // Combine: Base64 (alphanumeric only) + hash in base36
    const alphanumericBase64 = base64.replace(/[^a-zA-Z0-9]/g, '');
    const hashBase36 = Math.abs(hash).toString(36);
    const combined = alphanumericBase64 + hashBase36;

    // Truncate to 64 characters (same as legacy)
    return combined.substring(0, 64);
  }

  /**
   * Extracts date range from file names (matching original system logic)
   */
  extractDateRange(files: FileInfo[]): { start: Date | null; end: Date | null } {
    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    for (const file of files) {
      const dates = this.extractDatesFromFileName(file.name);
      
      for (const date of dates) {
        if (!earliestDate || date < earliestDate) {
          earliestDate = date;
        }
        if (!latestDate || date > latestDate) {
          latestDate = date;
        }
      }
    }

    return { start: earliestDate, end: latestDate };
  }

  private async createFileHash(file: FileInfo): Promise<string> {
    const fileData = {
      name: file.name.toLowerCase(), // Normalize case
      size: file.size,
      lastModified: file.lastModified,
      // Include partial content hash if available
      contentPrefix: file.content?.substring(0, 1000) || '',
    };

    return await this.hashString(JSON.stringify(fileData));
  }

  private async hashString(input: string): Promise<string> {
    // Use Web Crypto API for consistent hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getFileType(fileName: string): string {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    
    // Classify based on content patterns (matching original system)
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes('runsheet') || lowerName.includes('dv_')) {
      return 'runsheet';
    }
    
    if (lowerName.includes('self') || 
        lowerName.includes('invoice') || 
        lowerName.includes('bill')) {
      return 'invoice';
    }
    
    return extension || 'unknown';
  }

  private extractDatesFromFileName(fileName: string): Date[] {
    const dates: Date[] = [];
    
    // Common date patterns in file names
    const datePatterns = [
      // DD-MM-YYYY or DD/MM/YYYY
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
      // YYYY-MM-DD
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
      // DD-MM-YY or DD/MM/YY  
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/g,
    ];

    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(fileName)) !== null) {
        try {
          let year, month, day;
          
          if (match[3] && match[3].length === 4) {
            // DD-MM-YYYY format
            day = parseInt(match[1]);
            month = parseInt(match[2]) - 1; // Month is 0-indexed
            year = parseInt(match[3]);
          } else if (match[1] && match[1].length === 4) {
            // YYYY-MM-DD format
            year = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
            day = parseInt(match[3]);
          } else {
            // DD-MM-YY format
            day = parseInt(match[1]);
            month = parseInt(match[2]) - 1;
            year = parseInt(match[3]);
            // Assume years 00-30 are 2000-2030, 31-99 are 1931-1999
            year += year <= 30 ? 2000 : 1900;
          }

          const date = new Date(year, month, day);
          
          // Validate the date
          if (date.getFullYear() === year && 
              date.getMonth() === month && 
              date.getDate() === day) {
            dates.push(date);
          }
        } catch {
          // Ignore invalid dates
        }
      }
    }

    return dates;
  }
}