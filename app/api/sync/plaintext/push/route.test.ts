import { POST } from './route';

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(async () => ({ userId: 'user_123' })),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

const mockQuery = jest.requireMock('@/lib/db').query as jest.Mock;

describe('POST /api/sync/plaintext/push', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('enforces plaintext invariants on insert', async () => {
    mockQuery
      // existing select
      .mockResolvedValueOnce([])
      // insert
      .mockResolvedValueOnce([{ id: 1, version: 1, updated_at: new Date().toISOString() }])
      // sync_settings update
      .mockResolvedValueOnce([])
      // records select for checksum
      .mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/sync/plaintext/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: [
          {
            recordId: 'r1',
            recordType: 'bookmark',
            data: { hello: 'world' },
            baseVersion: 0,
            deleted: false,
          },
        ],
      }),
    });

    await POST(req);

    const insertSql = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO records')
    )?.[0];

    expect(insertSql).toContain('ciphertext');
    expect(insertSql).toContain('NULL');
  });

  it('auto-converts existing rows to plaintext on update', async () => {
    mockQuery
      // upsert (INSERT ON CONFLICT)
      .mockResolvedValueOnce([{ version: 11, updated_at: new Date().toISOString() }])
      // sync_settings update
      .mockResolvedValueOnce([])
      // records select for checksum
      .mockResolvedValueOnce([]);

    const req = new Request('http://localhost/api/sync/plaintext/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operations: [
          {
            recordId: 'r1',
            recordType: 'bookmark',
            data: { hello: 'world' },
            baseVersion: 10,
            deleted: false,
          },
        ],
      }),
    });

    await POST(req);

    const upsertSql = mockQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO records')
    )?.[0];

    expect(upsertSql).toContain('encrypted = false');
    expect(upsertSql).toContain('ciphertext = NULL');
  });
});
