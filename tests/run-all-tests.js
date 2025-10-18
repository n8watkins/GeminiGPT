#!/usr/bin/env node

/**
 * Test Runner - Runs all tests in organized test suites
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runTest(testFile, category) {
    return new Promise((resolve) => {
      console.log(`\n🧪 Running ${category}: ${testFile}`);
      console.log('─'.repeat(50));
      
      const testPath = path.join(__dirname, category, testFile);
      const child = spawn('node', [testPath], { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      child.on('close', (code) => {
        const result = {
          file: testFile,
          category,
          success: code === 0,
          exitCode: code
        };
        
        this.testResults.push(result);
        
        const status = code === 0 ? '✅' : '❌';
        console.log(`\n${status} ${testFile} completed with exit code: ${code}`);
        
        resolve(result);
      });

      child.on('error', (error) => {
        console.error(`❌ Error running ${testFile}:`, error.message);
        this.testResults.push({
          file: testFile,
          category,
          success: false,
          error: error.message
        });
        resolve();
      });
    });
  }

  async runTestSuite(category) {
    const categoryPath = path.join(__dirname, category);
    
    if (!fs.existsSync(categoryPath)) {
      console.log(`⚠️  Category ${category} does not exist, skipping...`);
      return;
    }

    const testFiles = fs.readdirSync(categoryPath)
      .filter(file => file.endsWith('.js') && file !== 'run-all-tests.js')
      .sort();

    if (testFiles.length === 0) {
      console.log(`📁 No test files found in ${category}/`);
      return;
    }

    console.log(`\n📋 Running ${category} tests (${testFiles.length} files)`);
    console.log('='.repeat(60));

    for (const testFile of testFiles) {
      await this.runTest(testFile, category);
    }
  }

  async runAllTests() {
    console.log('🚀 COMPREHENSIVE TEST SUITE RUNNER');
    console.log('='.repeat(60));
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log(`📁 Test directory: ${__dirname}`);

    // Run tests in order of importance
    const testCategories = [
      'database',      // Core database functionality
      'integration',   // System integration tests
      'performance'    // Performance and load tests
    ];

    // Also run root-level tests
    const rootTests = fs.readdirSync(__dirname)
      .filter(file => file.startsWith('test-') && file.endsWith('.js'))
      .sort();

    for (const category of testCategories) {
      await this.runTestSuite(category);
    }

    // Run root-level tests
    if (rootTests.length > 0) {
      console.log(`\n📋 Running root-level tests (${rootTests.length} files)`);
      console.log('='.repeat(60));
      
      for (const testFile of rootTests) {
        await this.runTest(testFile, 'root');
      }
    }

    this.printResults();
  }

  printResults() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`\n📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);
    console.log(`   Duration: ${Math.round(duration / 1000)}s`);
    
    // Group results by category
    const resultsByCategory = {};
    this.testResults.forEach(result => {
      if (!resultsByCategory[result.category]) {
        resultsByCategory[result.category] = { passed: 0, failed: 0, total: 0 };
      }
      resultsByCategory[result.category].total++;
      if (result.success) {
        resultsByCategory[result.category].passed++;
      } else {
        resultsByCategory[result.category].failed++;
      }
    });
    
    console.log(`\n📋 Results by Category:`);
    Object.entries(resultsByCategory).forEach(([category, stats]) => {
      const successRate = Math.round((stats.passed / stats.total) * 100);
      console.log(`   ${category}: ${stats.passed}/${stats.total} (${successRate}%)`);
    });
    
    if (failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      this.testResults
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.category}/${r.file}: ${r.error || `Exit code ${r.exitCode}`}`);
        });
    }
    
    console.log(`\n🎉 Test Suite Complete!`);
    
    if (failedTests === 0) {
      console.log(`✅ All tests passed! Your system is working perfectly.`);
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed. Please review the issues above.`);
    }
    
    console.log(`\n📁 Test files organized in:`);
    console.log(`   tests/database/     - Database functionality tests`);
    console.log(`   tests/integration/  - System integration tests`);
    console.log(`   tests/performance/  - Performance and load tests`);
    console.log(`   tests/              - General application tests`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = { TestRunner };
