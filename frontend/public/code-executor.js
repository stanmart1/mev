// Web Worker for safe code execution
self.onmessage = function(e) {
  const { code, testCases } = e.data;
  
  try {
    // Execute code in isolated context with timeout
    const timeoutMs = 5000;
    const startTime = Date.now();
    
    // Extract function name
    const funcMatch = code.match(/function\s+(\w+)/);
    if (!funcMatch) {
      self.postMessage([{ passed: false, error: 'No function found in code' }]);
      return;
    }
    
    const funcName = funcMatch[1];
    
    // Create function in isolated scope
    const func = new Function(`
      ${code}
      return ${funcName};
    `)();
    
    // Run test cases
    const results = testCases.map((tc, index) => {
      try {
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          throw new Error('Execution timeout');
        }
        
        const result = func(...tc.input);
        const passed = JSON.stringify(result) === JSON.stringify(tc.expected);
        
        return {
          passed,
          input: tc.input,
          expected: tc.expected,
          actual: result,
          testIndex: index
        };
      } catch (error) {
        return {
          passed: false,
          error: error.message,
          testIndex: index
        };
      }
    });
    
    self.postMessage(results);
  } catch (error) {
    self.postMessage([{ passed: false, error: error.message }]);
  }
};
