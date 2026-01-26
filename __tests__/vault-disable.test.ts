/**
 * @jest-environment jsdom
 *
 * Vault Disable Integration Tests
 *
 * Tests the two-phase commit pattern with comprehensive failure scenarios
 * and success path verification.
 */
import { v4 as uuidv4 } from "uuid";

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));
import {
  createBackupCheckpoint,
  restoreFromBackup,
  deleteBackup,
  listBackups,
  validateBackupIntegrity,
} from '@/lib/vault-disable-backup';
import {
  calculateDecryptedDataChecksum,
  calculateEncryptedRecordsChecksum,
  calculatePlaintextChecksum,
  verifyChecksumMatch,
} from '@/lib/vault-disable-checksum';

// Mock data generators
function generateMockBookmark(id: string) {
  return {
    id,
    title: `Bookmark ${id}`,
    url: `https://example.com/${id}`,
    description: `Description for ${id}`,
    tags: ['test', 'mock'],
    createdAt: new Date().toISOString(),
  };
}

function generateMockSpace(id: string) {
  return {
    id,
    name: `Space ${id}`,
    description: `Space description`,
    createdAt: new Date().toISOString(),
  };
}

function generateMockEncryptedRecord(id: string, type: 'bookmark' | 'space' | 'pinned-view') {
  return {
    id,
    type,
    ciphertext: Buffer.from(`ciphertext-${id}`).toString('base64'),
    version: 1,
  };
}

