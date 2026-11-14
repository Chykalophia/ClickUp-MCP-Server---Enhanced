module.exports = function resultsProcessor(results) {
  console.log('\n📊 Test Results Summary:');
  console.log(`Total Tests: ${results.numTotalTests}`);
  console.log(`Passed: ${results.numPassedTests}`);
  console.log(`Failed: ${results.numFailedTests}`);
  console.log(`Skipped: ${results.numPendingTests}`);
  console.log(`Test Suites: ${results.numTotalTestSuites}`);
  console.log(`Time: ${(results.testResults.reduce((acc, result) => acc + (result.perfStats.end - result.perfStats.start), 0) / 1000).toFixed(2)}s`);
  
  if (results.coverageMap) {
    const coverage = results.coverageMap.getCoverageSummary();
    console.log('\n📈 Coverage Summary:');
    console.log(`Lines: ${coverage.lines.pct}%`);
    console.log(`Functions: ${coverage.functions.pct}%`);
    console.log(`Branches: ${coverage.branches.pct}%`);
    console.log(`Statements: ${coverage.statements.pct}%`);
  }
  
  if (results.numFailedTests > 0) {
    console.log('\n❌ Failed Tests:');
    results.testResults.forEach(testResult => {
      if (testResult.numFailingTests > 0) {
        console.log(`\n  ${testResult.testFilePath}:`);
        testResult.testResults.forEach(test => {
          if (test.status === 'failed') {
            console.log(`    - ${test.fullName}`);
            if (test.failureMessages.length > 0) {
              console.log(`      ${test.failureMessages[0].split('\n')[0]}`);
            }
          }
        });
      }
    });
  }
  
  const slowTests = results.testResults.filter(result => 
    (result.perfStats.end - result.perfStats.start) > 5000
  );
  
  if (slowTests.length > 0) {
    console.log('\n⚠️  Slow Tests (>5s):');
    slowTests.forEach(test => {
      const duration = ((test.perfStats.end - test.perfStats.start) / 1000).toFixed(2);
      console.log(`  ${test.testFilePath}: ${duration}s`);
    });
  }
  
  const securityTests = results.testResults.filter(result => 
    result.testFilePath.includes('security.test')
  );
  
  if (securityTests.length > 0) {
    console.log('\n🔒 Security Tests:');
    securityTests.forEach(test => {
      const passed = test.numPassingTests;
      const total = test.numPassingTests + test.numFailingTests;
      console.log(`  ${test.testFilePath}: ${passed}/${total} passed`);
    });
  }
  
  console.log('\n');
  
  return results;
};
