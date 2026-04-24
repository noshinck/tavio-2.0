import { supabase } from './services/supabaseClient.js';
import { getCardUid } from './utils/getCardUid.js';
import { profileService } from './services/profileService.js';
import { analyticsService } from './services/analyticsService.js';

// --- Global State ---
let currentUser = null;
let cardUid = null;
let chartInstance = null;
let pollingInterval = null;

// --- DOM Elements ---
const navItems = document.querySelectorAll('.nav-item');
const tabViews = document.querySelectorAll('.tab-view');
const statViews = document.getElementById('stat-views');
const statVisitors = document.getElementById('stat-visitors');
const statClicks = document.getElementById('stat-clicks');
const statCompletion = document.getElementById('stat-completion');
const activityFeed = document.getElementById('activity-feed');

const logoutBtn = document.getElementById('logoutBtn');
const saveBtn = document.getElementById('saveBtn');
const msgBox = document.getElementById('msgBox');
const viewProfileBtn = document.getElementById('viewProfileBtn');

const nameInput = document.getElementById('name');
const jobInput = document.getElementById('job_title');
const companyInput = document.getElementById('company');
const phoneInput = document.getElementById('phone');
const bioInput = document.getElementById('bio');

// --- Tab Management ---
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(nav => nav.classList.remove('active'));
    tabViews.forEach(view => view.classList.remove('active'));
    item.classList.add('active');
    const targetId = item.getAttribute('data-target');
    const targetView = document.getElementById(targetId);
    if (targetView) targetView.classList.add('active');
    
    // Refresh specific tab data if needed
    if (targetId === 'view-links') loadLinks();
    if (targetId === 'view-analytics') refreshAnalytics();
    if (targetId === 'view-settings') loadSettings();
  });
});

// --- Profile State ---
let profileSkills = [];
let profileSocials = {};

// --- Profile Elements ---
const profName = document.getElementById('prof-name');
const profRole = document.getElementById('prof-role');
const profHeadline = document.getElementById('prof-headline');
const profCompany = document.getElementById('prof-company');
const profLocation = document.getElementById('prof-location');
const profPhone = document.getElementById('prof-phone');
const profEmail = document.getElementById('prof-email');
const profBio = document.getElementById('prof-bio');
const profInitial = document.getElementById('prof-initial');
const skillInput = document.getElementById('skill-input');
const addSkillBtn = document.getElementById('add-skill-btn');
const skillsTagsContainer = document.getElementById('skills-tags');
const uploadProfileImg = document.getElementById('upload-profile-img');
const uploadBannerImg = document.getElementById('upload-banner-img');
const saveProfileBtn = document.getElementById('saveProfileBtn');

// --- Preview Elements ---
const preName = document.getElementById('pre-name');
const preRole = document.getElementById('pre-role');
const preHeadline = document.getElementById('pre-headline');
const preInitial = document.getElementById('pre-initial');
const preBanner = document.getElementById('pre-banner');
const preSkills = document.getElementById('pre-skills');
const preSocials = document.getElementById('pre-socials');

// --- Auth & Data Initialization ---
async function initDashboard() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = session.user;
  // Dashboard ALWAYS manages the logged-in user's own profile
  cardUid = currentUser.id;
  console.log('DASHBOARD OWNER id:', cardUid);
  
  localStorage.setItem('card_uid', cardUid);

  // Set up public link for the owner
  viewProfileBtn.href = `profile?id=${cardUid}`;
  viewProfileBtn.style.display = 'inline-flex';

  await loadProfile();
  await refreshAnalytics();

  // STEP 4: REAL-TIME UPDATES & CLEANUP
  if (window.analyticsChannel) {
    supabase.removeChannel(window.analyticsChannel);
  }
  setupRealtimeAnalytics();
  
  // STEP 5: FALLBACK REFRESH (Heartbeat every 30s)
  if (window.fallbackRefresh) clearInterval(window.fallbackRefresh);
  window.fallbackRefresh = setInterval(refreshAnalytics, 30000);
  
  // Initialize Profile Event Listeners
  setupProfileListeners();
}

/**
 * Subscribes to database changes for instant dashboard updates.
 */