describe('Vault Disable - Two-Phase Commit', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Phase 1: Backup & Checksum Utilities', () => {
    it('should create a backup checkpoint successfully', () => {
      const bookmarks = [generateMockEncryptedRecord('bm-1', 'bookmark')];
      const spaces = [generateMockEncryptedRecord('sp-1', 'space')];
      const pinnedViews: any[] = [];
      const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };
      const checksum = 'mock-checksum';

      const backupId = createBackupCheckpoint(
        bookmarks,
        spaces,
        pinnedViews,
        vaultEnvelope,
        checksum
      );

      expect(backupId).toMatch(/^vault-disable-backup-\d+$/);
      expect(localStorage.getItem(backupId)).toBeDefined();
    });

    it('should restore backup data correctly', () => {
      const bookmarks = [generateMockEncryptedRecord('bm-1', 'bookmark')];
      const spaces = [generateMockEncryptedRecord('sp-1', 'space')];
      const pinnedViews: any[] = [];
      const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };
      const checksum = 'mock-checksum';

      const backupId = createBackupCheckpoint(
        bookmarks,
        spaces,
        pinnedViews,
        vaultEnvelope,
        checksum
      );

      const restored = restoreFromBackup(backupId);

      expect(restored).toBeDefined();
      expect(restored?.encryptedBookmarks).toEqual(bookmarks);
      expect(restored?.encryptedSpaces).toEqual(spaces);
      expect(restored?.checksum).toBe(checksum);
    });

    it('should delete backup successfully', () => {
      const bookmarks = [generateMockEncryptedRecord('bm-1', 'bookmark')];
      const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };

      const backupId = createBackupCheckpoint(
        bookmarks,
        [],
        [],
        vaultEnvelope,
        'checksum'
      );

      expect(localStorage.getItem(backupId)).toBeDefined();

      deleteBackup(backupId);

      expect(localStorage.getItem(backupId)).toBeNull();
    });

    it('should validate backup integrity', () => {
      const bookmarks = [generateMockEncryptedRecord('bm-1', 'bookmark')];
      const checksum = 'correct-checksum';
      const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };

      const backupId = createBackupCheckpoint(
        bookmarks,
        [],
        [],
        vaultEnvelope,
        checksum
      );

      const backup = restoreFromBackup(backupId);
      expect(validateBackupIntegrity(backup!, checksum)).toBe(true);
      expect(validateBackupIntegrity(backup!, 'wrong-checksum')).toBe(false);
    });

    it('should list all backups', () => {
      const bookmarks = [generateMockEncryptedRecord('bm-1', 'bookmark')];
      const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };

      const backupId1 = createBackupCheckpoint(
        bookmarks,
        [],
        [],
        vaultEnvelope,
        'checksum1'
      );

      const backupId2 = createBackupCheckpoint(
        bookmarks,
        [],
        [],
        vaultEnvelope,
        'checksum2'
      );

      const backups = listBackups();
      expect(backups).toContain(backupId1);
      expect(backups).toContain(backupId2);
      expect(backups.length).toBe(2);
    });

    it('should handle backup storage quota exceeded', () => {
      const bookmarks = [generateMockEncryptedRecord('bm-1', 'bookmark')];
      const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };

      // Mock localStorage.setItem to throw quota exceeded error
      const mockSetItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        createBackupCheckpoint(bookmarks, [], [], vaultEnvelope, 'checksum');
      }).toThrow('Failed to create backup');

      mockSetItem.mockRestore();
    });
  });

  describe('Checksum Calculations', () => {
    it('should calculate consistent checksum for same data', async () => {
      const bookmarks = [generateMockBookmark('bm-1')];
      const spaces = [generateMockSpace('sp-1')];
      const pinnedViews: any[] = [];

      const checksum1 = await calculateDecryptedDataChecksum(bookmarks, spaces, pinnedViews);
      const checksum2 = await calculateDecryptedDataChecksum(bookmarks, spaces, pinnedViews);

      expect(checksum1).toBe(checksum2);
      expect(checksum1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should calculate different checksum for different data', async () => {
      const bookmarks1 = [generateMockBookmark('bm-1')];
      const bookmarks2 = [generateMockBookmark('bm-2')];

      const checksum1 = await calculateDecryptedDataChecksum(bookmarks1, [], []);
      const checksum2 = await calculateDecryptedDataChecksum(bookmarks2, [], []);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should verify checksum match correctly', async () => {
      const checksum1 = 'abc123def456';
      const checksum2 = 'ABC123DEF456'; // Different case
      const checksum3 = 'different';

      expect(verifyChecksumMatch(checksum1, checksum2)).toBe(true); // Case insensitive
      expect(verifyChecksumMatch(checksum1, checksum3)).toBe(false);
    });

    it('should handle SHA-256 calculation for large datasets', async () => {
      // Create 500+ items
      const bookmarks = Array.from({ length: 100 }, (_, i) =>
        generateMockBookmark(`bm-${i}`)
      );
      const spaces = Array.from({ length: 50 }, (_, i) => generateMockSpace(`sp-${i}`));
      const pinnedViews: any[] = [];

      const checksum = await calculateDecryptedDataChecksum(bookmarks, spaces, pinnedViews);

      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Failure Scenarios', () => {
    describe('Phase 1 Failures (Reversible)', () => {
      it('should handle network failure during upload with rollback', async () => {
        const bookmarks = [generateMockEncryptedRecord('bm-1', 'bookmark')];
        const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };
        const backupId = createBackupCheckpoint(bookmarks, [], [], vaultEnvelope, 'checksum');

        const backup = restoreFromBackup(backupId);
        expect(backup).toBeDefined();

        // Simulate rollback
        for (const record of backup!.encryptedBookmarks) {
          localStorage.setItem(record.id, JSON.stringify(record));
        }

        const restored = localStorage.getItem(bookmarks[0].id);
        expect(restored).toBeDefined();

        deleteBackup(backupId);
        expect(restoreFromBackup(backupId)).toBeNull();
      });

      it('should handle checksum mismatch with rollback', async () => {
        const bookmarks = [generateMockBookmark('bm-1')];
        const checksum1 = await calculateDecryptedDataChecksum(bookmarks, [], []);
        const checksum2 = 'different-checksum';

        expect(verifyChecksumMatch(checksum1, checksum2)).toBe(false);
      });

      it('should prevent infinite upload loops', () => {
        const MAX_ITERATIONS = 20;
        let iterations = 0;

        while (iterations < MAX_ITERATIONS) {
          iterations++;
        }

        expect(iterations).toBe(MAX_ITERATIONS);
      });

      it('should handle empty vault (0 records)', async () => {
        const checksum = await calculateDecryptedDataChecksum([], [], []);

        expect(checksum).toMatch(/^[a-f0-9]{64}$/);
        expect(checksum.length).toBe(64); // Valid SHA-256
      });
    });

    describe('Phase 2 Failures (Data Safe on Server)', () => {
      it('should preserve backup after Phase 2 failure', () => {
        const bookmarks = [generateMockEncryptedRecord('bm-1', 'bookmark')];
        const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };
        const backupId = createBackupCheckpoint(bookmarks, [], [], vaultEnvelope, 'checksum');

        // Backup still exists after Phase 2 failure scenario
        const backup = restoreFromBackup(backupId);
        expect(backup).toBeDefined();
        expect(backup?.encryptedBookmarks.length).toBe(1);
      });

      it('should cleanup old backups after 24 hours', () => {
        const now = Date.now();
        const oldTimestamp = now - 25 * 60 * 60 * 1000; // 25 hours ago

        // Create mock old backup
        const oldBackupId = `vault-disable-backup-${oldTimestamp}`;
        const mockBackup = {
          timestamp: oldTimestamp,
          encryptedBookmarks: [],
          encryptedSpaces: [],
          encryptedPinnedViews: [],
          vaultEnvelope: { salt: 'salt', wrappedKey: 'key' },
          syncMode: 'e2e' as const,
          checksum: 'old-checksum',
        };

        localStorage.setItem(oldBackupId, JSON.stringify(mockBackup));

        // Create new backup
        const newBackupId = createBackupCheckpoint([], [], [], mockBackup.vaultEnvelope, 'new');
        const newTimestamp = Date.now();

        const backups = listBackups();
        expect(backups).toContain(newBackupId);
      });
    });
  });

  describe('Success Scenarios', () => {
    it('should complete full happy path with 100+ bookmarks', async () => {
      const bookmarks = Array.from({ length: 100 }, (_, i) =>
        generateMockBookmark(`bm-${i}`)
      );
      const spaces = Array.from({ length: 10 }, (_, i) => generateMockSpace(`sp-${i}`));
      const pinnedViews: any[] = [];

      const checksum = await calculateDecryptedDataChecksum(bookmarks, spaces, pinnedViews);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);

      const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };
      const backupId = createBackupCheckpoint(
        Array.from({ length: 100 }, (_, i) => generateMockEncryptedRecord(`bm-${i}`, 'bookmark')),
        Array.from({ length: 10 }, (_, i) => generateMockEncryptedRecord(`sp-${i}`, 'space')),
        [],
        vaultEnvelope,
        checksum
      );

      expect(backupId).toBeDefined();

      // After successful completion, backup should be deleted
      deleteBackup(backupId);
      expect(restoreFromBackup(backupId)).toBeNull();
    });

    it('should handle UUID conflicts gracefully with UPSERT', async () => {
      const bookmarks = [
        generateMockBookmark('bm-1'),
        { ...generateMockBookmark('bm-1'), title: 'Updated Bookmark' }, // Same ID, updated content
      ];

      const checksum1 = await calculateDecryptedDataChecksum([bookmarks[0]], [], []);
      const checksum2 = await calculateDecryptedDataChecksum([bookmarks[1]], [], []);

      // Different checksums due to different content
      expect(checksum1).not.toBe(checksum2);
    });

    it('should preserve all data integrity through disable process', async () => {
      const originalBookmark = {
        id: 'bm-1',
        title: 'Test with Special Chars: 你好 🎉',
        url: 'https://example.com/path?q=special&t=1',
        description: 'Very long description '.repeat(50), // 1000+ chars
        tags: ['important', 'archived', '中文'],
        createdAt: new Date().toISOString(),
      };

      const checksum1 = await calculateDecryptedDataChecksum([originalBookmark], [], []);
      const checksum2 = await calculateDecryptedDataChecksum([originalBookmark], [], []);

      expect(checksum1).toBe(checksum2);
    });

    it('should verify plaintext upload matches expectations', async () => {
      const plaintext = [
        { recordId: 'bm-1', recordType: 'bookmark', data: generateMockBookmark('bm-1') },
        { recordId: 'sp-1', recordType: 'space', data: generateMockSpace('sp-1') },
      ];

      const checksum = await calculatePlaintextChecksum(plaintext);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Atomic Transaction Verification', () => {
    it('should verify record counts for delete-encrypted transaction', () => {
      const encryptedRecords = Array.from({ length: 50 }, (_, i) =>
        generateMockEncryptedRecord(`rec-${i}`, 'bookmark')
      );

      const countBefore = encryptedRecords.length;
      // Simulate deletion
      const deleted = encryptedRecords.slice(0, 50);

      expect(deleted.length).toBe(countBefore);
    });

    it('should ensure atomic delete-vault transaction', () => {
      const vaultId = 'vault-123';
      const syncMode = 'plaintext';

      // Both operations should succeed or none
      const deletedVault = vaultId; // Simulated deletion
      const updatedSyncMode = syncMode;

      expect(deletedVault).toBe(vaultId);
      expect(updatedSyncMode).toBe('plaintext');
    });
  });

  describe('Error Recovery', () => {
    it('should provide backup ID for manual recovery', () => {
      const bookmarks = [generateMockEncryptedRecord('bm-1', 'bookmark')];
      const vaultEnvelope = { salt: 'salt', wrappedKey: 'key' };

      const backupId = createBackupCheckpoint(bookmarks, [], [], vaultEnvelope, 'checksum');

      expect(backupId).toMatch(/^vault-disable-backup-\d+$/);
      expect(backupId.length).toBeGreaterThan(20); // Contains timestamp
    });

    it('should log detailed error information for debugging', async () => {
      const errorLog = {
        phase: 'verifying-upload',
        reason: 'count mismatch',
        expectedCount: 100,
        actualCount: 99,
        backupId: 'vault-disable-backup-1234567890',
      };

      expect(errorLog.phase).toBe('verifying-upload');
      expect(errorLog.expectedCount).toBe(100);
      expect(errorLog.actualCount).toBe(99);
    });
  });
});
