# Project Architecture & Phase Documentation

This document outlines the detailed system engineering architecture, directory structures, execution flows, state schemas, and file responsibilities of **MarketPilot AI**.

---

## 1. System Directory Structure Blueprint

```text
MarketPilotAI/
├── docs/                      # Technical specification phases and documentations
│   ├── phase.md               # [THIS FILE] System engineering specifications
│   └── walkthrough.md         # Implementation verification log
├── client/                    # React (Vite) frontend application source code
│   ├── src/
│   │   ├── main.jsx           # App render mount point
│   │   ├── App.jsx            # State coordinator component
│   │   ├── index.css          # Styling tokens, print directives, and light mode classes
│   │   ├── components/        # Modular dashboard display panels
│   │   │   ├── Navbar.jsx     # Navigation, logo branding, and theme toggler
│   │   │   ├── PriceChart.jsx # Interactive price graph with period filtering (1W/1M/1Y)
│   │   │   ├── ValuationTab.jsx # Valuation Targets and scorecard metrics tables
│   │   │   ├── DataSourcesTab.jsx # Profile metrics and provider logs
│   │   │   ├── LlmPromptTraceTab.jsx # Investment thesis and prompt cascade traces
│   │   │   ├── Sidebar.jsx    # Latencies, recommendation checklist, and print triggers
│   │   │   └── Loader.jsx     # Rotating SVG console log loader
│   │   └── utils/
│   │       └── formatters.js  # Floating number, scale counts, and currency helpers
│   └── vite.config.js         # Port mapping configurations
└── server/                    # Node.js backend workspace
    ├── index.js               # Express REST API routing entry point
    ├── src/
    │   ├── agent/             # LangGraph state machine orchestrator core
    │   │   ├── graph.js       # StateGraph node linkages and routing edges
    │   │   ├── state.js       # AgentState properties and channel schema
    │   │   └── nodes/         # Single-responsibility graph execution nodes
    │   │       ├── validateInput.js         # Input validation constraints Node
    │   │       ├── resolveCompany.js        # Autocomplete & lookup Node
    │   │       ├── collectEvidence.js       # Concurrent API queries Node
    │   │       ├── evaluateQuality.js       # Validation gate scorecard Node
    │   │       ├── recollectMissing.js      # Targeted fallbacks recall Node
    │   │       ├── computeScores.js         # Deterministic calculations Node
    │   │       └── generateRecommendation.js# Qualitative LLM synthesis Node
    │   ├── config/            # Environment and financial policy setups
    │   │   ├── env.js         # API keys validations and defaults
    │   │   ├── valuationConfig.js  # Valuation horizons, CAPM Rf/MRP and sector PE targets
    │   │   └── errorHandler.js # Centralized route error and rate-limit handler
    │   ├── providers/         # Concrete API integration connectors
    │   │   ├── cache/         # Memory caching layer with TTL pruning
    │   │   │   └── memoryCache.js # In-memory TTL key pruner singleton
    │   │   ├── interfaces/    # Structured provider abstract base contracts
    │   │   └── implementations/ # Yahoo, Tavily, and CompanyResolver handlers
    │   │       ├── companyResolver.js       # Autocomplete query logic
    │   │       ├── yahooFinance.js          # QuoteSummary & TimeSeries scraper
    │   │       ├── secEdgar.js              # SEC XBRL facts scraper (US stocks)
    │   │       ├── stooq.js                 # Yahoo Chart price history downloader
    │   │       └── tavilySearch.js          # Tavily search & news connector
    │   │   ├── llmRouter.js         # Rotated key pool Groq/Gemini router
    │   │   └── providerRouter.js    # Ingestion coordinator & recovery cascade
    │   ├── scoring/           # Calculations and diagnostic scorers
    │   │   ├── evidenceAggregator.js # Normalization and confidence scoring
    │   │   ├── qualityGate.js  # Diagnostic quality gates scorecards
    │   │   └── valuationCalculator.js # DCF, multiples comps, and levered Beta math
    │   └── services/          # Abstracted providers orchestration service layer
    │       └── evidenceService.js   # Decoupled business logic API
    └── tests/                 # Isolated testing suites
```

---

## 2. Engineering Architecture Flowchart

