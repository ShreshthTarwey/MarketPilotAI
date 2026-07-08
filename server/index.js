/**
 * index.js
 * Primary entry point for the MarketPilot AI REST API server.
 * Initializes Express middleware, registers research endpoints, and runs the LangGraph orchestrator.
 */

const express = require('express');
const cors = require('cors');
const env = require('./src/config/env');
const graph = require('./src/agent/graph');
const { createInitialState } = require('./src/agent/state');
const CompanyResolver = require('./src/providers/implementations/companyResolver');
const { handle404, globalErrorHandler } = require('./src/config/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend dashboard connection
app.use(cors());
// Parse incoming JSON payloads
app.use(express.json());

/**
 * Health check endpoint.
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Cache Clearing Endpoint.
 */
app.post('/api/cache/clear', (req, res) => {
  const cache = require('./src/providers/cache/memoryCache');
  cache.clear();
  res.json({ success: true, message: 'Memory cache cleared completely.' });
});

/**
 * Company Resolution Endpoint.
 * Resolves a company search query to a normalized stock ticker before triggering research.
 */
app.get('/api/resolve', async (req, res, next) => {
  const query = req.query.company || req.query.query;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      error: 'Invalid Request',
      message: 'Query parameter "company" or "query" is required.'
    });
  }

  try {
    const resolver = new CompanyResolver();
    const result = await resolver.resolve(query.trim());
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Core Research API Endpoint.
 * Executes the LangGraph state machine orchestration.
 * Supports both GET queries and POST body payloads.
 */
app.all('/api/research', async (req, res, next) => {
  // Extract company name from query params or POST body
  const companyQuery = req.query.company || req.body.company;

  if (!companyQuery || typeof companyQuery !== 'string' || !companyQuery.trim()) {
    return res.status(400).json({
      error: 'Invalid Request',
      message: 'Query parameter "company" is required.'
    });
  }

  const normalizedQuery = companyQuery.trim();
  console.log(`\n[API]: Received research request for "${normalizedQuery}"`);

  try {
    // 1. Initialize LangGraph State
    const initialState = createInitialState(normalizedQuery);
    
    // 2. Invoke E2E StateGraph Orchestrator
    const finalState = await graph.invoke(initialState);

    // 3. Inspect quality gates to check if input validation failed
    const hasValidationFailures = finalState.warnings?.some(w => w.category === 'validation' && w.severity === 'high');
    if (hasValidationFailures) {
      const errorMsg = finalState.warnings.find(w => w.category === 'validation')?.message || 'Input validation failed.';
      return res.status(422).json({
        error: 'Validation Failed',
        message: errorMsg,
        warnings: finalState.warnings
      });
    }

    // 4. Return Normalized Structured State
    return res.json({
      success: true,
      data: {
        resolvedIdentity: {
          ticker: finalState.resolvedTicker,
          name: finalState.resolvedName,
          market: finalState.market,
          resolutionConfidence: finalState.resolutionConfidence
        },
        profile: finalState.profile,
        financials: finalState.financials,
        news: finalState.news,
        marketContext: finalState.marketContext,
        scores: finalState.scores,
        valuation: finalState.valuation,
        qualityReport: finalState.qualityReport,
        evidenceCompleteness: finalState.evidenceCompleteness,
        recollectionAttempts: finalState.recollectionAttempts,
        warnings: finalState.warnings,
        providerCoverage: finalState.providerCoverage,
        recoveryHistory: finalState.recoveryHistory,
        recommendation: finalState.recommendation
      }
    });

  } catch (error) {
    next(error);
  }
});

// Register Error and 404 Handler Middlewares
app.use(handle404);
app.use(globalErrorHandler);

// Run server listener
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`MarketPilot AI API Server active on http://localhost:${PORT}`);
  console.log(`Research API endpoint: http://localhost:${PORT}/api/research`);
  console.log(`==================================================`);
});
