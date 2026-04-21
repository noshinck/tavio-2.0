import { supabase } from './supabaseClient.js';

// --- Tab Management ---
const navItems = document.querySelectorAll('.nav-item');
const tabViews = document.querySelectorAll('.tab-view');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    // Remove active class from all
    navItems.forEach(nav => nav.classList.remove('active'));
    tabViews.forEach(view => view.classList.remove('active'));
    
    // Add active class to clicked item and target view
    item.classList.add('active');
    const targetId = item.getAttribute('data-target');
    document.getElementById(targetId).classList.add('active');
  });
});

// --- Share Quick Action ---
document.getElementById('quickShareBtn').addEventListener('click', async () => {
  if (!currentUser) return;
  const link = `${window.location.origin}/profile?id=${currentUser.id}`;
  try {
    await navigator.clipboard.writeText(link);
    alert('Public profile link copied to clipboard!');
  } catch (err) {
    alert('Failed to copy link. Here it is: ' + link);
  }
});

// --- Chart.js Initialization ---
function initChart() {
  const ctx = document.getElementById('viewsChart').getContext('2d');
  
  // Gradient fill for chart
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(59, 48, 232, 0.4)');
  gradient.addColorStop(1, 'rgba(59, 48, 232, 0)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['15 Apr', '16 Apr', '17 Apr', '18 Apr', '19 Apr', '20 Apr', 'Today'],
      datasets: [{
        label: 'Profile Views',
        data: [120, 190, 150, 280, 220, 340, 410],
        borderColor: '#3B30E8',
        backgroundColor: gradient,
        borderWidth: 3,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#3B30E8',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          padding: 12,
          titleFont: { size: 13, family: 'Inter' },
          bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
          displayColors: false,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 12 }, color: '#6B7280' }
        },
        y: {
          border: { display: false },
          grid: { color: '#E5E7EB', drawBorder: false },
          ticks: { font: { family: 'Inter', size: 12 }, color: '#6B7280', padding: 10 }
        }
      }
    }
  });
}

// Initialize chart when DOM is ready
document.addEventListener('DOMContentLoaded', initChart);

// --- Supabase Profile Logic ---
const logoutBtn = document.getElementById('logoutBtn');
const saveBtn = document.getElementById('saveBtn');
const msgBox = document.getElementById('msgBox');
const viewProfileBtn = document.getElementById('viewProfileBtn');

const nameInput = document.getElementById('name');
const jobInput = document.getElementById('job_title');
const companyInput = document.getElementById('company');
const phoneInput = document.getElementById('phone');
const bioInput = document.getElementById('bio');

let currentUser = null;

// Check auth & load profile
async function initDashboard() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = session.user;
  
  // Set up the public profile link
  viewProfileBtn.href = `profile?id=${currentUser.id}`;
  viewProfileBtn.style.display = 'inline-flex';

  await loadProfile();
}

async function loadProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();

  if (data) {
    nameInput.value = data.full_name || '';
    jobInput.value = data.job_title || '';
    companyInput.value = data.company || '';
    phoneInput.value = data.phone || '';
    bioInput.value = data.bio || '';
  }
}

// Save Profile Flow
saveBtn.addEventListener('click', async () => {
  if (!currentUser) return;

  saveBtn.disabled = true;
  saveBtn.classList.add('loading');
  msgBox.textContent = '';
  msgBox.className = 'error-message';

  const user = currentUser;
  const fullName = nameInput.value.trim();
  const job = jobInput.value.trim();
  const company = companyInput.value.trim();
  const phone = phoneInput.value.trim();
  const bio = bioInput.value.trim();

  const { error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      full_name: fullName,
      job_title: job,
      company: company,
      phone: phone,
      bio: bio
    }, { onConflict: 'user_id' });

  saveBtn.disabled = false;
  saveBtn.classList.remove('loading');

  if (error) {
    msgBox.textContent = 'Error saving profile: ' + error.message;
  } else {
    msgBox.textContent = 'Profile saved successfully!';
    msgBox.className = 'error-message success';
  }
});

// Listen for auth changes to kick out logged out users
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    window.location.href = 'index.html';
  }
});

// Logout
logoutBtn.addEventListener('click', async () => {
  logoutBtn.disabled = true;
  await supabase.auth.signOut();
});

initDashboard();
