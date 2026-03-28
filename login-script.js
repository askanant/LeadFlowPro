/**
 * Quick login to test dashboard
 * Run in browser console (F12 → Console tab)
 */

async function loginAndTest() {
  const loginUrl = 'http://localhost:3000/api/auth/login';
  
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'anantshukla@live.com',
      password: 'Admin@$1234!',
    }),
  });

  if (response.ok) {
    const data = await response.json();
    
    // Save token to localStorage
    localStorage.setItem('token', data.token);
    
    console.log('✅ Login successful!');
    console.log('Token:', data.token);
    
    // Redirect to dashboard
    window.location.href = 'http://localhost:5176/dashboard';
  } else {
    console.error('❌ Login failed:', response.statusText);
    const error = await response.text();
    console.error('Error:', error);
  }
}

// Run it
loginAndTest();
