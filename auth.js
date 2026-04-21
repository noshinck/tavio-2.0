import { supabase } from './supabaseClient.js';

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const errorMsg = document.getElementById('errorMsg');
const authTitle = document.querySelector('.auth-header h1');
const authDesc = document.querySelector('.auth-header p');
const loginBtnText = loginBtn.querySelector('.btn-label');

let mode = 'login'; // default

// Check if user is already logged in
async function checkUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = 'dashboard.html';
  }
}

checkUser();

// Get inputs and validate
function getValidInputs() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  errorMsg.textContent = '';
  errorMsg.className = 'error-message';
  
  if (!email || !password) {
    errorMsg.textContent = 'Please enter both email and password';
    return null;
  }
  return { email, password };
}

// ── Toggle Form Mode
signupBtn.addEventListener('click', () => {
  errorMsg.textContent = '';

  if (mode === 'login') {
    // Switch to Signup Mode
    mode = 'signup';
    authTitle.textContent = 'Create your account';
    authDesc.textContent = 'Sign up to create your digital profile.';
    loginBtnText.textContent = 'Create Account';
    signupBtn.textContent = 'Back to Login';
  } else {
    // Switch to Login Mode
    mode = 'login';
    authTitle.textContent = 'Welcome back';
    authDesc.textContent = 'Please log in to your account to continue.';
    loginBtnText.textContent = 'Login';
    signupBtn.textContent = 'Sign Up';
  }
});

// ── Submit Actions (Login / Signup based on mode)
loginBtn.addEventListener('click', async () => {
  const inputs = getValidInputs();
  if (!inputs) return;

  loginBtn.disabled = true;
  loginBtn.classList.add('loading');

  if (mode === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: inputs.email,
      password: inputs.password
    });

    loginBtn.disabled = false;
    loginBtn.classList.remove('loading');

    if (error) {
      errorMsg.textContent = error.message;
    } else {
      window.location.href = 'dashboard.html';
    }
  } else if (mode === 'signup') {
    const { data, error } = await supabase.auth.signUp({
      email: inputs.email,
      password: inputs.password,
      options: {
        emailRedirectTo: 'http://localhost:3000/dashboard'
      }
    });

    loginBtn.disabled = false;
    loginBtn.classList.remove('loading');

    if (error) {
      errorMsg.textContent = error.message;
    } else {
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        errorMsg.textContent = 'User already exists. Try logging in.';
      } else {
        errorMsg.className = 'error-message success';
        errorMsg.textContent = 'Check your email to verify your account';
      }
    }
  }
});

// ── OAuth Logins ───────────────────────────────────────────

async function googleLogin() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:3000/dashboard'
    }
  });
}

async function githubLogin() {
  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: 'http://localhost:3000/dashboard'
    }
  });
}

document.getElementById('googleBtn').onclick = googleLogin;
document.getElementById('githubBtn').onclick = githubLogin;
