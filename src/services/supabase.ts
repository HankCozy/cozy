import { createClient } from '@supabase/supabase-js';

// Supabase credentials
const SUPABASE_URL = 'https://ybwactpvyffcgevltfvg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlid2FjdHB2eWZmY2dldmx0ZnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjYzMTUsImV4cCI6MjA3NDc0MjMxNX0.q74cwNcjsR8G_uLETy51PFHFviVyAZWJhLS2zIqnz7Y';

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
  const response = await fetch(imageUri);
  const blob = await response.blob();

  const fileName = `${userId}.jpg`;
  const file = new File([blob], fileName, { type: 'image/jpeg' });

  const { error } = await supabase.storage
    .from(PROFILE_PICTURES_BUCKET)
    .upload(fileName, file, {
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