This diagram illustrates the concrete runtime sequence, file scopes, data routes, and loop configurations:

```mermaid
graph TD
    %% Client Layer
    App[client/src/App.jsx] -->|1. Submit Search / runResearch| Index[server/index.js]
    
    %% API Gateway Layer
    Index -->|2. POST /api/research| GraphRun[server/src/agent/graph.js]
    Index -->|3. createInitialState| State[server/src/agent/state.js]
    
    %% Graph Lifecycle Start
    GraphRun -->|4. Start Graph Loop| NodeVal[validateInputNode <br> agent/nodes/validateInput.js]
    NodeVal -->|Sanity Checks Passed| NodeRes[resolveCompanyNode <br> agent/nodes/resolveCompany.js]
    
    %% Ticker Resolution
    NodeRes -->|Check Cache| CacheResolver[memoryCache.js]
    CacheResolver -->|Cache Miss| ResolveImpl[companyResolver.js]
    ResolveImpl -->|Acronym / Direct Match| CacheResolver
    ResolveImpl -->|LLM Autocorrect Fallback| LLMRouter[llmRouter.js]
    
    %% Evidence Collection
    NodeRes -->|Resolved Ticker| NodeColl[collectEvidenceNode <br> agent/nodes/collectEvidence.js]
    NodeColl -->|Concurrently Sweeps| EvServ[services/evidenceService.js]
    EvServ -->|Coordinate Ingestion| ProvRouter[providerRouter.js]
    
    %% Provider Routing & Cache Stamps
    ProvRouter -->|Check Inflight Promises| InFlight[inFlightBundles registry]
    ProvRouter -->|Primary Query| YahooProv[implementations/yahooFinance.js]
    ProvRouter -->|Fallback Statements| SecEDGAR[implementations/secEdgar.js]
    ProvRouter -->|News Scraping| TavilyProv[implementations/tavilySearch.js]
    
    %% Data Consistency & Normalization
    NodeColl -->|Normalize & Consolidate| EvAgg[scoring/evidenceAggregator.js]
    EvAgg -->|Calculate Confidence Score| NodeColl
    
    %% Quality Gate Audit Loop
    NodeColl -->|Check completeness| NodeQuality[evaluateQualityNode <br> agent/nodes/evaluateQuality.js]
    NodeQuality -->|Run Gate Scorecard| QualityGate[scoring/qualityGate.js]
    
    NodeQuality -->|Completeness < 80%?| RouteRecollect{Recollect Loop?}
    RouteRecollect -->|Yes & Attempts < 2| NodeRecollect[recollectMissingNode <br> agent/nodes/recollectMissing.js]
    NodeRecollect -->|Targeted Field Recollection| ProvRouter
    NodeRecollect -->|Increment Attempt count| NodeQuality
    RouteRecollect -->|No / Exhausted| NodeScore[computeScoresNode <br> agent/nodes/computeScores.js]
    
    %% Quantitative Modelling
    NodeScore -->|Deterministic Formulas| ValCalc[scoring/valuationCalculator.js]
    ValCalc -->|CAPM WACC Cost of Equity| ValCalc
    ValCalc -->|5Y DCF Present Value / TV perpetuity| ValCalc
    ValCalc -->|Comparable Multiples PE/PB| ValCalc
    ValCalc -->|Consensus Blender 60/40| ValCalc
    ValCalc -->|Compute Rating & MoS| ValCalc
    ValCalc -->|Scoring subscore weights| Config[config/valuationConfig.js]
    
    %% LLM Explainer Generation
    NodeScore --> NodeRec[generateRecommendationNode <br> agent/nodes/generateRecommendation.js]
    NodeRec -->|Inject Math Targets & Prompt Constraints| LLMRouter
    LLMRouter -->|Llama 3.3 70B / Gemini Rotation| NodeRec
    
    %% Output Formatter
    NodeRec --> End([End Graph State])
    End -->|Serialize Response JSON| Index
    Index -->|HTTP 200 JSON| App
    
    %% Client Render
    App -->|Navbar / PriceChart / ValuationTab / DataSourcesTab / LlmPromptTraceTab / Sidebar| App
    
    style App fill:#0f172a,stroke:#3b82f6,color:#fff
    style Index fill:#1e293b,stroke:#475569,color:#fff
    style GraphRun fill:#1e293b,stroke:#475569,color:#fff
    style NodeVal fill:#334155,stroke:#64748b,color:#fff
    style NodeRes fill:#334155,stroke:#64748b,color:#fff
    style NodeColl fill:#334155,stroke:#64748b,color:#fff
    style NodeQuality fill:#334155,stroke:#64748b,color:#fff
    style NodeRecollect fill:#334155,stroke:#64748b,color:#fff
    style NodeScore fill:#334155,stroke:#64748b,color:#fff
    style NodeRec fill:#334155,stroke:#64748b,color:#fff
    style RouteRecollect fill:#475569,stroke:#64748b,color:#fff
```

