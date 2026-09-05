export type CoverTone = 'dark' | 'light';

/** Average-luminance check so cover text stays readable. */
export function detectImageTone(file: File): Promise<CoverTone> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 24;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      try {
        ctx?.drawImage(img, 0, 0, size, size);
        const data = ctx?.getImageData(0, 0, size, size).data;
        URL.revokeObjectURL(url);
        if (!data) return resolve('dark');
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        }
        const avg = sum / (data.length / 4);
        resolve(avg > 165 ? 'light' : 'dark');
      } catch {
        URL.revokeObjectURL(url);
        resolve('dark');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('dark');
    };
    img.src = url;
  });
}
