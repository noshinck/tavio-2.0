/**
 * Reusable utility to get the card_uid from the most reliable source.
 * Priority: localStorage -> URL Parameters
 * @returns {string|null}
 */
export function getCardUid() {
  // Check URL first (highest priority for public profiles)
  const urlParams = new URLSearchParams(window.location.search);
  const idFromUrl = urlParams.get('id');
  
  if (idFromUrl) {
    localStorage.setItem('card_uid', idFromUrl);
    return idFromUrl;
  }
  
  // Fallback to localStorage (for dashboard)
  return localStorage.getItem('card_uid');
}
