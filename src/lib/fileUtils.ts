/**
 * Converts a File to Base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Converts multiple files to Base64 strings
 */
export const filesToBase64 = async (files: FileList | File[]): Promise<string[]> => {
  const fileArray = Array.from(files);
  return Promise.all(fileArray.map(fileToBase64));
};

/**
 * Gets the file type from a Base64 string
 */
export const getBase64FileType = (base64: string): string | null => {
  const match = base64.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
};

/**
 * Checks if a Base64 string is an image
 */
export const isBase64Image = (base64: string): boolean => {
  const type = getBase64FileType(base64);
  return type ? type.startsWith('image/') : false;
};

/**
 * Creates a downloadable link from Base64
 */
export const downloadBase64File = (base64: string, filename: string): void => {
  const link = document.createElement('a');
  link.href = base64;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Compresses an image file before converting to Base64
 */
export const compressImageToBase64 = (
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      const base64 = canvas.toDataURL(file.type || 'image/jpeg', quality);
      resolve(base64);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Formats file size to human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
