/**
 * Image Compressor Utility
 * Mengompresi file gambar karya peserta lomba (JPG/PNG) di sisi klien sebelum diunggah
 * Memastikan berkas tidak melebihi batas HTTP request Supabase & kuota penyimpanan lokal.
 */

export interface CompressionResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export async function compressImageFile(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.8
): Promise<CompressionResult> {
  const originalSize = file.size;

  // Jika bukan tipe gambar raster, fallback ke pembacaan langsung
  if (!file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          file,
          dataUrl: reader.result as string,
          originalSize,
          compressedSize: originalSize,
          width: 0,
          height: 0,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung skala rasio agar tidak melebihi maxWidth dan maxHeight
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback jika canvas context gagal
          const dataUrl = readerEvent.target?.result as string;
          resolve({
            file,
            dataUrl,
            originalSize,
            compressedSize: originalSize,
            width: img.width,
            height: img.height,
          });
          return;
        }

        // Gambar ulang di canvas
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor ke format JPEG terkompresi
        const outputMimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputMimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                file,
                dataUrl,
                originalSize,
                compressedSize: originalSize,
                width,
                height,
              });
              return;
            }

            const cleanFileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], cleanFileName, {
              type: outputMimeType,
              lastModified: Date.now(),
            });

            resolve({
              file: compressedFile,
              dataUrl,
              originalSize,
              compressedSize: compressedFile.size,
              width,
              height,
            });
          },
          outputMimeType,
          quality
        );
      };

      img.onerror = () => {
        const dataUrl = readerEvent.target?.result as string;
        resolve({
          file,
          dataUrl,
          originalSize,
          compressedSize: originalSize,
          width: 0,
          height: 0,
        });
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        file,
        dataUrl: '',
        originalSize,
        compressedSize: originalSize,
        width: 0,
        height: 0,
      });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Format ukuran file ke representasi yang mudah dibaca (KB / MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