---

## 3. File Responsibilities

### Express Gateway & Main Orchestrator
*   [`server/index.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/index.js)
    *   **Purpose:** Backend Express REST API router entrypoint.
    *   **Responsibilities:**
        *   Exposes endpoints `/api/resolve` and `/api/research`.
        *   Manages middleware configurations (CORS, body parser, static paths).
        *   Initializes Graph state and handles E2E pipeline execution response payloads.
*   [`server/src/agent/graph.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/graph.js)
    *   **Purpose:** Configures and compiles the LangGraph StateGraph instance.
    *   **Responsibilities:**
        *   Registers all orchestrator nodes (`validateInputNode`, `resolveCompanyNode`, etc.).
        *   Defines linear execution links and conditional routing edges.
        *   Compiles the graph engine with state memory channels.

### LangGraph Lifecycle Nodes
*   [`server/src/agent/state.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/state.js)
    *   **Purpose:** Establishes the centralized state schema for graph nodes.
    *   **Responsibilities:**
        *   Defines `AgentStateAnnotation` channels.
        *   Implements array-merging reducers for warnings, news, and history.
        *   Houses initial state generator helper `createInitialState`.
*   [`server/src/agent/nodes/validateInput.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/validateInput.js)
    *   **Purpose:** Validates the user's initial search query.
    *   **Responsibilities:**
        *   Asserts query length limits and blocks SQL/Script injections.
        *   Sets default execution flags and pushes validation warnings to state.
*   [`server/src/agent/nodes/resolveCompany.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/resolveCompany.js)
    *   **Purpose:** Resolves company query to a canonical ticker symbol.
    *   **Responsibilities:**
        *   Coordinates in-memory cache checks and invokes the symbol resolver.
        *   Filters resolution matches through Levenshtein and acronym similarity gates.
*   [`server/src/agent/nodes/collectEvidence.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/collectEvidence.js)
    *   **Purpose:** Concurrently sweeps structured data and news resources.
    *   **Responsibilities:**
        *   Fires parallel requests to Yahoo Finance, Tavily Search, and SEC EDGAR.
        *   Classifies scraped news sentiment and materiality metrics using the LLM.
        *   Invokes the evidence aggregator to normalize raw provider schemas.
*   [`server/src/agent/nodes/evaluateQuality.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/evaluateQuality.js)
    *   **Purpose:** Runs quality checks on the collected database state.
    *   **Responsibilities:**
        *   Invokes the quality gate scorecard to grade profile and filings variables.
        *   Decides if the pipeline needs targeted recollection loops.
*   [`server/src/agent/nodes/recollectMissing.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/recollectMissing.js)
    *   **Purpose:** Coordinates target recovery cascades for missing fields.
    *   **Responsibilities:**
        *   Checks the missing fields list and hits fallback provider routers.
        *   Appends recovery provenance records and increments the execution loop counter.
*   [`server/src/agent/nodes/computeScores.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/computeScores.js)
    *   **Purpose:** Computes fundamental subscores and solves the valuation engines.
    *   **Responsibilities:**
        *   Solves solvency, profitability, and momentum subscore indices.
        *   Invokes the JavaScript `valuationCalculator` to resolve intrinsic prices.
        *   Integrates dynamic safety overrides and maps final scores to Buy/Hold/Sell ratings.
*   [`server/src/agent/nodes/generateRecommendation.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/generateRecommendation.js)
    *   **Purpose:** Generates explainable text summaries explaining calculations.
    *   **Responsibilities:**
        *   Formulates LLM qualitative synthesis prompts under strict math constraints.
        *   Guarantees prompt consistency, forcing ratings and target prices to match JS outputs.

