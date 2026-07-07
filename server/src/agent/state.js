/**
 * state.js
 * Defines the central State Schema for our LangGraph workflow.
 * Exposes the State Annotation configuration and initial state helpers.
 * Implements merge reducers to manage data updates, warnings, and fallback logs.
 */

const { Annotation } = require("@langchain/langgraph");

/**
 * Custom reducer to merge news articles.
 * Combines existing and incoming arrays, de-duplicating by article URL.
 * 
 * @param {Array<Object>} [left] - Existing news list in state.
 * @param {Array<Object>} [right] - Incoming news list to merge.
 * @returns {Array<Object>} De-duplicated combined list.
 */
function reduceNews(left, right) {
  const existing = left || [];
  const incoming = right || [];
  const combined = [...existing, ...incoming];
  
  const unique = [];
  const seenUrls = new Set();
  
  for (const item of combined) {
    if (item && item.url) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        unique.push(item);
      }
    } else if (item) {
      // Fallback for items missing a URL (e.g. mock items)
      unique.push(item);
    }
  }
  return unique;
}

/**
 * Custom reducer to merge warning and validation messages.
 * 
 * @param {Array<Object>} [left] - Existing warnings.
 * @param {Array<Object>} [right] - Incoming warnings.
 * @returns {Array<Object>} Consolidated warnings list.
 */
function reduceWarnings(left, right) {
  const existing = left || [];
  const incoming = right || [];
  return [...existing, ...incoming];
}

/**
 * Custom reducer to log fallback and provider attempts chronologically.
 * 
 * @param {Array<Object>} [left] - Existing logs.
 * @param {Array<Object>} [right] - Incoming logs.
 * @returns {Array<Object>} Combined chronological attempts log.
 */
function reduceFallbackHistory(left, right) {
  const existing = left || [];
  const incoming = right || [];
  return [...existing, ...incoming];
}

/**
 * Custom reducer to merge provider coverage metadata logs.
 * 
 * @param {Record<string, Object>} [left] - Existing coverage.
 * @param {Record<string, Object>} [right] - Incoming coverage changes to merge.
 * @returns {Record<string, Object>} Merged coverage lookup object.
 */
function reduceProviderCoverage(left, right) {
  return {
    ...(left || {}),
    ...(right || {})
  };
}

/**
 * Custom reducer to merge missing fields lists uniquely.
 * 
 * @param {string[]} [left]
 * @param {string[]} [right]
 * @returns {string[]} Combined unique missing fields.
 */
function reduceMissingFields(left, right) {
  const existing = left || [];
  const incoming = right || [];
  return [...new Set([...existing, ...incoming])];
}

/**
 * Custom reducer to append recovery log items.
 * 
 * @param {Object[]} [left]
 * @param {Object[]} [right]
 * @returns {Object[]} Combined chronological recovery history.
 */
function reduceRecoveryHistory(left, right) {
  const existing = left || [];
  const incoming = right || [];
  return [...existing, ...incoming];
}

/**
 * LangGraph state annotations defining channels, custom reducers, and defaults.
 */
const AgentStateAnnotation = Annotation.Root({
  // Inputs & Resolution
  inputCompanyName: Annotation(),
  resolvedTicker: Annotation(),
  resolvedName: Annotation(),
  market: Annotation(),

  // Core Evidence Fields
  profile: Annotation(),
  financials: Annotation(),
  news: Annotation({
    reducer: reduceNews,
    default: () => []
  }),
  marketContext: Annotation(),

  // Traceability & Validation Metadata
  providerCoverage: Annotation({
    reducer: reduceProviderCoverage,
    default: () => ({})
  }),
  fallbackHistory: Annotation({
    reducer: reduceFallbackHistory,
    default: () => []
  }),
  recoveryHistory: Annotation({
    reducer: reduceRecoveryHistory,
    default: () => []
  }),
  warnings: Annotation({
    reducer: reduceWarnings,
    default: () => []
  }),
  missingFields: Annotation({
    reducer: reduceMissingFields,
    default: () => []
  }),

  // State Management & Control Flow
  executionStage: Annotation(),
  qualityReport: Annotation(),
  evidenceCompleteness: Annotation(),
  recollectionAttempts: Annotation({
    reducer: (left, right) => (right !== undefined ? right : (left || 0)),
    default: () => 0
  }),

  // Analytical Outputs
  scores: Annotation(),
  recommendation: Annotation()
});

/**
 * Helper to generate a blank, default state object.
 * Useful for initializing HTTP request payloads or testing hooks.
 * 
 * @param {string} inputCompanyName - Raw company input query.
 * @returns {Object} Initialized state dictionary.
 */
const createInitialState = (inputCompanyName) => {
  return {
    inputCompanyName,
    resolvedTicker: '',
    resolvedName: '',
    market: 'Global',
    profile: null,
    financials: null,
    news: [],
    marketContext: null,
    providerCoverage: {},
    fallbackHistory: [],
    recoveryHistory: [],
    warnings: [],
    missingFields: [],
    executionStage: 'resolving company',
    qualityReport: null,
    evidenceCompleteness: 0,
    recollectionAttempts: 0,
    scores: null,
    recommendation: null
  };
};

module.exports = {
  AgentStateAnnotation,
  createInitialState,
  reduceNews,
  reduceWarnings,
  reduceFallbackHistory,
  reduceProviderCoverage,
  reduceMissingFields,
  reduceRecoveryHistory
};
