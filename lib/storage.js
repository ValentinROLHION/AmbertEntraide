const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Upload a file buffer to Supabase Storage.
 * Returns { filename, publicUrl }
 */
async function uploadFile(bucket, buffer, originalName, mimeType) {
  const ext = path.extname(originalName).toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Supabase Storage upload error: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filename);

  return { filename, publicUrl };
}

/**
 * Delete a file from Supabase Storage.
 * Accepts either a full public URL or just the filename.
 */
async function deleteFile(bucket, urlOrFilename) {
  if (!urlOrFilename) return;
  // Extract only the last path segment (filename)
  const filename = urlOrFilename.split('/').pop();
  try {
    await supabase.storage.from(bucket).remove([filename]);
  } catch (e) {
    console.warn(`Storage delete warning (${bucket}/${filename}):`, e.message);
  }
}

module.exports = { uploadFile, deleteFile };
