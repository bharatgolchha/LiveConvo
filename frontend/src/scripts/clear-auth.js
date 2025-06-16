#!/usr/bin/env node

/**
 * Quick script to clear authentication data from the browser
 * Run this in the browser console if you're stuck and can't sign out
 */

function clearAllAuthData() {
  console.log('🧹 Clearing all authentication data...');
  
  // Clear localStorage
  const localKeys = Object.keys(localStorage);
  let clearedLocal = 0;
  localKeys.forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
      console.log(`  Removing localStorage: ${key}`);
      localStorage.removeItem(key);
      clearedLocal++;
    }
  });
  
  // Clear sessionStorage
  const sessionKeys = Object.keys(sessionStorage);
  let clearedSession = 0;
  sessionKeys.forEach(key => {
    if (key.includes('supabase') || key.includes('sb-') || key.includes('auth')) {
      console.log(`  Removing sessionStorage: ${key}`);
      sessionStorage.removeItem(key);
      clearedSession++;
    }
  });
  
  // Clear cookies
  let clearedCookies = 0;
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
    if (name.includes('supabase') || name.includes('sb-') || name.includes('auth')) {
      console.log(`  Removing cookie: ${name}`);
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      clearedCookies++;
    }
  });
  
  console.log(`\n✅ Cleared:`);
  console.log(`  - ${clearedLocal} localStorage items`);
  console.log(`  - ${clearedSession} sessionStorage items`);
  console.log(`  - ${clearedCookies} cookies`);
  
  console.log('\n🔄 Redirecting to homepage in 2 seconds...');
  
  setTimeout(() => {
    window.location.href = '/';
  }, 2000);
}

// If running in Node.js environment, provide instructions
if (typeof window === 'undefined') {
  console.log(`
To clear authentication data:

1. Open your browser and navigate to the application
2. Open the browser console (F12 or Cmd+Option+I)
3. Copy and paste this function:

${clearAllAuthData.toString()}

4. Then run: clearAllAuthData()

Or navigate to: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/recovery
`);
} else {
  // Auto-run if executed in browser
  clearAllAuthData();
}