function setupRealtimeAnalytics() {
  window.analyticsChannel = supabase.channel('analytics-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'card_scans',
      filter: `card_uid=eq.${cardUid}`
    }, () => {
      console.log('Realtime update: Scan detected');
      refreshAnalytics();
    })
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'link_clicks',
      filter: `card_uid=eq.${cardUid}`
    }, () => {
      console.log('Realtime update: Click detected');
      refreshAnalytics();
    })
    .subscribe();
}

async function loadProfile() {
  try {
    // Strictly load the logged-in user's profile
    const data = await profileService.getProfile(currentUser.id);
    if (data) {
      // ... same as before ...
      // Form fields
      profName.value = data.full_name || '';
      profRole.value = data.job_title || '';
      profHeadline.value = data.headline || '';
      profCompany.value = data.company || '';
      profLocation.value = data.location || '';
      profPhone.value = data.phone || '';
      profEmail.value = data.email || '';
      profBio.value = data.bio || '';
      profInitial.value = data.profile_initial || '';
      
      // State
      profileSkills = data.skills || [];
      profileSocials = data.social_links || {};
      
      // Images
      if (data.profile_image_url) {
        preInitial.style.backgroundImage = `url(${data.profile_image_url})`;
        preInitial.textContent = '';
      }
      if (data.banner_image_url) {
        preBanner.style.backgroundImage = `url(${data.banner_image_url})`;
      }

      // Populate Social Inputs
      document.querySelectorAll('.social-input').forEach(input => {
        const platform = input.getAttribute('data-platform');
        input.value = profileSocials[platform] || '';
      });

      renderSkills();
      updatePreview();
      calculateCompletion(data);
    }
  } catch (err) {
    console.error('Profile Load Failed', err);
  }
}

function setupProfileListeners() {
  const inputs = [profName, profRole, profHeadline, profInitial, profBio];
  inputs.forEach(input => {
    input.addEventListener('input', updatePreview);
  });

  // Social inputs
  document.querySelectorAll('.social-input').forEach(input => {
    input.addEventListener('input', (e) => {
      profileSocials[e.target.getAttribute('data-platform')] = e.target.value;
      updatePreview();
    });
  });

  // Skills
  addSkillBtn.onclick = () => {
    const val = skillInput.value.trim();
    if (val && !profileSkills.includes(val)) {
      profileSkills.push(val);
      skillInput.value = '';
      renderSkills();
      updatePreview();
    }
  };

  // Image Uploads
  uploadProfileImg.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await profileService.uploadImage(file, `profiles/${cardUid}/avatar`);
      preInitial.style.backgroundImage = `url(${url})`;
      preInitial.textContent = '';
      uploadProfileImg.setAttribute('data-url', url);
    }
  };

  uploadBannerImg.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await profileService.uploadImage(file, `profiles/${cardUid}/banner`);
      preBanner.style.backgroundImage = `url(${url})`;
      uploadBannerImg.setAttribute('data-url', url);
    }
  };

  saveProfileBtn.onclick = handleSaveProfile;
}

function updatePreview() {
  preName.textContent = profName.value || 'Your Name';
  preRole.textContent = profRole.value || 'Your Role';
  preHeadline.textContent = profHeadline.value || 'Headline goes here';
  if (!preInitial.style.backgroundImage) {
    preInitial.textContent = profInitial.value || (profName.value ? profName.value.charAt(0) : '?');
  }

  // Preview Skills
  preSkills.innerHTML = profileSkills.map(s => `<span class="pre-skill">${s}</span>`).join('');

  // Preview Socials with specific icons
  const icons = {
    instagram: '📸',
    linkedin: '🔗',
    twitter: '🐦',
    youtube: '🎥',
    website: '🌐',
    github: '💻'
  };
  
  preSocials.innerHTML = Object.keys(profileSocials)
    .filter(k => profileSocials[k])
    .map(k => `<span class="pre-social-icon" title="${k}">${icons[k] || '🌐'}</span>`).join('');
}

function renderSkills() {
  skillsTagsContainer.innerHTML = profileSkills.map((s, i) => `
    <div class="skill-tag">${s} <span onclick="removeSkill(${i})">×</span></div>
  `).join('');
}

window.removeSkill = (index) => {
  profileSkills.splice(index, 1);
  renderSkills();
  updatePreview();
};