### Provider Integration & Routing Layer
*   [`server/src/providers/cache/memoryCache.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/cache/memoryCache.js)
    *   **Purpose:** Provides a process-wide singleton RAM caching layer.
    *   **Responsibilities:**
        *   Maintains key-value records with automated TTL expiry checks.
        *   Runs background GC sweeps every 5 minutes to prevent RAM bloat.
*   [`server/src/providers/implementations/companyResolver.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/implementations/companyResolver.js)
    *   **Purpose:** Executes fuzzy search lookups to identify verified tickers.
    *   **Responsibilities:**
        *   Queries autocomplete endpoints and falls back to LLM suggestions under rate limits.
*   [`server/src/providers/implementations/yahooFinance.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/implementations/yahooFinance.js)
    *   **Purpose:** Scrapes core financial modules and time-series reports.
    *   **Responsibilities:**
        *   Retrieves QuoteSummary modules (price, detail, cash flow, statements).
        *   Falls back to `fundamentalsTimeSeries` arrays for historical figures.
*   [`server/src/providers/implementations/secEdgar.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/implementations/secEdgar.js)
    *   **Purpose:** Extracts XBRL financial facts for US equities.
    *   **Responsibilities:**
        *   Retrieves SEC CIK mapping and downloads balance sheet / cash flow filings.
*   [`server/src/providers/implementations/stooq.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/implementations/stooq.js)
    *   **Purpose:** Downloader for historical daily price quotes.
    *   **Responsibilities:**
        *   Retrieves the last 1 year of daily closes from Yahoo Finance Chart API.
*   [`server/src/providers/implementations/tavilySearch.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/implementations/tavilySearch.js)
    *   **Purpose:** Connector wrapping the Tavily Search API.
    *   **Responsibilities:**
        *   Queries recent news articles, dates, and URL citations.
        *   Scrapes unstructured text fallback profiles under missing-field conditions.
*   [`server/src/providers/providerRouter.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/providerRouter.js)
    *   **Purpose:** Ingestion coordinator managing field-level recovery cascades.
    *   **Responsibilities:**
        *   Implements cache stampede de-duplication via `inFlightBundles` registry.
        *   Cascades lookups down provider hierarchy to patch missing metrics.
*   [`server/src/providers/llmRouter.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/llmRouter.js)
    *   **Purpose:** Manages rotated key API pools for Groq and Gemini.
    *   **Responsibilities:**
        *   Balances requests across active keys and fails over to Gemini.
        *   Retries only network timeouts and rate limit errors (HTTP 429).
*   [`server/src/services/evidenceService.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/services/evidenceService.js)
    *   **Purpose:** Decouples graph nodes from raw provider configurations.
    *   **Responsibilities:**
        *   Exposes clean getProfile/getFinancials API wrappers.

### Scoring & Mathematical Valuations
*   [`server/src/scoring/evidenceAggregator.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/scoring/evidenceAggregator.js)
    *   **Purpose:** Normalizes collected provider outputs.
    *   **Responsibilities:**
        *   Computes the deterministic confidence score.
        *   Generates the confidence explanation checklist.
*   [`server/src/scoring/qualityGate.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/scoring/qualityGate.js)
    *   **Purpose:** Evaluates completeness scorecards across categories.
    *   **Responsibilities:**
        *   Grades profile, statement, and news data completeness.
*   [`server/src/scoring/valuationCalculator.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/scoring/valuationCalculator.js)
    *   **Purpose:** Core quantitative valuation modeling script.
    *   **Responsibilities:**
        *   Calculates CAPM Cost of Equity WACC and dynamic FCF growth rates.
        *   Solves 5-Year DCF schedules and Terminal Values.
        *   Solves sector relative PE/PB multiple targets.
        *   Blends models into consensus target prices.
