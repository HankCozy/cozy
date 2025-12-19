import { createClient } from '@supabase/supabase-js';

// Supabase credentials from environment variables
// SECURITY: Never hardcode credentials in source code
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate credentials are present
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing Supabase configuration. Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env file.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const PROFILE_PICTURES_BUCKET = 'profile-pictures';

/**
 * Upload profile picture to Supabase Storage
 * Note: Bucket is PRIVATE for security. Use backend endpoint to get signed URLs.
 */
export async function uploadProfilePicture(
  userId: string,
  imageUri: string
): Promise<void> {
  const fileName = `${userId}.jpg`;

  // React Native approach: Create FormData with the image
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: fileName,
  } as any);

  // Use Supabase storage upload with arraybuffer
  const response = await fetch(imageUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .upload(fileName, arrayBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: true, // Overwrites existing
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);
}

/**
 * Delete profile picture from Supabase Storage
 */
export async function deleteProfilePicture(userId: string): Promise<void> {
  const { error } = await supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .remove([`${userId}.jpg`]);

  if (error) throw new Error(`Delete failed: ${error.message}`);
}
