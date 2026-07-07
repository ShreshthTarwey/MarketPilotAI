/**
 * graph.js
 * Compiles the LangGraph StateGraph state machine.
 * Defines workflow execution nodes, standard edges, feedback loops, and conditional gates.
 */

const { StateGraph, START, END } = require("@langchain/langgraph");
const { AgentStateAnnotation } = require("./state");

// Import node executors
const validateInputNode = require("./nodes/validateInput");
const resolveCompanyNode = require("./nodes/resolveCompany");
const collectEvidenceNode = require("./nodes/collectEvidence");
const evaluateQualityNode = require("./nodes/evaluateQuality");
const recollectMissingNode = require("./nodes/recollectMissing");
const computeScoresNode = require("./nodes/computeScores");
const generateRecommendationNode = require("./nodes/generateRecommendation");

/**
 * Conditional router function to evaluate evidence completeness.
 * Decides whether to route to targeted recollection or move to scoring.
 * 
 * @param {Object} state - Current Graph state.
 * @returns {"recollect" | "score"} Decision key.
 */
function shouldContinue(state) {
  const report = state.qualityReport || {};
  const attempts = state.recollectionAttempts || 0;

  console.log(`[Graph Router]: Evaluating route. Attempts: ${attempts}, Recollection Required: ${report.recollectionRequired}`);

  // Max out at 2 recollection passes to prevent infinite API polling loops
  if (report.recollectionRequired && attempts < 2) {
    console.log(`[Graph Router]: Routing to targeted recollection node.`);
    return "recollect";
  }

  console.log(`[Graph Router]: Scoring criteria met or max loop limit reached. Routing to scorecard calculator.`);
  return "score";
}

// 1. Initialize State Graph with schema configuration annotation
const workflow = new StateGraph(AgentStateAnnotation)
  // 2. Add Node instances
  .addNode("validateInput", validateInputNode)
  .addNode("resolveCompany", resolveCompanyNode)
  .addNode("collectEvidence", collectEvidenceNode)
  .addNode("evaluateQuality", evaluateQualityNode)
  .addNode("recollectMissing", recollectMissingNode)
  .addNode("computeScores", computeScoresNode)
  .addNode("generateRecommendation", generateRecommendationNode)

  // 3. Define Entry Edge
  .addEdge(START, "validateInput")

  // 4. Define Linear Progressions
  .addEdge("validateInput", "resolveCompany")
  .addEdge("resolveCompany", "collectEvidence")
  .addEdge("collectEvidence", "evaluateQuality")

  // 5. Define Conditional Quality Gate Edge
  .addConditionalEdges(
    "evaluateQuality",
    shouldContinue,
    {
      recollect: "recollectMissing",
      score: "computeScores"
    }
  )

  // 6. Define Feedback Edge (loops back to validation after recollection)
  .addEdge("recollectMissing", "evaluateQuality")

  // 7. Define Analytical & Output Edges
  .addEdge("computeScores", "generateRecommendation")
  .addEdge("generateRecommendation", END);

// 8. Compile the state machine graph
const graph = workflow.compile();

console.log("[Graph]: LangGraph orchestrator successfully compiled.");

module.exports = graph;
