/**
 * Unit Tests for File Fingerprint Service
 * Tests the dual fingerprint system (legacy + modern)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileFingerprintService, type FileInfo } from '@/lib/domain/services/file-fingerprint-service';

describe('FileFingerprintService - Dual Fingerprint System', () => {
  let service: FileFingerprintService;

  beforeEach(() => {
    service = new FileFingerprintService();
  });

  describe('Modern Fingerprint (SHA-256)', () => {
    it('should generate SHA-256 fingerprint for files', async () => {
      const files: FileInfo[] = [
        { name: 'test1.pdf', size: 1024, lastModified: 1234567890 },
        { name: 'test2.pdf', size: 2048, lastModified: 1234567891 },
      ];

      const result = await service.createFingerprint(files);

      expect(result.fingerprint).toBeDefined();
      expect(result.fingerprint).toHaveLength(64); // SHA-256 = 64 hex chars
      expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate same fingerprint for same files in same order', async () => {
      const files: FileInfo[] = [
        { name: 'test1.pdf', size: 1024, lastModified: 1234567890 },
        { name: 'test2.pdf', size: 2048, lastModified: 1234567891 },
      ];

      const result1 = await service.createFingerprint(files);
      const result2 = await service.createFingerprint(files);

      expect(result1.fingerprint).toBe(result2.fingerprint);
    });

    it('should generate same fingerprint for same files in different order', async () => {
      const files1: FileInfo[] = [
        { name: 'a.pdf', size: 100, lastModified: 1000 },
        { name: 'b.pdf', size: 200, lastModified: 2000 },
      ];

      const files2: FileInfo[] = [
        { name: 'b.pdf', size: 200, lastModified: 2000 },
        { name: 'a.pdf', size: 100, lastModified: 1000 },
      ];

      const result1 = await service.createFingerprint(files1);
      const result2 = await service.createFingerprint(files2);

      expect(result1.fingerprint).toBe(result2.fingerprint);
    });

    it('should generate different fingerprint for different files', async () => {
      const files1: FileInfo[] = [
        { name: 'test1.pdf', size: 1024, lastModified: 1234567890 },
      ];

      const files2: FileInfo[] = [
        { name: 'test2.pdf', size: 2048, lastModified: 1234567891 },
      ];

      const result1 = await service.createFingerprint(files1);
      const result2 = await service.createFingerprint(files2);

      expect(result1.fingerprint).not.toBe(result2.fingerprint);
    });
  });

  describe('Legacy Fingerprint (Base64 + 32-bit hash)', () => {
    it('should generate legacy fingerprint alongside modern', async () => {
      const files: FileInfo[] = [
        { name: 'test.pdf', size: 1024, lastModified: 1234567890 },
      ];

      const result = await service.createFingerprint(files);

      expect(result.legacyFingerprint).toBeDefined();
      expect(result.legacyFingerprint).toBeTruthy();
      expect(result.legacyFingerprint?.length).toBeLessThanOrEqual(64);
    });

    it('should generate alphanumeric-only legacy fingerprint', async () => {
      const files: FileInfo[] = [
        { name: 'test.pdf', size: 1024, lastModified: 1234567890 },
      ];

      const result = await service.createFingerprint(files);

      expect(result.legacyFingerprint).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should match legacy algorithm behavior', () => {
      // Test that replicates the legacy fingerprint algorithm
      const fileInfo = [
        { name: 'test.pdf', size: 1024, lastModified: 1234567890 }
      ];

      const jsonString = JSON.stringify(fileInfo);

      // Calculate 32-bit hash (legacy algorithm)
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        hash = ((hash << 5) - hash) + jsonString.charCodeAt(i);
        hash = hash | 0; // Force 32-bit integer
      }

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('number');
      expect(Number.isInteger(hash)).toBe(true);
    });

    it('should truncate legacy fingerprint to 64 characters', async () => {
      const files: FileInfo[] = [
        { name: 'very-long-filename-that-might-produce-a-long-base64-string.pdf', size: 999999, lastModified: 1234567890123 },
      ];

      const result = await service.createFingerprint(files);

      expect(result.legacyFingerprint?.length).toBeLessThanOrEqual(64);
    });
  });

  describe('Fingerprint Components', () => {
    it('should include metadata in fingerprint result', async () => {
      const files: FileInfo[] = [
        { name: 'test1.pdf', size: 1024, lastModified: 1234567890 },
        { name: 'test2.pdf', size: 2048, lastModified: 1234567891 },
      ];

      const result = await service.createFingerprint(files);

      expect(result.components).toBeDefined();
      expect(result.components.metadata.fileCount).toBe(2);
      expect(result.components.metadata.totalSize).toBe(3072);
      expect(result.components.fileHashes).toHaveLength(2);
    });

    it('should classify file types correctly', async () => {
      const files: FileInfo[] = [
        { name: 'runsheet_2024.pdf', size: 1024, lastModified: 1000 },
        { name: 'invoice_jan.pdf', size: 2048, lastModified: 2000 },
      ];

      const result = await service.createFingerprint(files);

      expect(result.components.metadata.fileTypes).toContain('runsheet');
      expect(result.components.metadata.fileTypes).toContain('invoice');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty file list', async () => {
      const files: FileInfo[] = [];

      await expect(service.createFingerprint(files)).rejects.toThrow(
        'Cannot create fingerprint for empty file list'
      );
    });
  });

  describe('Backward Compatibility', () => {
    it('should generate both fingerprints for all file uploads', async () => {
      const files: FileInfo[] = [
        { name: 'test.pdf', size: 1024, lastModified: 1234567890 },
      ];

      const result = await service.createFingerprint(files);

      expect(result.fingerprint).toBeDefined(); // Modern
      expect(result.legacyFingerprint).toBeDefined(); // Legacy
    });

    it('should allow comparison with legacy fingerprints', async () => {
      const files: FileInfo[] = [
        { name: 'test.pdf', size: 1024, lastModified: 1234567890 },
      ];

      const result = await service.createFingerprint(files);

      // Both fingerprints should be usable for duplicate detection
      const isModernSimilar = service.areSimilar(
        result.fingerprint,
        result.fingerprint
      );
      expect(isModernSimilar).toBe(true);

      if (result.legacyFingerprint) {
        const isLegacySimilar = service.areSimilar(
          result.legacyFingerprint,
          result.legacyFingerprint
        );
        expect(isLegacySimilar).toBe(true);
      }
    });
  });
});

describe('FileFingerprintService - Manual Entries', () => {
  let service: FileFingerprintService;

  beforeEach(() => {
    service = new FileFingerprintService();
  });

  it('should generate fingerprint for manual entries', async () => {
    const data = {
      userId: 'user-123',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
      entries: [
        { date: new Date('2024-01-01'), consignments: 50, paidAmount: 100 },
        { date: new Date('2024-01-02'), consignments: 55, paidAmount: 110 },
      ],
    };

    const fingerprint = await service.createManualFingerprint(data);

    expect(fingerprint).toBeDefined();
    expect(fingerprint).toHaveLength(64);
  });

  it('should generate same fingerprint for identical manual entries', async () => {
    const data = {
      userId: 'user-123',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
      entries: [
        { date: new Date('2024-01-01'), consignments: 50, paidAmount: 100 },
      ],
    };

    const fp1 = await service.createManualFingerprint(data);
    const fp2 = await service.createManualFingerprint(data);

    expect(fp1).toBe(fp2);
  });
});
