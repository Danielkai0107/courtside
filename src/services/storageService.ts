import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { auth } from './firebase';

// 初始化 Firebase Storage
const storage = getStorage();

/**
 * 上傳圖片到 Firebase Storage
 */
export const uploadImage = async (
  file: File,
  path: string
): Promise<string> => {
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to upload files');
  }

  // 驗證檔案類型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only images are allowed.');
  }

  // 驗證檔案大小（最大 5MB）
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit');
  }

  // 建立唯一檔名
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const fullPath = `${path}/${fileName}`;

  // 上傳檔案
  const storageRef = ref(storage, fullPath);
  const snapshot = await uploadBytes(storageRef, file);

  // 獲取下載 URL
  const downloadURL = await getDownloadURL(snapshot.ref);

  return downloadURL;
};

/**
 * 上傳賽事 Banner 圖片
 */
export const uploadTournamentBanner = async (
  tournamentId: string,
  file: File
): Promise<string> => {
  return uploadImage(file, `tournaments/${tournamentId}/banners`);
};

/**
 * 上傳用戶頭像
 */
export const uploadUserAvatar = async (
  uid: string,
  file: File
): Promise<string> => {
  return uploadImage(file, `users/${uid}/avatars`);
};

/**
 * 刪除圖片
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // 從 URL 提取檔案路徑
    const url = new URL(imageUrl);
    const pathStart = url.pathname.indexOf('/o/') + 3;
    const pathEnd = url.pathname.indexOf('?');
    const filePath = decodeURIComponent(
      url.pathname.substring(pathStart, pathEnd > 0 ? pathEnd : undefined)
    );

    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * 取得檔案大小（格式化）
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * 驗證圖片檔案
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: '不支援的檔案格式。請上傳 JPG、PNG、WebP 或 GIF 圖片。',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `檔案大小超過限制。最大允許 5MB，目前檔案大小為 ${formatFileSize(file.size)}。`,
    };
  }

  return { valid: true };
};

