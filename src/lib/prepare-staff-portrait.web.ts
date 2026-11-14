// Portraits appear at 48–72 CSS pixels. Keep ample resolution for high-DPI
// displays without distributing multi-megabyte camera originals to families.
export async function prepareStaffPortrait(data: ArrayBuffer, mimeType: string) {
  const original = { data, mimeType };
  // Preserve animated WebP/APNG portraits. Existing WebP files are already
  // compressed and do not benefit from another lossy encoding step.
  if (mimeType === 'image/webp') return original;
  if (mimeType === 'image/png') {
    const chunks = new DataView(data);
    for (let offset = 8; offset + 12 <= data.byteLength;) {
      if (chunks.getUint32(offset + 4) === 0x6163546c) return original; // acTL
      offset += chunks.getUint32(offset) + 12;
    }
  }
  if (typeof createImageBitmap !== 'function') return original;
  let image: ImageBitmap | undefined;
  try {
    image = await createImageBitmap(new Blob([data], { type: mimeType }));
    const scale = Math.min(1, 512 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return original;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    if (!blob || blob.type !== 'image/webp' || blob.size >= data.byteLength) return original;
    return { data: await blob.arrayBuffer(), mimeType: blob.type };
  } catch {
    // Unsupported/invalid image decoding must not break an existing upload.
    return original;
  } finally {
    image?.close();
  }
}
