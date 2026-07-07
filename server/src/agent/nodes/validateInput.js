/**
 * validateInput.js
 * First node in our compiled workflow tracks.
 * Runs input validation before launching any external autocompletes.
 */

/**
 * Node function to validate raw user company query input.
 * 
 * @param {Object} state - The current LangGraph state.
 * @returns {Promise<Partial<import('../state').AgentState>>} Validation updates.
 */
async function validateInputNode(state) {
  const query = (state.inputCompanyName || '').trim();
  
  console.log(`[Graph Node]: Executing validateInputNode on query "${query}"`);

  const warnings = [];

  // Rule 1: Empty input check
  if (!query) {
    warnings.push({
      code: 'VALIDATION_EMPTY_INPUT',
      message: 'Search query is empty. Please enter a company name or ticker.',
      severity: 'high',
      category: 'validation'
    });
  }

  // Rule 2: Length checks
  else if (query.length < 2) {
    warnings.push({
      code: 'VALIDATION_INPUT_TOO_SHORT',
      message: `Query "${query}" is too short. Minimum query length is 2 characters.`,
      severity: 'high',
      category: 'validation'
    });
  }
  else if (query.length > 100) {
    warnings.push({
      code: 'VALIDATION_INPUT_TOO_LONG',
      message: 'Query exceeds maximum limit of 100 characters.',
      severity: 'high',
      category: 'validation'
    });
  }

  // Rule 3: Malformed characters check (only allow alphanumeric, spaces, and dots/dashes)
  else if (!/^[a-zA-Z0-9\s\.\-&]+$/.test(query)) {
    warnings.push({
      code: 'VALIDATION_INVALID_CHARACTERS',
      message: `Query "${query}" contains invalid symbols. Only alphanumeric, space, dot, and dash are permitted.`,
      severity: 'high',
      category: 'validation'
    });
  }

  if (warnings.length > 0) {
    console.log(`[Graph Node]: Input validation failed: ${warnings[0].message}`);
    
    // Halt graph progression immediately by failing the Quality Gate report
    return {
      warnings,
      executionStage: 'resolving company',
      qualityReport: {
        profile: 0,
        incomeStatement: 0,
        balanceSheet: 0,
        cashFlow: 0,
        news: 0,
        overall: 0,
        missingFields: ['inputQuery'],
        recollectionRequired: false // Cannot recollect invalid inputs
      }
    };
  }

  console.log(`[Graph Node]: Input validation passed.`);
  return {
    executionStage: 'resolving company'
  };
}

module.exports = validateInputNode;
