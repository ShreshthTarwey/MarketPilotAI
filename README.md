# MarketPilot AI — AI Investment Research Agent

MarketPilot AI is a production-oriented AI Investment Research Agent designed to autonomously research global equities (US, Indian, and Global), compute deterministic health/growth metrics, validate evidence quality, and generate human-in-the-loop explainable investment recommendations ("Buy", "Hold", or "Sell").

**Live Deployments:**
*   **Frontend Client (Vercel):** **[market-pilot-ai-ten.vercel.app](https://market-pilot-ai-ten.vercel.app)**
*   **Backend REST API (Render):** **[marketpilotai.onrender.com](https://marketpilotai.onrender.com)**

---

## Technical Stack
*   **Frontend:** React, Vite, SVG Charts, CSS (Dynamic Light / Dark Mode Toggle)
*   **Backend:** Node.js, Express
*   **AI Orchestration:** LangGraph.js, LangChain.js, Google Gemini, Groq (Llama-3.3-70B)
*   **Financial Data:** Yahoo Finance (`yahoo-finance2`), SEC EDGAR
*   **News:** Tavily Search API
*   **Caching:** In-memory Singleton Cache
*   **Validation:** Similarity Gate, Levenshtein Distance
*   **Documentation:** Mermaid diagrams

---

## How to run it — setup and run steps (plus any keys / env needed)

Follow these steps to configure your credentials and run the application locally on Windows or macOS:

### 1. Configure Environment Variables
*   **Backend Credentials:** Create a `.env` file in the root directory and add your API keys:
    ```env
    PORT=5000
    GEMINI_API_KEY=your_gemini_key
    TAVILY_API_KEY=your_tavily_key
    GROQ_API_KEY_1=your_groq_key_1
    GROQ_API_KEY_2=your_groq_key_2 (optional)
    GROQ_API_KEY_3=your_groq_key_3 (optional)
    GROQ_API_KEY_4=your_groq_key_4 (optional)
    ```
*   **Frontend Endpoints:** Create a `.env` file in the `client/` directory to target your backend (defaults to local host if omitted):
    ```env
    VITE_API_URL=http://localhost:5000
    ```

### 2. Setup & Start the Backend API Server
*   Navigate to the server directory and install required dependencies:
    ```bash
    cd server
    npm install
    ```
*   Run the development server in watch mode (listens on port `5000`):
    ```bash
    npm run dev
    ```

### 3. Setup & Start the Frontend Client
*   Navigate to the client directory and install required package dependencies:
    ```bash
    cd client
    npm install
    ```
*   Run the Vite frontend bundler server (defaults to `http://localhost:5173`):
    ```bash
    npm run dev
    ```

---

## Testing Strategy

To guarantee the reliability of individual data retrievers prior to graph orchestration, we maintain an isolated testing suite. These scripts run keylessly for Yahoo and check `.env` API keys for Tavily/LLM:

*   **Run Yahoo Provider Test:**
    ```bash
    node tests/testYahooProvider.js [TICKER]
    ```
*   **Run Company Resolver Test:**
    ```bash
    node tests/testCompanyResolver.js [COMPANY_NAME]
    ```
*   **Run Tavily Search/News Test:**
    ```bash
    node tests/testTavilyProvider.js [COMPANY_NAME]
    ```
*   **Run Master Provider Router Test:**
    ```bash
    node tests/testProviderRouter.js [COMPANY_NAME]
    ```

---

## How It Works — End-to-End Architecture

### Part 1: System Workflow Diagram

```mermaid
flowchart TD
    User([User]) -->|1. Searches Company| UI[React Frontend]
    UI -->|2. HTTP Request| API[Express API Gateway]
    API -->|3. Initialize State| Orchestrator[LangGraph Orchestrator]
    
    Orchestrator -->|4. Input Validation| ValNode[Validation Node]
    ValNode -->|5. Symbol Resolution| ResNode[Company Resolution Node]
    
    ResNode -->|Similarity Gate & Cache Check| Cache{Cache Hit?}
    Cache -->|No| Resolvers[Company Resolvers & LLM Correction]
    Cache -->|Yes| RouterNode
    
    ResNode -->|6. Fetch Assets| RouterNode[Provider Router]
    RouterNode -->|Primary Source| YF[Yahoo Finance API]
    RouterNode -->|US Filings Fallback| SEC[SEC EDGAR Fact Scraper]
    RouterNode -->|News & Web Fallback| Tavily[Tavily Search API]
    RouterNode -->|Unstructured Scrape Parser| LLMExtract[LLM Extraction Fallback]
    
    YF & SEC & Tavily & LLMExtract -->|7. Consolidate Data| Aggregator[Evidence Aggregator]
    Aggregator -->|8. Score Completeness| QualityGate[Evidence Quality Gate]
    
    QualityGate -->|Completeness < 80%?| Recollect{Recollect Loop?}
    Recollect -->|Yes & Attempts < 2| RecNode[Recollect Missing Node]
    RecNode --> RouterNode
    
    QualityGate -->|Yes / Exhausted| ValEngine[Deterministic Valuation Engine]
    
    ValEngine -->|9. Computes CAPM WACC / 5Y DCF / Multiples| RecEngine[Multi-Factor Recommendation Engine]
    RecEngine -->|10. Programmatic Buy-Hold-Sell Rating| LLMSynth[LLM Qualitative Synthesis]
    
    LLMSynth -->|11. Formats Structured Output| API
    API -->|12. JSON Report Payload| UI
    UI -->|Render Dashboard| Dashboard[Interactive Dashboard]
    
    style User fill:#0f172a,stroke:#3b82f6,color:#fff
    style UI fill:#1e293b,stroke:#475569,color:#fff
    style API fill:#1e293b,stroke:#475569,color:#fff
    style Orchestrator fill:#1e293b,stroke:#475569,color:#fff
    style Cache fill:#334155,stroke:#64748b,color:#fff
    style QualityGate fill:#334155,stroke:#64748b,color:#fff
    style YF fill:#0f172a,stroke:#3b82f6,color:#fff
    style SEC fill:#0f172a,stroke:#3b82f6,color:#fff
    style Tavily fill:#0f172a,stroke:#3b82f6,color:#fff
    style LLMExtract fill:#0f172a,stroke:#3b82f6,color:#fff
    style Dashboard fill:#1e293b,stroke:#475569,color:#fff
```

### Part 2: Pipeline Overview

> [!IMPORTANT]
> **Separation of Concerns:** All quantitative and numerical reasoning calculations (valuations, ratios, scores, and ratings) are executed deterministically in pure JavaScript. Large Language Models (LLMs) are **not** used to calculate numbers or make investment decisions. The LLM acts strictly as a qualitative explainer, responsible for news sentiment classification, summarizing risk factors, and generating natural language thesis descriptions.

1.  **User Search Ingestion:** The user enters a company name or stock ticker into the search bar of the React Frontend, triggering a request to the Express API Gateway.
2.  **Graph State Initialization:** The backend invokes the LangGraph orchestrator, initializing a centralized, stateful Agent State to hold collected records, quality metrics, and calculation logs.
3.  **Fuzzy Company Resolution:** The input is validated, and the Resolution node maps fuzzy search strings to canonical ticker symbols. It validates candidate matches using a Levenshtein-based similarity gate.
4.  **In-Memory Cache Interception:** The resolution node checks the in-memory singleton cache. If a cache hit is found, the system loads the company details instantly (<50ms) and bypasses network fetches.
5.  **Multi-Provider Ingestion:** The Provider Router initiates parallel scrapes to fetch core company profiles, financial statements, news items, and historical price market data from Yahoo Finance.
6.  **Resilient Provider Fallbacks:** If primary endpoints are rate-limited or return empty objects, the router automatically cascades down secondary channels (SEC EDGAR for filings, Tavily Search for web scrapes, and LLM text extraction).
7.  **Evidence Aggregation & Normalization:** The aggregator normalizes mismatched shapes, logs provider provenance metadata, and programmatically computes a deterministic Overall Confidence Score.
8.  **Evidence Quality Gate Audit:** The Quality Gate evaluates data completeness. If any statement or news category drops below an 80% completeness threshold, the orchestrator triggers a targeted recollection loop.
9.  **Deterministic Valuations:** The valuation engine computes the stock's CAPM Cost of Equity, projects a 5-Year FCF Discounted Cash Flow (DCF), estimates relative multiples (P/E, P/B), and blends them into an intrinsic consensus value and Margin of Safety.
10. **Multi-Factor Score Carding:** The scoring engine computes solvency, profitability, and momentum subscores based on key financial ratios. Balance sheet distress dynamically triggers safety penalties.
11. **Qualitative LLM Synthesis:** Shuffled API key pools query Groq/Gemini to translate the calculated targets and news sentiment classifications into a cohesive investment thesis and risk summary.
12. **Frontend Dashboard Rendering:** The final structured JSON is serialized and returned to the React Client. The dashboard renders dynamic circular SVG dials, tabular metrics, interactive charts, and print-ready layouts.

---

## Core Engineering Principles
1.  **Deterministic Decision Core:** Financial ratios, safety margins, historical growth rates, scoring card matrices, and execution fallbacks are programmatically calculated in Javascript code. The LLM does not calculate numbers, guess values, or invent scores.
2.  **Explainability & Citation Trace:** Every single data point collected retains a provenance trail—storing the provider name, extraction level, timestamps, and reference source URL—which is exposed directly to the frontend for human audit.
3.  **Graceful Degradation:** Rather than failing on single API dropouts, the system utilizes a multi-tiered provider routing hierarchy (Primary API → Secondary API → Web Search Scrape → LLM Parsing) to gather partial profiles and warn the user instead of throwing exceptions.
4.  **Evidence Validation Gate:** An inspection node evaluates evidence quality before passing variables to the synthesis engine. If data is incomplete, it triggers targeted recollect-actions rather than starting from scratch.

---

## Key Decisions & Trade-offs

### Decoupled Resilient LLM Routing
Rather than hardcoding a single API key or coupling the graph to a single LLM sdk endpoint, we created a specialized LLM Service Router ([llmRouter.js](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/llmRouter.js)) wrapping our calls.
*   **Provider Pooling:** Distributes queries between Groq (Llama-3.3-70b-versatile) and Gemini (Gemini-1.5-flash).
*   **Per-Request Key Rotation:** Shuffles a cloned array of Groq keys (`GROQ_API_KEY_1`, `GROQ_API_KEY_2`, etc.) on *every incoming request* to guarantee balanced load distribution.
*   **Smart Retry Strategy:** Evaluates errors and retries *only* retryable exceptions (HTTP 429 rate limits, HTTP 503 drops, connection drops, and network timeouts). For authentication errors (HTTP 401/403) or malformed payload errors (HTTP 400), it fails immediately to prevent unnecessary API overhead.
*   **Provider Failover & Graceful Degradation:** Falls back to Gemini if all Groq pool keys are exhausted. If Gemini fails too, it wraps exceptions in a standard structured JSON error, preventing server crashes.
*   **Provider Metadata Audit:** Returns execution logs (provider name, model, request latency, key identifier, success flag) wrapped alongside payload content (`text` or `data`), supporting state traces.
*   **Separation of Concerns:** LangGraph nodes remain completely generic, communicating only through the abstract `generateJSON()` call.

### Field-Level Recovery vs. Provider Failover
Rather than dropping an entire dataset and triggering a full fallback fetch when a single metric is missing, our router utilizes **Field-Level Recovery**.
*   **Targeted Resolution:** The router evaluates which specific metrics (e.g. `operatingIncome`) are missing or null.
*   **Patching Cascade:** It targets *only* the missing keys by checking:
    $$\text{Primary (QuoteSummary)} \longrightarrow \text{Secondary (fundamentalsTimeSeries)} \longrightarrow \text{Tertiary (SEC EDGAR)} \longrightarrow \text{Search (Tavily Scrape)} \longrightarrow \text{LLM Extraction}$$
*   **Integrity:** Preserves the core numbers provided by high-SLA primary sources, avoiding discrepancies caused by merging full sheets from conflicting APIs.

### Category-Wise Quality Gate Validation
We discard generic boolean checks for a multi-category scorecard logic.
*   **Diagnostic Nodes:** The gate evaluates **Profile, Income Statement, Balance Sheet, Cash Flow, and News** independently.
*   **Recollection Loops:** If any category drops below its configured completeness threshold (e.g. 80%), only the missing fields in that category are routed to fallback collection.
*   **Immutability:** Previously verified data is locked in state to prevent infinite loops and limit API token usage.

### In-Flight Promise Caching (Cache Stampede Protection)
When collecting profile and financials in parallel, they trigger concurrently. To prevent duplicate HTTP requests to Yahoo Finance QuoteSummary, the provider layer caches the active **Promise** in a registry. The concurrent call awaits and reuses the same request promise.

### Evidence Aggregator Layer
An intermediate layer that normalizes multi-provider shapes, removes duplicates, consolidates metadata into `providerCoverage`, and calculates a **deterministic confidence score** entirely in JavaScript before passing it to the reasoning node.

### Deterministic Confidence Scoring
Calculated in JavaScript (not the LLM) based on evidence completeness, fallback levels triggered, missing critical variables, and provider weights.

---

## Planned Development Phases

| Phase | Title | Focus Areas | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Foundation Layer** | Env validation, graph state schema, provider contracts, and interface files. | **Complete** |
| **Phase 2** | **Data & Provider Layer** | Caching, concrete Yahoo/Tavily integrations, and fallback router logic. | **Complete** |
| **Phase 3** | **LangGraph Orchestration**| Building execution nodes, quality evaluation logic, and Graph state machine. | **Complete** |
| **Phase 4** | **Deterministic Valuations**| JavaScript valuation calculator, CAPM Cost of Equity, levered Beta, and DCF. | **Complete** |
| **Phase 5** | **LLM Synthesis & REST API**| Express JSON endpoint router, autocomplete resolves, and prompt constraints. | **Complete** |
| **Phase 6** | **React Frontend Dashboard** | Interactive interface, progress trackers, scores visuals, and citation cards. | **Complete** |
| **Phase 7** | **Testing, Polish & Verification** | End-to-end integration tests, edge-case resolution, and system audit checks. | **Complete** |
| **Phase 8** | **Institutional UI/UX Refinements**| Transforming layout with snapshot, key ratios, tables, checklist, and summaries. | **Complete** |
