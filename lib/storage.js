const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Lazy-init: don't throw at startup if env vars are missing
let _supabase = null;
function getClient() {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis pour le stockage fichiers');
    }
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }
  return _supabase;
}

/**
 * Upload a file buffer to Supabase Storage.
 * Returns { filename, publicUrl }
 */
async function uploadFile(bucket, buffer, originalName, mimeType) {
  const ext = path.extname(originalName).toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;

  const supabase = getClient();
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
    await getClient().storage.from(bucket).remove([filename]);
  } catch (e) {
    console.warn(`Storage delete warning (${bucket}/${filename}):`, e.message);
  }
}

module.exports = { uploadFile, deleteFile };