*   [`server/src/config/valuationConfig.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/config/valuationConfig.js)
    *   **Purpose:** Centralizes macroeconomic assumptions and sector multiple targets.
    *   **Responsibilities:**
        *   Declares cost of equity constants, terminal growths, and model weights.

---

## 4. LangGraph Agent State Documentation

| Channel Field Name | Initialized In | Updated In | Consumed In | Purpose / Description |
| :--- | :--- | :--- | :--- | :--- |
| **`inputCompanyName`** | `state.js` | *Never* | `resolveCompany.js` | Raw user company search query string. |
| **`resolvedTicker`** | `state.js` | `resolveCompany.js` | `collectEvidence.js` <br> `computeScores.js` | Canonical ticker symbol utilized throughout ingestion & calculations. |
| **`resolvedName`** | `state.js` | `resolveCompany.js` | `collectEvidence.js` | Official corporate identity name. |
| **`market`** | `state.js` | `resolveCompany.js` | `collectEvidence.js` | Target exchange/market registry (e.g. US, IN, Global). |
| **`resolutionConfidence`** | `state.js` | `resolveCompany.js` | *UI* | Similarity match percentage of resolved ticker symbol. |
| **`profile`** | `state.js` | `collectEvidence.js` <br> `recollectMissing.js` | `computeScores.js` <br> *UI* | Corporate metadata snapshot (CEO, sector, employees). |
| **`financials`** | `state.js` | `collectEvidence.js` <br> `recollectMissing.js` | `computeScores.js` <br> *UI* | Structured income statement, balance sheet, cash flows. |
| **`news`** | `state.js` | `collectEvidence.js` | `computeScores.js` <br> `generateRecommendation.js` | Scraped news article details and classified sentiments. |
| **`marketContext`** | `state.js` | `collectEvidence.js` | `computeScores.js` <br> *UI* | Historical daily closing stock price quote array. |
| **`providerCoverage`** | `state.js` | `collectEvidence.js` <br> `recollectMissing.js` | `evidenceAggregator.js` <br> *UI* | Provenance metadata log indicating provider sources. |
| **`fallbackHistory`** | `state.js` | `collectEvidence.js` <br> `recollectMissing.js` | *UI* | Audit list of failed attempts and warning codes. |
| **`recoveryHistory`** | `state.js` | `collectEvidence.js` <br> `recollectMissing.js` | `evidenceAggregator.js` <br> *UI* | Provenance records tracking field-level recollection loops. |
| **`warnings`** | `state.js` | `validateInput.js` <br> `collectEvidence.js` | *UI* | Execution warning codes and message objects. |
| **`missingFields`** | `state.js` | `evaluateQuality.js` | `recollectMissing.js` | Set of fields currently flagged as missing or null. |
| **`executionStage`** | `state.js` | *Every Node* | *UI* | Human-friendly pipeline progress tag. |
| **`qualityReport`** | `state.js` | `evaluateQuality.js` | *UI* | Complete completeness scores across categories. |
| **`evidenceCompleteness`** | `state.js` | `evaluateQuality.js` | `graph.js` (Route Edge) | Aggregated quality score driving loop decisions. |
| **`recollectionAttempts`** | `state.js` | `recollectMissing.js` | `graph.js` (Route Edge) | Ingestion loop retry counter (capped at 2). |
| **`scores`** | `state.js` | `computeScores.js` | `generateRecommendation.js` <br> *UI* | Profitability, Solvency, and Momentum scorecard indices. |
| **`valuation`** | `state.js` | `computeScores.js` | `generateRecommendation.js` <br> *UI* | CAPM constants, DCF arrays, comps target valuations. |
| **`recommendation`** | `state.js` | `generateRecommendation.js` | *UI* | Final recommendation rating, thesis, and risks. |

---

## 5. Technology Stack
*   **Frontend:** React, Vite, SVG Charts, CSS (Dynamic Light / Dark Mode Toggle)
*   **Backend:** Node.js, Express
*   **AI Orchestration:** LangGraph.js, LangChain.js, Google Gemini, Groq (Llama-3.3-70B)
*   **Financial Data:** Yahoo Finance (`yahoo-finance2`), SEC EDGAR
*   **News:** Tavily Search API
*   **Caching:** In-memory Singleton Cache
*   **Validation:** Similarity Gate, Levenshtein Distance
*   **Documentation:** Mermaid diagrams