async function handleSaveProfile(e) {
  if (e) e.preventDefault();
  
  console.log("SAVE PROFILE CLICKED");
  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = 'Saving...';
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user");

    const profileData = {
      full_name: profName.value.trim(),
      job_title: profRole.value.trim(),
      headline: profHeadline.value.trim(),
      company: profCompany.value.trim(),
      location: profLocation.value.trim(),
      phone: profPhone.value.trim(),
      email: profEmail.value.trim(),
      bio: profBio.value.trim(),
      profile_initial: profInitial.value.trim(),
      skills: profileSkills,
      social_links: profileSocials,
      profile_image_url: uploadProfileImg.getAttribute('data-url') || null,
      banner_image_url: uploadBannerImg.getAttribute('data-url') || null,
      theme_color: '#3B30E8',
      updated_at: new Date().toISOString()
    };

    await profileService.saveProfile(user.id, profileData);
    
    console.log("SAVE SUCCESS");
    alert('Profile saved successfully!');
  } catch (err) {
    console.error("SAVE ERROR:", err);
    alert('Error saving profile: ' + err.message);
  }
  
  saveProfileBtn.disabled = false;
  saveProfileBtn.textContent = 'Save Profile';
}

async function refreshAnalytics() {
  try {
    // Production Grade: Grouped Data Fetching
    const [scansRes, clicksRes] = await Promise.all([
      supabase.from('card_scans').select('*').eq('card_uid', cardUid).order('scanned_at', { ascending: false }),
      supabase.from('link_clicks').select('*').eq('card_uid', cardUid)
    ]);

    const scans = scansRes.data || [];
    const clicks = clicksRes.data || [];
    
    const views = scans.filter(s => s.method === 'direct');
    const uniqueDevices = new Set(views.map(s => s.device)).size;

    if (statViews) statViews.textContent = views.length.toLocaleString();
    if (statClicks) statClicks.textContent = clicks.length.toLocaleString();
    if (statVisitors) statVisitors.textContent = uniqueDevices.toLocaleString();

    renderChart(views);
    renderActivityFeed(scans.slice(0, 10));
    
    const analyticsTab = document.getElementById('view-analytics');
    if (analyticsTab && analyticsTab.classList.contains('active')) {
      renderDeepAnalytics(views, clicks);
    }
    
    console.log('Dashboard Real-time Sync Complete');
  } catch (err) {
    console.warn('Analytics Refresh Failed', err);
  }
}

function renderDeepAnalytics(views, clicks) {
  const container = document.querySelector('#view-analytics .glass-panel');
  if (!container) return;
  
  // Calculate top links
  const linkCounts = {};
  clicks.forEach(c => {
    linkCounts[c.device] = (linkCounts[c.device] || 0) + 1;
  });
  const topLinks = Object.entries(linkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  container.innerHTML = `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:2rem;">
      <div>
        <h3 style="margin-bottom:1rem;">Top Links</h3>
        <div class="top-links-list">
          ${topLinks.length ? topLinks.map(([title, count]) => `
            <div style="display:flex; justify-content:space-between; padding:0.8rem; border-bottom:1px solid var(--border);">
              <span>${title}</span>
              <span class="stat-growth">${count} clicks</span>
            </div>
          `).join('') : '<p style="color:var(--muted)">No link data yet.</p>'}
        </div>
      </div>
      <div>
        <h3 style="margin-bottom:1rem;">Traffic Overview</h3>
        <p style="font-size:0.9rem; color:var(--muted); margin-bottom:1rem;">Total interactions in last 30 days.</p>
        <div style="font-size:2rem; font-weight:800; color:var(--blue);">${views.length + clicks.length}</div>
        <div style="font-size:0.85rem; color:var(--muted);">Combined Views & Clicks</div>
      </div>
    </div>
  `;
}

function calculateCompletion(profile) {
  const fields = ['full_name', 'job_title', 'company', 'phone', 'bio'];
  let filled = 0;
  fields.forEach(f => { if (profile[f]) filled++; });
  const percentage = Math.round((filled / fields.length) * 100);
  if (statCompletion) statCompletion.textContent = `${percentage}%`;
}

// --- Charting ---
function renderChart(viewScans) {
  const canvas = document.getElementById('viewsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const dates = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const dataPoints = dates.map(date => {
    return viewScans.filter(s => s.scanned_at && s.scanned_at.startsWith(date)).length;
  });

  const chartLabels = dates.map(d => {
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  });

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Views',
        data: dataPoints,
        borderColor: '#3B30E8',
        backgroundColor: 'rgba(59, 48, 232, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
      }
    }
  });
}

