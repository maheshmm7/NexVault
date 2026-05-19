import { BRANDING } from '../config/branding';

/**
 * Safely migrates legacy Vaultify storage keys to the new NEXVAULT prefix,
 * and aggressively purges any remaining raw auth credentials or legacy tokens
 * from localStorage and sessionStorage to enforce HTTPOnly cookie security.
 */
export const migrateStorage = () => {
  try {
    // ─── 1. Aggressive Token & Session Credential Purge ─────────────────────
    const forbiddenAuthKeys = ['access_token', 'jwt', 'authToken', 'bearer'];
    
    // Clear precise keys from localStorage
    forbiddenAuthKeys.forEach(k => {
      if (localStorage.getItem(k)) {
        localStorage.removeItem(k);
      }
    });

    // Clear precise keys from sessionStorage
    forbiddenAuthKeys.forEach(k => {
      if (sessionStorage.getItem(k)) {
        sessionStorage.removeItem(k);
      }
    });

    // Sweep any keys matching auth patterns (case-insensitive) for XSS defense
    try {
      const lsKeys = Object.keys(localStorage);
      lsKeys.forEach(k => {
        const lowerKey = k.toLowerCase();
        if (
          lowerKey.includes('token') || 
          lowerKey.includes('jwt') || 
          lowerKey.includes('auth') || 
          lowerKey.includes('bearer')
        ) {
          // Keep the primary auth token, isAuthenticated status, and scan tokens
          if (k !== 'token' && k !== 'isAuthenticated' && !k.includes('_scan_token_')) {
            localStorage.removeItem(k);
          }
        }
      });
    } catch (e) {
      console.error('Safe localStorage credential sweep interrupted:', e);
    }

    try {
      const ssKeys = Object.keys(sessionStorage);
      ssKeys.forEach(k => {
        const lowerKey = k.toLowerCase();
        if (
          lowerKey.includes('token') || 
          lowerKey.includes('jwt') || 
          lowerKey.includes('auth') || 
          lowerKey.includes('bearer')
        ) {
          // Keep the primary auth token, isAuthenticated status, and scan tokens
          if (k !== 'token' && k !== 'isAuthenticated' && !k.includes('_scan_token_')) {
            sessionStorage.removeItem(k);
          }
        }
      });
    } catch (e) {
      console.error('Safe sessionStorage credential sweep interrupted:', e);
    }

    // ─── 2. Brand Storage Migration & Cleanup ────────────────────────────────
    const keys = Object.keys(localStorage);
    const legacyPrefix = `${BRANDING.LEGACY_STORAGE_PREFIX}_`;
    const newPrefix = `${BRANDING.STORAGE_PREFIX}_`;

    // Safe migration for avatar
    const legacyAvatarKey = `${BRANDING.LEGACY_STORAGE_PREFIX}_local_avatar`;
    const newAvatarKey = `${BRANDING.STORAGE_PREFIX}_local_avatar`;
    const legacyAvatar = localStorage.getItem(legacyAvatarKey);
    if (legacyAvatar) {
      if (!localStorage.getItem(newAvatarKey)) {
        localStorage.setItem(newAvatarKey, legacyAvatar);
      }
      localStorage.removeItem(legacyAvatarKey);
    }

    // Scan and copy other keys without leaving dangling assets
    keys.forEach(key => {
      if (key.startsWith(legacyPrefix)) {
        const value = localStorage.getItem(key);
        const newKey = key.replace(legacyPrefix, newPrefix);

        if (!localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, value);
        }
        
        localStorage.removeItem(key);
      }
    });

  } catch (error) {
    console.error('Storage migration and hardening failed:', error);
  }
};

export default migrateStorage;
