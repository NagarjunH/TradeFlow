// Utility to manage user profile avatar storage, compression, and cross-component sync

const AVATAR_STORAGE_KEY = 'tradeflow_profile_avatar';
const AVATAR_EVENT = 'tradeflow_avatar_changed';

/**
 * Retrieve current avatar data URL from localStorage (or null if default)
 */
export const getStoredAvatar = (): string | null => {
  try {
    return localStorage.getItem(AVATAR_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Store an avatar data URL and notify all listening components
 */
export const setStoredAvatar = (dataUrl: string): void => {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
    window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: dataUrl }));
  } catch (err) {
    console.error('Failed to save avatar to localStorage:', err);
  }
};

/**
 * Remove stored avatar (resets to initials gradient) and notify components
 */
export const removeStoredAvatar = (): void => {
  try {
    localStorage.removeItem(AVATAR_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: null }));
  } catch (err) {
    console.error('Failed to remove avatar from localStorage:', err);
  }
};

/**
 * Subscribe to avatar changes across components and browser tabs
 */
export const subscribeAvatarChange = (callback: (avatar: string | null) => void): (() => void) => {
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<string | null>;
    callback(custom.detail !== undefined ? custom.detail : getStoredAvatar());
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === AVATAR_STORAGE_KEY) {
      callback(e.newValue);
    }
  };

  window.addEventListener(AVATAR_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(AVATAR_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
};

/**
 * Compress an uploaded user image file to an optimized avatar data URL
 * Max dimensions: 200x200, format: JPEG 0.85 (typically ~12-25KB)
 */
export const compressImageToAvatar = (file: File, maxDim: number = 200): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } catch {
          resolve(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};
