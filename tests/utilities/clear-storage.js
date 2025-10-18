// Quick script to clear localStorage and fix quota exceeded error
// Run this in browser console: localStorage.clear()

console.log('Clearing localStorage to fix quota exceeded error...');

// Clear all localStorage
localStorage.clear();

// Clear any sessionStorage related to the app
Object.keys(sessionStorage).forEach(key => {
  if (key.includes('gemini-chat') || key.includes('attachment')) {
    sessionStorage.removeItem(key);
  }
});

console.log('localStorage cleared successfully!');
console.log('You can now refresh the page and the quota exceeded error should be resolved.');
