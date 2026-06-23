const Store = require('electron-store');
const { safeStorage } = require('electron');
const store = new Store();

module.exports = {
  get: (key) => store.get(key),
  set: (key, val) => store.set(key, val),
  delete: (key) => store.delete(key),

  getSecure: (key) => {
    const val = store.get(key);
    if (!val) return null;

    if (typeof val === 'string' && val.startsWith('enc_')) {
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        try {
          const encryptedBuffer = Buffer.from(val.substring(4), 'base64');
          return safeStorage.decryptString(encryptedBuffer);
        } catch (e) {
          console.error(`[Secure Store] Failed to decrypt secure key ${key}:`, e);
          return null;
        }
      } else {
        const fallback = store.get('allowPlaintextFallback');
        if (fallback) {
          return null; 
        }
        throw new Error('OS Encryption not available to decrypt key.');
      }
    } else {
      // Plain text (needs migration if possible)
      if (safeStorage && safeStorage.isEncryptionAvailable()) {
        try {
          console.log(`[Secure Store] Migrating plaintext key ${key} to safeStorage...`);
          const encrypted = 'enc_' + safeStorage.encryptString(val).toString('base64');
          store.set(key, encrypted);
          return val;
        } catch (e) {
          console.error(`[Secure Store] Migration failed for ${key}:`, e);
        }
      }
      
      const fallback = store.get('allowPlaintextFallback');
      if (fallback) {
        return val;
      }
      throw new Error('Unencrypted credentials detected. Safe storage is required but OS encryption is unavailable.');
    }
  },

  setSecure: (key, val) => {
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      try {
        const encrypted = 'enc_' + safeStorage.encryptString(val).toString('base64');
        store.set(key, encrypted);
        return true;
      } catch (e) {
        console.error(`[Secure Store] Encryption failed for ${key}:`, e);
        throw e;
      }
    } else {
      const fallback = store.get('allowPlaintextFallback');
      if (fallback) {
        store.set(key, val);
        return true;
      }
      throw new Error('Secure storage is unavailable (OS encryption not available).');
    }
  }
};
