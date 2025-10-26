/**
 * Test to measure health check response timing
 * This helps identify why Railway health checks are timing out
 */

const http = require('http');

function testHealthCheck(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const req = http.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          duration,
          success: res.statusCode === 200
        });
      });
    });

    req.on('error', (err) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      reject({
        error: err.message,
        duration,
        success: false
      });
    });

    req.setTimeout(timeout, () => {
      req.destroy();
      const endTime = Date.now();
      const duration = endTime - startTime;

      reject({
        error: 'Request timeout',
        duration,
        success: false
      });
    });
  });
}

async function runTests() {
  console.log('🧪 Testing health check endpoint timing...\n');

  // Test multiple times to get average
  const results = [];
  const numTests = 5;

  for (let i = 0; i < numTests; i++) {
    console.log(`Test ${i + 1}/${numTests}...`);

    try {
      const result = await testHealthCheck('http://localhost:1339/healthz');
      results.push(result);

      console.log(`  ✅ Status: ${result.statusCode}`);
      console.log(`  ⏱️  Duration: ${result.duration}ms`);
      console.log(`  📝 Body: "${result.body}"\n`);
    } catch (err) {
      console.error(`  ❌ Error: ${err.error}`);
      console.error(`  ⏱️  Duration: ${err.duration}ms\n`);
      results.push(err);
    }

    // Wait between tests
    if (i < numTests - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Calculate statistics
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    const durations = successful.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log('📊 Statistics:');
    console.log(`  - Success rate: ${successful.length}/${numTests} (${(successful.length/numTests*100).toFixed(1)}%)`);
    console.log(`  - Average response time: ${avgDuration.toFixed(2)}ms`);
    console.log(`  - Min response time: ${minDuration}ms`);
    console.log(`  - Max response time: ${maxDuration}ms`);

    // Check if health check is fast enough for Railway
    console.log('\n🏥 Health Check Analysis:');
    if (avgDuration < 100) {
      console.log('  ✅ Very fast - should work well in Railway');
    } else if (avgDuration < 1000) {
      console.log('  ⚠️  Acceptable - may work in Railway');
    } else {
      console.log('  ❌ Too slow - will likely timeout in Railway');
    }
  }

  if (failed.length > 0) {
    console.log(`\n❌ ${failed.length} tests failed`);
    failed.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.error} (after ${f.duration}ms)`);
    });
  }
}

runTests().catch(console.error);
