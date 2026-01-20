import * as cryptoLib from '@/lib/crypto';

describe('Crypto Helpers', () => {
  it('encrypts and decrypts data correctly', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await cryptoLib.deriveKeyFromPassphrase('test-password', salt);

    const data = new TextEncoder().encode('Hello, World!');
    const encrypted = await cryptoLib.encryptData(data, key);
    const decrypted = await cryptoLib.decryptData(encrypted, key);

    expect(decrypted).toEqual(data);
  });

  it('wraps and unwraps vault key correctly', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const wrappingKey = await cryptoLib.deriveKeyFromPassphrase('password', salt);
    const vaultKey = await cryptoLib.generateVaultKey();

    const wrapped = await cryptoLib.wrapVaultKey(vaultKey, wrappingKey);
    const unwrapped = await cryptoLib.unwrapVaultKey(wrapped, wrappingKey);

    expect(unwrapped).toEqual(vaultKey);
  });

  it('generates unique vault keys', async () => {
    const key1 = await cryptoLib.generateVaultKey();
    const key2 = await cryptoLib.generateVaultKey();

    expect(key1).not.toEqual(key2);
  });

  it('converts arrays to base64 and back', async () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 255, 128]);
    const base64 = cryptoLib.arrayToBase64(original);
    const restored = cryptoLib.base64ToArray(base64);

    expect(restored).toEqual(original);
  });

  it('imports and uses vault key for encryption', async () => {
    const vaultKey = await cryptoLib.generateVaultKey();
    const importedKey = await cryptoLib.importVaultKey(vaultKey);

    const data = new TextEncoder().encode('Secret data');
    const encrypted = await cryptoLib.encryptData(data, importedKey);
    const decrypted = await cryptoLib.decryptData(encrypted, importedKey);

    expect(decrypted).toEqual(data);
  });

  it('produces different ciphertext for same data with different IVs', async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await cryptoLib.deriveKeyFromPassphrase('test', salt);

    const data = new TextEncoder().encode('Same data');

    const encrypted1 = await cryptoLib.encryptData(data, key);
    const encrypted2 = await cryptoLib.encryptData(data, key);

    expect(encrypted1.iv).not.toEqual(encrypted2.iv);
    expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
  });
});
