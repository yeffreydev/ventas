/**
 * Image Optimizer for Chat Uploads
 * Compresses images client-side before sending to reduce bandwidth and improve performance
 */

interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  maxSizeKB: 1024, // 1MB max
};

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Optimize an image file by compressing and resizing
 */
export async function optimizeImage(
  file: File,
  options: OptimizationOptions = {}
): Promise<File> {
  // Merge with defaults
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip if not an image
  if (!isImageFile(file)) {
    return file;
  }

  // Skip SVG files (they're already optimized)
  if (file.type === 'image/svg+xml') {
    return file;
  }

  // Skip if already small enough
  if (file.size < (opts.maxSizeKB! * 1024) / 2) {
    console.log(`[ImageOptimizer] Image ${file.name} is already small (${Math.round(file.size / 1024)}KB), skipping optimization`);
    return file;
  }

  console.log(`[ImageOptimizer] Optimizing ${file.name} (${Math.round(file.size / 1024)}KB)...`);

  try {
    // Load image
    const img = await loadImage(file);

    // Calculate new dimensions (maintain aspect ratio)
    let { width, height } = img;
    
    if (width > opts.maxWidth! || height > opts.maxHeight!) {
      const ratio = Math.min(opts.maxWidth! / width, opts.maxHeight! / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
      console.log(`[ImageOptimizer] Resizing to ${width}x${height}`);
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // Use better image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob with compression
    const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, outputFormat, opts.quality);
    });

    if (!blob) {
      console.warn('[ImageOptimizer] Compression failed, using original');
      return file;
    }

    // Create new file
    const optimizedFile = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, outputFormat === 'image/png' ? '.png' : '.jpg'),
      { type: outputFormat }
    );

    const originalSizeKB = Math.round(file.size / 1024);
    const optimizedSizeKB = Math.round(optimizedFile.size / 1024);
    const savings = Math.round(((file.size - optimizedFile.size) / file.size) * 100);

    console.log(`[ImageOptimizer] ✅ Optimized: ${originalSizeKB}KB → ${optimizedSizeKB}KB (${savings}% reduction)`);

    return optimizedFile;
  } catch (error) {
    console.error('[ImageOptimizer] Error optimizing image:', error);
    return file; // Return original on error
  }
}

/**
 * Load an image file into an HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Optimize multiple image files
 */
export async function optimizeImages(files: File[]): Promise<File[]> {
  const optimizedFiles: File[] = [];

  for (const file of files) {
    if (isImageFile(file)) {
      const optimized = await optimizeImage(file);
      optimizedFiles.push(optimized);
    } else {
      // Keep non-images as-is
      optimizedFiles.push(file);
    }
  }

  return optimizedFiles;
}
