/**
 * Check WebSocket Server Status
 * Run this to verify the server is running and accepting connections
 */

const io = require('socket.io-client');

console.log('🔍 Checking WebSocket Server Status\n');
console.log('═'.repeat(60));

const socket = io('http://localhost:1337', {
  timeout: 5000,
  transports: ['websocket', 'polling']
});

let connected = false;

socket.on('connect', () => {
  connected = true;
  console.log('\n✅ WebSocket Server Status: ONLINE');
  console.log(`   Connection ID: ${socket.id}`);
  console.log(`   Transport: ${socket.io.engine.transport.name}`);
  console.log('\n✅ Your browser should be able to connect to this server.');
  console.log('\n💡 Next Steps:');
  console.log('   1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)');
  console.log('   2. Open DevTools (F12) and check the Console tab');
  console.log('   3. Look for "WebSocket connection established"');
  console.log('   4. Try sending a message\n');

  socket.close();
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.log('\n❌ WebSocket Server Status: OFFLINE');
  console.log(`   Error: ${error.message}`);
  console.log('\n🔧 Troubleshooting:');
  console.log('   1. Make sure the server is running: npm run dev');
  console.log('   2. Check if port 1337 is in use by another process');
  console.log('   3. Check the server logs for errors\n');

  process.exit(1);
});

socket.on('error', (error) => {
  console.error('\n❌ Socket error:', error.message);
  socket.close();
  process.exit(1);
});

setTimeout(() => {
  if (!connected) {
    console.log('\n⏱️  Connection timed out');
    console.log('   The server is not responding on http://localhost:1337');
    console.log('\n🔧 Try starting the server: npm run dev\n');
    socket.close();
    process.exit(1);
  }
}, 5500);
