/**
 * File Fingerprinting Service
 * SHA-256 hashing for duplicate detection and file change tracking
 * Matches the original HTML functionality
 */

export interface FileFingerprint {
  name: string;
  size: number;
  lastModified: number;
  hash: string;
  type: 'runsheet' | 'invoice' | 'unknown';
  processedAt: number;
  analysisId?: string;
}

export interface FileComparison {
  isIdentical: boolean;
  isDuplicate: boolean;
  hasChanged: boolean;
  previousFingerprint?: FileFingerprint;
  changeType?: 'name' | 'size' | 'content' | 'timestamp';
}

export interface FingerprintValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  duplicates: Array<{
    current: FileFingerprint;
    existing: FileFingerprint;
    type: 'identical' | 'similar' | 'updated';
  }>;
}

export class FileFingerprintService {
  private static readonly FINGERPRINTS_KEY = 'pa:fingerprints:v9';
  private static readonly MAX_FINGERPRINTS = 1000; // Limit storage size

  /**
   * Generate SHA-256 hash from file content using chunk processing
   */
  static async generateHash(file: File): Promise<string> {
    try {
      // Use chunk processing to prevent UI blocking on large files
      return await this.generateHashInChunks(file);
    } catch (error) {
      console.error('Hash generation failed:', error);
      // Fallback to simple hash based on file properties
      return this.generateSimpleHash(file);
    }
  }

