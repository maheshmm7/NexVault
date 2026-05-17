import { BRANDING } from '../config/branding';

/**
 * Safely migrates legacy Vaultify storage keys to the new NEXVAULT prefix.
 * Copies values without deleting original keys for safety.
 */
export const migrateStorage = () => {
  try {
    const keys = Object.keys(localStorage);
    const legacyPrefix = `${BRANDING.LEGACY_STORAGE_PREFIX}_`;
    const newPrefix = `${BRANDING.STORAGE_PREFIX}_`;

    keys.forEach(key => {
      if (key.startsWith(legacyPrefix)) {
        const value = localStorage.getItem(key);
        const newKey = key.replace(legacyPrefix, newPrefix);

        // Only migrate if the new key doesn't already exist or if we want to ensure sync
        // For branding transition, we copy over once if new key is missing
        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, value);
          // console.log(`Migrated: ${key} -> ${newKey}`);
        }
      }
    });

    // Special case for non-prefixed keys if any (audit showed mostly prefixed)
    // But we keep it strictly to prefixes to avoid collision
  } catch (error) {
    console.error('Storage migration failed:', error);
  }
};

export default migrateStorage;
