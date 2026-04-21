import { supabase } from './supabaseClient.js';

const urlParams = new URLSearchParams(window.location.search);
const profileId = urlParams.get('id');

const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const profileCard = document.getElementById('profileCard');
const profileFooter = document.getElementById('profileFooter');

const dispName = document.getElementById('dispName');
const dispJob = document.getElementById('dispJob');
const dispBio = document.getElementById('dispBio');
const dispPhone = document.getElementById('dispPhone');
const avatarInitial = document.getElementById('avatarInitial');

async function loadPublicProfile() {
  if (!profileId) {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', profileId)
    .single();

  loadingState.style.display = 'none';

  if (error || !data) {
    errorState.style.display = 'block';
    return;
  }

  // Populate data
  dispName.textContent = data.full_name || 'Anonymous';
  avatarInitial.textContent = (data.full_name || 'A').charAt(0).toUpperCase();

  let jobText = data.job_title || '';
  if (data.company) {
    jobText += jobText ? ` at ${data.company}` : data.company;
  }
  dispJob.textContent = jobText || 'Professional';

  dispBio.textContent = data.bio || 'No bio provided.';

  if (data.phone) {
    dispPhone.href = `tel:${data.phone}`;
  } else {
    dispPhone.style.display = 'none';
  }

  profileCard.style.display = 'block';
  profileFooter.style.display = 'block';
}

loadPublicProfile();
