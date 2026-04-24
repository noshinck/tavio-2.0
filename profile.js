import { getCardUid } from './utils/getCardUid.js';
import { profileService } from './services/profileService.js';
import { analyticsService } from './services/analyticsService.js';

// Owner of the profile being viewed
const cardUid = getCardUid();
console.log('PUBLIC PROFILE card_uid:', cardUid);

const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const profileCard = document.getElementById('profileCard');
const profileFooter = document.getElementById('profileFooter');

const dispName = document.getElementById('dispName');
const dispJob = document.getElementById('dispJob');
const dispBio = document.getElementById('dispBio');
const dispPhone = document.getElementById('dispPhone');
const avatarInitial = document.getElementById('avatarInitial');

async function initPublicProfile() {
  if (!cardUid) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    return;
  }

  try {
    const data = await profileService.getProfile(cardUid);
    
    // Check if private
    if (data.is_public === false) {
      loadingState.style.display = 'none';
      errorState.innerHTML = '<h2>This profile is private</h2>';
      errorState.style.display = 'block';
      return;
    }

    renderProfile(data);
    
    // Strictly track visit for the profile owner (cardUid)
    analyticsService.trackVisit(cardUid);

  } catch (error) {
    console.error('Profile Load Error:', error);
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
  }
}

function renderProfile(data) {
  loadingState.style.display = 'none';
  
  // Set Banner & Profile Image
  const banner = document.querySelector('.profile-banner');
  const avatar = document.querySelector('.profile-avatar');
  
  if (data.banner_image_url && banner) {
    banner.style.backgroundImage = `url(${data.banner_image_url})`;
  }
  if (data.profile_image_url && avatar) {
    avatar.style.backgroundImage = `url(${data.profile_image_url})`;
    avatar.textContent = '';
  } else if (avatar) {
    avatar.textContent = data.profile_initial || (data.full_name || 'A').charAt(0).toUpperCase();
  }

  dispName.textContent = data.full_name || 'Anonymous';
  
  let jobText = data.job_title || '';
  if (data.company) jobText += jobText ? ` at ${data.company}` : data.company;
  dispJob.textContent = jobText || 'Professional';
  
  const headline = document.getElementById('dispHeadline');
  if (headline) headline.textContent = data.headline || '';

  dispBio.textContent = data.bio || 'No bio provided.';

  // Render Skills
  const skillsRow = document.getElementById('dispSkills');
  if (skillsRow && data.skills) {
    skillsRow.innerHTML = data.skills.map(s => `<span class="skill-pill">${s}</span>`).join('');
  }

  // Render Socials
  const socialGrid = document.getElementById('socialGrid');
  if (socialGrid && data.social_links) {
    socialGrid.innerHTML = '';
    Object.entries(data.social_links).forEach(([platform, url]) => {
      if (url) {
        const btn = document.createElement('a');
        btn.href = url;
        btn.target = '_blank';
        btn.className = 'social-btn';
        btn.setAttribute('data-platform', platform);
        btn.innerHTML = `<span>🌐</span>`; 
        
        // Strictly track click for the profile owner (cardUid)
        btn.onclick = () => analyticsService.trackClick(cardUid, platform);
        
        socialGrid.appendChild(btn);
      }
    });
  }

  if (data.phone) {
    dispPhone.href = `tel:${data.phone}`;
    dispPhone.style.display = 'block';
    dispPhone.onclick = () => analyticsService.trackClick(cardUid, 'Call');
  } else {
    dispPhone.style.display = 'none';
  }

  profileCard.style.display = 'block';
  profileFooter.style.display = 'block';
}

initPublicProfile();
