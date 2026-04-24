import { supabase } from './supabaseClient.js';

export const profileService = {
  /**
   * Fetches the full profile data for a specific card_uid.
   */
  async getProfile(cardUid) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', cardUid) // Using user_id as card_uid reference
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  /**
   * Saves/Upserts the profile data.
   */
  async saveProfile(cardUid, profileData) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: cardUid,
        ...profileData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) throw error;
    return data;
  },

  /**
   * Uploads an image to the profile-images bucket.
   */
  async uploadImage(file, path) {
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(path, file, { upsert: true });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }
};