  /**
   * Process file in chunks to prevent UI blocking
   */
  private static async generateHashInChunks(file: File): Promise<string> {
    const chunkSize = 64 * 1024; // 64KB chunks

    // For small files, use direct processing
    if (file.size <= chunkSize) {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // For large files, process in chunks with yield points
    let offset = 0;
    const chunks: ArrayBuffer[] = [];

    while (offset < file.size) {
      const chunk = file.slice(offset, offset + chunkSize);
      const arrayBuffer = await chunk.arrayBuffer();
      chunks.push(arrayBuffer);
      offset += chunkSize;

      // Yield control to prevent UI blocking
      if (chunks.length % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Combine all chunks and hash
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combined = new Uint8Array(totalSize);
    let position = 0;

    for (const chunk of chunks) {
      combined.set(new Uint8Array(chunk), position);
      position += chunk.byteLength;
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Fallback hash generation using file metadata
   */
  private static generateSimpleHash(file: File): string {
    const data = `${file.name}-${file.size}-${file.lastModified}-${file.type}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Detect file type based on filename patterns
   */
  static detectFileType(filename: string): 'runsheet' | 'invoice' | 'unknown' {
    const name = filename.toLowerCase();
    if (name.includes('runsheet') || name.includes('dv_')) {
      return 'runsheet';
    }
    if (name.includes('invoice') || name.includes('bill') || name.includes('self')) {
      return 'invoice';
    }
    return 'unknown';
  }

  /**
   * Create fingerprint for a file
   */
  static async createFingerprint(
    file: File, 
    analysisId?: string
  ): Promise<FileFingerprint> {
    const hash = await this.generateHash(file);
    const type = this.detectFileType(file.name);
    
    return {
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      hash,
      type,
      processedAt: Date.now(),
      analysisId
    };
  }

  /**
   * Create fingerprints for multiple files
   */
  static async createFingerprints(
    files: File[], 
    analysisId?: string
  ): Promise<FileFingerprint[]> {
    const fingerprints: FileFingerprint[] = [];
    
    for (const file of files) {
      try {
        const fingerprint = await this.createFingerprint(file, analysisId);
        fingerprints.push(fingerprint);
      } catch (error) {
        console.error(`Failed to fingerprint file ${file.name}:`, error);
      }
    }
    
    return fingerprints;
  }

  /**
   * Save fingerprints to storage
   */
  static saveFingerprints(fingerprints: FileFingerprint[]): void {
    try {
      const existing = this.loadAllFingerprints();
      const combined = [...existing, ...fingerprints];
      
      // Keep only the most recent fingerprints (prevent storage bloat)
      const sorted = combined.sort((a, b) => b.processedAt - a.processedAt);
      const limited = sorted.slice(0, this.MAX_FINGERPRINTS);
      
      localStorage.setItem(this.FINGERPRINTS_KEY, JSON.stringify(limited));
      console.log(`💾 Saved ${fingerprints.length} fingerprints, total: ${limited.length}`);
      
    } catch (error) {
      console.error('Failed to save fingerprints:', error);
    }
  }

  /**
   * Load all fingerprints from storage
   */
  static loadAllFingerprints(): FileFingerprint[] {
    try {
      const data = localStorage.getItem(this.FINGERPRINTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load fingerprints:', error);
      return [];
    }
  }

  /**
   * Find existing fingerprint for a file
   */
  static findExistingFingerprint(file: File): FileFingerprint | null {
    const fingerprints = this.loadAllFingerprints();
    
    // First, try to find by exact match (name, size, lastModified)
    let existing = fingerprints.find(fp => 
      fp.name === file.name && 
      fp.size === file.size && 
      fp.lastModified === file.lastModified
    );
    
    if (!existing) {
      // Fallback: find by name and size only (for modified files)
      existing = fingerprints.find(fp => 
        fp.name === file.name && 
        fp.size === file.size
      );
    }
    
    return existing || null;
  }

  /**
   * Compare file with existing fingerprints
   */
  static async compareWithExisting(file: File): Promise<FileComparison> {
    const existing = this.findExistingFingerprint(file);
    
    if (!existing) {
      return {
        isIdentical: false,
        isDuplicate: false,
        hasChanged: false
      };
    }

    // Check if file is identical (same content)
    const currentHash = await this.generateHash(file);
    const isIdentical = currentHash === existing.hash;
    
    // Check if file has changed
    const hasChanged = file.lastModified > existing.lastModified;
    
    // Determine change type
    let changeType: 'name' | 'size' | 'content' | 'timestamp' | undefined;
    if (!isIdentical) {
      if (file.size !== existing.size) {
        changeType = 'size';
      } else if (file.lastModified !== existing.lastModified) {
        changeType = 'timestamp';
      } else {
        changeType = 'content';
      }
    }
    
    return {
      isIdentical,
      isDuplicate: isIdentical && !hasChanged,
      hasChanged,
      previousFingerprint: existing,
      changeType
    };
  }

  /**
   * Validate set of files for duplicates and issues
   */
  static async validateFileSet(files: File[]): Promise<FingerprintValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const duplicates: FingerprintValidation['duplicates'] = [];
    
    // Create fingerprints for current files
    const currentFingerprints = await this.createFingerprints(files);
    
    // Check for duplicates within current set
    const seenHashes = new Map<string, FileFingerprint>();
    
    for (const fingerprint of currentFingerprints) {
      const existing = seenHashes.get(fingerprint.hash);
      if (existing) {
        duplicates.push({
          current: fingerprint,
          existing,
          type: 'identical'
        });
        errors.push(`Duplicate files detected: "${fingerprint.name}" and "${existing.name}"`);
      } else {
        seenHashes.set(fingerprint.hash, fingerprint);
      }
    }
    
    // Check against historical fingerprints
    for (const file of files) {
      const comparison = await this.compareWithExisting(file);
      
      if (comparison.isDuplicate) {
        duplicates.push({
          current: currentFingerprints.find(fp => fp.name === file.name)!,
          existing: comparison.previousFingerprint!,
          type: 'identical'
        });
        warnings.push(`File "${file.name}" was already processed on ${new Date(comparison.previousFingerprint!.processedAt).toLocaleDateString()}`);
      } else if (comparison.hasChanged && comparison.previousFingerprint) {
        duplicates.push({
          current: currentFingerprints.find(fp => fp.name === file.name)!,
          existing: comparison.previousFingerprint,
          type: 'updated'
        });
        warnings.push(`File "${file.name}" has been modified since last analysis (${comparison.changeType})`);
      }
    }
    
    // Validate file types
    const runsheets = currentFingerprints.filter(fp => fp.type === 'runsheet').length;
    const invoices = currentFingerprints.filter(fp => fp.type === 'invoice').length;
    
    if (runsheets === 0 && invoices > 0) {
      warnings.push('No runsheet files detected - payment calculations may be incomplete');
    }
    
    if (invoices === 0 && runsheets > 0) {
      warnings.push('No invoice files detected - paid amounts will be zero');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      duplicates
    };
  }

  /**
   * Generate file set signature for caching
   */
  static async generateFileSetSignature(files: File[]): Promise<string> {
    const fingerprints = await this.createFingerprints(files);
    const hashes = fingerprints.map(fp => fp.hash).sort().join('-');
    return hashes;
  }

  /**
   * Check if files match a previous analysis
   */
  static async findMatchingAnalysis(files: File[]): Promise<{
    hasMatch: boolean;
    analysisId?: string;
    matchedFingerprints?: FileFingerprint[];
    confidence: 'exact' | 'partial' | 'none';
  }> {
    const currentSignature = await this.generateFileSetSignature(files);
    const allFingerprints = this.loadAllFingerprints();
    
    // Group fingerprints by analysis ID
    const analysisSets = new Map<string, FileFingerprint[]>();
    
    allFingerprints.forEach(fp => {
      if (fp.analysisId) {
        if (!analysisSets.has(fp.analysisId)) {
          analysisSets.set(fp.analysisId, []);
        }
        analysisSets.get(fp.analysisId)!.push(fp);
      }
    });
    
    // Check for exact matches
    for (const [analysisId, fingerprints] of analysisSets) {
      const analysisHashes = fingerprints.map(fp => fp.hash).sort().join('-');
      
      if (analysisHashes === currentSignature) {
        return {
          hasMatch: true,
          analysisId,
          matchedFingerprints: fingerprints,
          confidence: 'exact'
        };
      }
    }
    
    // Check for partial matches (50% or more files match)
    let bestMatch = { analysisId: '', fingerprints: [] as FileFingerprint[], score: 0 };
    
    for (const [analysisId, fingerprints] of analysisSets) {
      let matchCount = 0;
      const currentHashes = (await this.createFingerprints(files)).map(fp => fp.hash);
      
      fingerprints.forEach(fp => {
        if (currentHashes.includes(fp.hash)) {
          matchCount++;
        }
      });
      
      const score = matchCount / Math.max(fingerprints.length, files.length);
      
      if (score > bestMatch.score) {
        bestMatch = { analysisId, fingerprints, score };
      }
    }
    
    if (bestMatch.score >= 0.5) {
      return {
        hasMatch: true,
        analysisId: bestMatch.analysisId,
        matchedFingerprints: bestMatch.fingerprints,
        confidence: 'partial'
      };
    }
    
    return {
      hasMatch: false,
      confidence: 'none'
    };
  }

  /**
   * Clean old fingerprints (maintenance)
   */
  static cleanOldFingerprints(daysOld: number = 30): void {
    try {
      const all = this.loadAllFingerprints();
      const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      const recent = all.filter(fp => fp.processedAt > cutoff);
      
      localStorage.setItem(this.FINGERPRINTS_KEY, JSON.stringify(recent));
      console.log(`🧹 Cleaned ${all.length - recent.length} old fingerprints`);
      
    } catch (error) {
      console.error('Failed to clean fingerprints:', error);
    }
  }

  /**
   * Get fingerprint statistics
   */
  static getStatistics(): {
    totalFingerprints: number;
    uniqueFiles: number;
    analysesTracked: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    typeBreakdown: { runsheets: number; invoices: number; unknown: number };
  } {
    const fingerprints = this.loadAllFingerprints();
    const uniqueAnalyses = new Set(fingerprints.filter(fp => fp.analysisId).map(fp => fp.analysisId));
    
    const typeBreakdown = fingerprints.reduce((acc, fp) => {
      if (fp.type === 'runsheet') {
        acc.runsheets++;
      } else if (fp.type === 'invoice') {
        acc.invoices++;
      } else {
        acc.unknown++;
      }
      return acc;
    }, { runsheets: 0, invoices: 0, unknown: 0 });
    
    const timestamps = fingerprints.map(fp => fp.processedAt);
    
    return {
      totalFingerprints: fingerprints.length,
      uniqueFiles: new Set(fingerprints.map(fp => fp.hash)).size,
      analysesTracked: uniqueAnalyses.size,
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
      typeBreakdown
    };
  }
}