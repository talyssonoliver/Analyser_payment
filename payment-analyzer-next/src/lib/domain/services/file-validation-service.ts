/**
 * File Validation Service
 * Advanced file validation with update detection, matching original HTML system
 */

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  hash?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isUpdated?: boolean;
  duplicateFiles?: FileMetadata[];
  existingAnalysis?: string;
}

export interface FileValidationOptions {
  maxFileSize: number; // in bytes
  allowedTypes: string[];
  checkForUpdates: boolean;
  checkForDuplicates: boolean;
}

export interface StoredAnalysisData {
  id: string;
  files?: FileMetadata[];
  [key: string]: unknown;
}

export class FileValidationService {
  private static readonly DEFAULT_OPTIONS: FileValidationOptions = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['application/pdf'],
    checkForUpdates: true,
    checkForDuplicates: true,
  };

  /**
   * Validate uploaded files with comprehensive checks
   */
  async validateFiles(
    files: File[], 
    options: Partial<FileValidationOptions> = {}
  ): Promise<ValidationResult> {
    const config = { ...FileValidationService.DEFAULT_OPTIONS, ...options };
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Basic validation
    this.validateBasicRequirements(files, config, result);
    
    if (config.checkForDuplicates) {
      this.checkForDuplicateFiles(files, result);
    }

    if (config.checkForUpdates) {
      await this.checkForFileUpdates(files, result);
    }

    // Additional PDF-specific validation
    await this.validatePDFFiles(files, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Check if files have been updated since last analysis
   */
  async checkForFileUpdates(files: File[], result: ValidationResult): Promise<void> {
    try {
      const savedAnalyses = localStorage.getItem('pa:analyses:v9');
      if (!savedAnalyses) return;

      const analyses = JSON.parse(savedAnalyses);
      const fileMetadata = await this.extractFileMetadata(files);
      
      let hasUpdates = false;
      const updatedFiles: string[] = [];

      // Check each file against existing analyses
      for (const file of fileMetadata) {
        const existingAnalysis = this.findAnalysisWithFile(analyses, file);
        
        if (existingAnalysis) {
          const existingFile = existingAnalysis.files?.find(
            (f: FileMetadata) => f.name === file.name && f.size === file.size
          );

          if (existingFile && file.lastModified > existingFile.lastModified) {
            hasUpdates = true;
            updatedFiles.push(file.name);
            
            console.log(`📄 File ${file.name} updated:`, {
              previous: new Date(existingFile.lastModified).toLocaleString(),
              current: new Date(file.lastModified).toLocaleString(),
            });
          }
        }
      }

      if (hasUpdates) {
        result.isUpdated = true;
        result.warnings.push(
          `File updates detected: ${updatedFiles.join(', ')}. Consider re-processing to get latest data.`
        );
      }
    } catch (error) {
      console.error('Error checking file updates:', error);
      result.warnings.push('Unable to check for file updates');
    }
  }

  /**
   * Find existing analysis that contains similar files
   */
  findExistingAnalysis(files: File[]): string | null {
    try {
      const savedAnalyses = localStorage.getItem('pa:analyses:v9');
      if (!savedAnalyses) return null;

      const analyses = JSON.parse(savedAnalyses);
      const currentFileSignatures = files.map(f => ({
        name: f.name,
        size: f.size,
      }));

      for (const [analysisId, analysis] of Object.entries(analyses)) {
        const analysisData = analysis as StoredAnalysisData;
        if (!analysisData.files) continue;

        const analysisFileSignatures = analysisData.files.map((f: FileMetadata) => ({
          name: f.name,
          size: f.size,
        }));

        // Check if file signatures match (same files)
        if (this.arraysEqual(currentFileSignatures, analysisFileSignatures)) {
          return analysisId;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding existing analysis:', error);
      return null;
    }
  }

  /**
   * Generate file fingerprint for duplicate detection
   */
  async generateFileFingerprint(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Error generating file fingerprint:', error);
      // Fallback to simple hash
      return `${file.name}_${file.size}_${file.lastModified}`;
    }
  }

  /**
   * Validate basic file requirements
   */
  private validateBasicRequirements(
    files: File[], 
    config: FileValidationOptions, 
    result: ValidationResult
  ): void {
    if (files.length === 0) {
      result.errors.push('No files selected');
      return;
    }

    for (const file of files) {
      // Size validation
      if (file.size > config.maxFileSize) {
        result.errors.push(
          `File "${file.name}" is too large (${this.formatFileSize(file.size)}). Maximum size is ${this.formatFileSize(config.maxFileSize)}`
        );
      }

      if (file.size === 0) {
        result.errors.push(`File "${file.name}" is empty`);
      }

      // Type validation
      if (!config.allowedTypes.includes(file.type)) {
        result.errors.push(
          `File "${file.name}" has invalid type (${file.type || 'unknown'}). Allowed types: ${config.allowedTypes.join(', ')}`
        );
      }

      // Name validation
      if (!file.name || file.name.trim() === '') {
        result.errors.push('File has no name');
      }
    }
  }

  /**
   * Check for duplicate files in current selection
   */
  private checkForDuplicateFiles(files: File[], result: ValidationResult): void {
    const seen = new Set<string>();
    const duplicates: FileMetadata[] = [];

    for (const file of files) {
      const signature = `${file.name}_${file.size}`;
      
      if (seen.has(signature)) {
        duplicates.push({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
        });
      } else {
        seen.add(signature);
      }
    }

    if (duplicates.length > 0) {
      result.duplicateFiles = duplicates;
      result.warnings.push(
        `Duplicate files detected: ${duplicates.map(f => f.name).join(', ')}`
      );
    }
  }

  /**
   * Validate PDF files specifically
   */
  private async validatePDFFiles(files: File[], result: ValidationResult): Promise<void> {
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    
    for (const file of pdfFiles) {
      try {
        // Check if file is a valid PDF by reading header
        const header = await this.readFileHeader(file, 8);
        const pdfMagic = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
        
        if (!this.arrayStartsWith(header, pdfMagic)) {
          result.errors.push(`File "${file.name}" is not a valid PDF file`);
        }
      } catch {
        result.warnings.push(`Unable to validate PDF structure for "${file.name}"`);
      }
    }
  }

  /**
   * Extract metadata from files
   */
  private async extractFileMetadata(files: File[]): Promise<FileMetadata[]> {
    return Promise.all(
      files.map(async (file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        hash: await this.generateFileFingerprint(file),
      }))
    );
  }

  /**
   * Find analysis that contains a specific file
   */
  private findAnalysisWithFile(analyses: Record<string, StoredAnalysisData>, fileMetadata: FileMetadata): StoredAnalysisData | null {
    for (const analysis of Object.values(analyses)) {
      const analysisData = analysis;
      if (analysisData.files) {
        const hasFile = analysisData.files.some(
          (f: FileMetadata) => f.name === fileMetadata.name && f.size === fileMetadata.size
        );
        if (hasFile) return analysisData;
      }
    }
    return null;
  }

  /**
   * Read file header bytes
   */
  private async readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
    const slice = file.slice(0, bytes);
    const buffer = await slice.arrayBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Check if array starts with another array
   */
  private arrayStartsWith(array: Uint8Array, prefix: Uint8Array): boolean {
    if (array.length < prefix.length) return false;
    for (let i = 0; i < prefix.length; i++) {
      if (array[i] !== prefix[i]) return false;
    }
    return true;
  }

  /**
   * Check if two arrays are equal
   */
  private arraysEqual(a: unknown[], b: unknown[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, index) => 
      typeof val === 'object' ? 
        JSON.stringify(val) === JSON.stringify(b[index]) : 
        val === b[index]
    );
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const fileValidationService = new FileValidationService();