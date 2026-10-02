let signup = false;

auth.onAuthStateChanged(u => { if (u) location.replace('dashboard.html'); });

$('switch').onclick = () => {
  signup = !signup;
  $('title').textContent = signup ? 'Create account' : 'Sign in';
  $('submit').textContent = signup ? 'Sign up' : 'Sign in';
  $('switch').textContent = signup ? 'Sign in' : 'Create account';
  $('switchText').textContent = signup ? 'Already have an account?' : 'New here?';
  $('confirmBox').hidden = !signup;
  $('pw').autocomplete = signup ? 'new-password' : 'current-password';
  $('err').textContent = '';
};

const MSG = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'This email is already registered. Try signing in.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
  'auth/network-request-failed': 'No internet connection.'
};

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('err'), btn = $('submit');
  const email = $('email').value.trim(), pw = $('pw').value;
  err.textContent = '';
  if (!/^\S+@\S+\.\S+$/.test(email)) return err.textContent = 'Enter a valid email address.';
  if (pw.length < 6) return err.textContent = 'Password must be at least 6 characters.';
  if (signup && pw !== $('pw2').value) return err.textContent = 'Passwords do not match.';

  btn.disabled = true; btn.textContent = 'Please wait…';
  try {
    if (signup) await auth.createUserWithEmailAndPassword(email, pw);
    else await auth.signInWithEmailAndPassword(email, pw);
    location.href = 'dashboard.html';
  } catch (ex) {
    err.textContent = MSG[ex.code] || ex.message;
    btn.disabled = false; btn.textContent = signup ? 'Sign up' : 'Sign in';
  }
});