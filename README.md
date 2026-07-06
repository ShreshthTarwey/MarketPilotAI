# MarketPilot AI — AI Investment Research Agent

MarketPilot AI is a production-oriented AI Investment Research Agent designed to autonomously research global equities (US, Indian, and Global), compute deterministic health/growth metrics, validate evidence quality, and generate human-in-the-loop explainable investment recommendations ("Invest" or "Pass").

---

## Technical Stack
*   **Frontend:** React (Vite) + Vanilla CSS (Dynamic Glassmorphic Design)
*   **Backend:** Node.js + Express
*   **Workflow Engine:** LangGraph.js (State-driven workflow orchestrator)
*   **LLM Provider:** Gemini (Google Gen AI)
*   **Data Channels:** `yahoo-finance2` (Primary Financials/Metadata) + Tavily Search API (Fallback Scraping & News)

---

## Core Engineering Principles
1.  **Deterministic Decision Core:** Financial ratios, safety margins, historical growth rates, scoring card matrices, and execution fallbacks are programmatically calculated in Javascript code. The LLM does not calculate numbers, guess values, or invent scores.
2.  **Explainability & Citation Trace:** Every single data point collected retains a provenance trail—storing the provider name, extraction level, timestamps, and reference source URL—which is exposed directly to the frontend for human audit.
3.  **Graceful Degradation:** Rather than failing on single API dropouts, the system utilizes a multi-tiered provider routing hierarchy (Primary API → Secondary API → Web Search Scrape → LLM Parsing) to gather partial profiles and warn the user instead of throwing exceptions.
4.  **Evidence Validation Gate:** An inspection node evaluates evidence quality before passing variables to the synthesis engine. If data is incomplete, it triggers targeted recollect-actions rather than starting from scratch.

---

## Planned Development Phases

| Phase | Title | Focus Areas | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Foundation Layer** | Env validation, graph state schema, provider contracts, and interface files. | **Complete** |
| **Phase 2** | **Data & Provider Layer** | Caching, concrete Yahoo/Tavily integrations, and fallback router logic. | **In Progress (Refining)** |
| **Phase 3** | **LangGraph Orchestration**| Building execution nodes, quality evaluation logic, and Graph state machine. | *Upcoming* |
| **Phase 4** | **Deterministic Scoring** | JavaScript scorecard calculator, confidence weights, and financial formulas. | *Upcoming* |
| **Phase 5** | **LLM Synthesis & API** | Gemini prompt configurations, Express JSON endpoints, and error fallbacks. | *Upcoming* |
| **Phase 6** | **React Frontend Dashboard** | Interactive interface, progress trackers, scores visuals, and citation cards. | *Upcoming* |

---

## Development Progress (Current Status: Phase 2 Refinement)
We are currently integrating the **Refined Provider Router and Quality Gate** into the data layer:
*   [x] **Foundation Layer (Phase 1):** Completed environment validation, graph state annotations, and provider interface abstractions.
*   [x] **Cache Layer (Module 1):** Implemented an in-memory TTL caching engine ([memoryCache.js](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/cache/memoryCache.js)) with automated key pruning.
*   [x] **Company Resolution Provider (Module 2):** Developed [companyResolver.js](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/implementations/companyResolver.js) supporting deterministic lookup and verified LLM autocorrection.
*   [x] **Financial Provider (Module 3):** Implemented [yahooFinance.js](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/implementations/yahooFinance.js) using `yahoo-finance2` and added `fundamentalsTimeSeries` support.
*   [x] **News & Search Providers (Modules 4-5):** Developed [tavilySearch.js](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/implementations/tavilySearch.js) wrapping the Tavily Search API.
*   [x] **Evidence Provider Router (Module 6):** Developed [providerRouter.js](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/providers/providerRouter.js) to manage field-level fallback recovery.
*   [x] **Testing Infrastructure:** Created isolated scripts inside `server/tests/` to verify concrete providers and router loops.

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
