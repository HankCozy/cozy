import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress and resize image for profile upload
 * Result: ~200-300KB JPEG from typical 3-5MB photo
 */
export async function compressProfilePicture(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }], // Max 800px wide, maintains aspect ratio
    {
      compress: 0.7, // 70% quality
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return result.uri;
}
