/**
 * evaluateQuality.js
 * Graph node responsible for running the diagnostic validation scorecard check.
 * Evaluates completeness across all evidence categories.
 */

const { evaluateQualityGate } = require('../../scoring/qualityGate');

/**
 * Node function to evaluate gathered data completeness.
 * 
 * @param {Object} state - The current LangGraph state.
 * @returns {Promise<Partial<import('../state').AgentState>>} Scoring gate result.
 */
async function evaluateQualityNode(state) {
  console.log(`[Graph Node]: Executing evaluateQualityNode`);

  // Run the pure scoring diagnostic helper
  const report = evaluateQualityGate(state);
  
  console.log(`[Graph Node]: Quality Diagnostic Check Complete. Overall Completeness: ${report.overall}%`);
  console.log(`[Graph Node]: Missing Fields Count: ${report.missingFields?.length || 0}`);
  
  // Format warnings for missing fields to keep state trace transparent
  const warnings = (report.missingFields || []).map(field => ({
    code: 'MISSING_FIELD',
    message: `Required financial or profile element "${field}" is null or empty.`,
    severity: 'low',
    category: 'data_completeness',
    timestamp: new Date().toISOString()
  }));

  return {
    qualityReport: report,
    missingFields: report.missingFields,
    warnings,
    executionStage: report.recollectionRequired ? 'recollecting missing evidence' : 'computing scores'
  };
}

module.exports = evaluateQualityNode;
