/**
 * Validates if a string is a proper UUID.
 */
function isValidUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// Internal state for click debouncing
const clickCooldowns = new Set();

const EDGE_FUNCTION_URL = 'https://nklsajfbjlgtkzcqydyy.supabase.co/functions/v1/track-analytics';

export const analyticsService = {
  /**
   * Tracks a profile visit via Secure Edge Function.
   */
  async trackVisit(cardUid) {
    if (!cardUid || !isValidUUID(cardUid)) {
      console.error('Tracking Error: Invalid cardUid:', cardUid);
      return;
    }
    
    const cooldownKey = `visit_cooldown_${cardUid}`;
    if (sessionStorage.getItem(cooldownKey)) return;

    try {
      console.log('TRACKING VISIT (Secure):', cardUid);
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_uid: cardUid, type: 'visit' })
      });

      if (!response.ok) throw new Error('Secure tracking failed');

      console.log('Tracking Success (Visit):', cardUid);
      sessionStorage.setItem(cooldownKey, 'true');
      setTimeout(() => sessionStorage.removeItem(cooldownKey), 10000);
    } catch (err) {
      console.error('Tracking Error (Visit):', err.message);
    }
  },

  /**
   * Tracks a link click via Secure Edge Function.
   */
  async trackClick(cardUid, platform) {
    if (!cardUid || !isValidUUID(cardUid)) {
      console.error('Tracking Error (Click): Invalid cardUid:', cardUid);
      return;
    }

    const cooldownId = `${cardUid}_${platform}`;
    if (clickCooldowns.has(cooldownId)) return;

    try {
      clickCooldowns.add(cooldownId);
      console.log('TRACKING CLICK (Secure):', cardUid, platform);

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_uid: cardUid, type: 'click', title: platform })
      });

      if (!response.ok) throw new Error('Secure tracking failed');
      
      console.log('Tracking Success (Click):', cardUid, platform);
    } catch (err) {
      console.error('Tracking Error (Click):', err.message);
    } finally {
      setTimeout(() => clickCooldowns.delete(cooldownId), 2000);
    }
  },

  /**
   * Fetches analytics data using the provided cardUid.
   */
  async getAnalytics(cardUid) {
    if (!cardUid || !isValidUUID(cardUid)) throw new Error('Invalid cardUid for fetch');
    const { data, error } = await supabase
      .from('card_scans')
      .select('*')
      .eq('card_uid', cardUid)
      .order('scanned_at', { ascending: false });

    if (error) throw error;
    return data;
  }
};
