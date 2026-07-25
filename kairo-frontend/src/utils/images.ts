export function isHeicImage(file: File): boolean {
  return (
    file.type === 'image/heic'
    || file.type === 'image/heif'
    || /\.hei[cf]$/i.test(file.name)
  );
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any');
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.8,
  });
  const convertedBlob = Array.isArray(result) ? result[0] : result;

  if (!convertedBlob) {
    throw new Error('The HEIC image did not produce a converted file.');
  }

  return new File(
    [convertedBlob],
    file.name.replace(/\.hei[cf]$/i, '.jpg'),
    { type: 'image/jpeg' },
  );
}