// --- Activity Feed ---
function renderActivityFeed(recentScans) {
  if (!activityFeed) return;
  activityFeed.innerHTML = '';
  if (recentScans.length === 0) {
    activityFeed.innerHTML = '<p style="color:var(--muted); font-size: 0.9rem;">No activity yet...</p>';
    return;
  }
  
  recentScans.forEach(scan => {
    const timeAgo = formatTimeAgo(new Date(scan.scanned_at));
    const label = scan.method === 'direct' ? 'Profile viewed' : `Link clicked: ${scan.device}`;
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="act-details">
        <p>${label}</p>
        <span>${timeAgo}</span>
      </div>
    `;
    activityFeed.appendChild(item);
  });
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

// --- Links Module Implementation ---
async function loadLinks() {
  const linksContainer = document.querySelector('#view-links .glass-panel');
  if (!linksContainer) return;
  
  const links = await profileService.getLinks(cardUid);
  linksContainer.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
      <h3>Manage Links</h3>
      <button id="addLinkBtn" class="btn btn-primary btn-sm">+ Add New</button>
    </div>
    <div id="linksList">
      ${links.map(link => `
        <div class="link-row" style="display:flex; justify-content:space-between; padding:1rem; border:1px solid var(--border); border-radius:12px; margin-bottom:0.5rem;">
          <div>
            <strong>${link.title}</strong><br>
            <small style="color:var(--muted)">${link.url}</small>
          </div>
          <button class="btn-delete" onclick="window.deleteLink(${link.id})">Delete</button>
        </div>
      `).join('')}
    </div>
  `;

  document.getElementById('addLinkBtn').onclick = () => {
    const title = prompt('Link Title:');
    const url = prompt('Link URL:');
    if (title && url) {
      profileService.addLink({ card_uid: cardUid, title, url }).then(loadLinks);
    }
  };
}

window.deleteLink = async (id) => {
  if (confirm('Delete this link?')) {
    await profileService.deleteLink(id);
    loadLinks();
  };
}

// --- Settings Module ---
async function loadSettings() {
  const settingsContainer = document.querySelector('#view-settings .glass-panel');
  if (!settingsContainer) return;

  const profile = await profileService.getProfile(currentUser.id);
  settingsContainer.innerHTML = `
    <h3>Account Settings</h3>
    <div class="form-group" style="margin-top:1.5rem;">
      <label>Profile Visibility</label>
      <select id="visibilityToggle" class="form-control" style="width:100%; padding:0.8rem; border-radius:8px; border:1px solid var(--border);">
        <option value="public" ${profile.is_public !== false ? 'selected' : ''}>Public (Everyone can see)</option>
        <option value="private" ${profile.is_public === false ? 'selected' : ''}>Private (Only you can see)</option>
      </select>
    </div>
    <button id="saveSettingsBtn" class="btn btn-primary" style="margin-top:1rem; width:100%;">Save Settings</button>
  `;

  document.getElementById('saveSettingsBtn').onclick = async () => {
    const isPublic = document.getElementById('visibilityToggle').value === 'public';
    await profileService.setVisibility(currentUser.id, isPublic);
    alert('Settings saved!');
  };
}

// --- Save Profile Event ---
saveBtn.onclick = async () => {
  saveBtn.disabled = true;
  saveBtn.classList.add('loading');
  try {
    await profileService.updateProfile({
      user_id: currentUser.id,
      full_name: nameInput.value.trim(),
      job_title: jobInput.value.trim(),
      company: companyInput.value.trim(),
      phone: phoneInput.value.trim(),
      bio: bioInput.value.trim()
    });
    msgBox.textContent = 'Profile saved successfully!';
    msgBox.className = 'error-message success';
  } catch (err) {
    msgBox.textContent = 'Error saving profile';
  }
  saveBtn.disabled = false;
  saveBtn.classList.remove('loading');
};

// --- Logout ---
logoutBtn.onclick = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem("card_uid");
  window.location.href = 'index.html';
};

initDashboard();
