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

## Key decisions & trade-offs — what you chose and why, and what you left out

### 1. LangGraph instead of LangChain Agents

**Decision**
Used LangGraph to construct a stateful directed acyclic graph (DAG) with explicit nodes and conditional edges.

**Why**
Delivers deterministic execution patterns, a visual flow structure, explicit graph state preservation across tasks, and reproducible routing logic, making testing and debugging significantly easier.

**Trade-off**
Requires more manual graph boilerplate and configuration compared to quick autonomous agent loops.

**What we intentionally left out**
Autonomous planning agents, recursive self-reflection cycles, and open-ended autonomous agent loops.

---

### 2. React + Vite instead of Next.js

**Decision**
Built the frontend dashboard as a client-side Single Page Application (SPA) using React powered by Vite.

**Why**
The dashboard has zero SEO requirements, builds extremely quickly, simplifies bundle sizes, and runs on simple static web hosts without any server infrastructure.

**Trade-off**
Lacks Server-Side Rendering (SSR), Incremental Static Regeneration (ISR), and native React Server Components.

**What we intentionally left out**
SSR, ISR, SEO optimization, and file-based routing.

---

### 3. Node.js + Express instead of Python/FastAPI

**Decision**
Selected Node.js with Express as the backend REST API gateway.

**Why**
Keeps the entire repository within a unified JavaScript ecosystem, facilitating shared utility libraries, reducing developer context switching, and leveraging the LangGraph.js ecosystem directly.

**Trade-off**
Lacks native Python numerical libraries (pandas, numpy) and FastAPI auto-documentation out of the box.

**What we intentionally left out**
Python microservices, FastAPI routers, and multithreading task systems.

---

### 4. No Database

**Decision**
Excluded any SQL or NoSQL database storage layers.

**Why**
The application executes real-time investment audits. Every user request queries active market feeds rather than reading stale history. There is no requirement for user accounts, watchlists, or data persistence.

**Trade-off**
Users cannot save research logs, store stock watchlists, or recall historical reports.

**What we intentionally left out**
PostgreSQL, MongoDB, Firebase database storage integrations, user profiles, and session storage.

---

### 5. In-Memory Cache instead of Redis

**Decision**
Implemented an in-memory process RAM singleton cache map with automated TTL expiry limits.

**Why**
Drastically minimizes infrastructure complexity, runs keylessly with zero operational dependencies, and satisfies the assignment caching requirements with sub-millisecond retrieve speeds.

**Trade-off**
Cache states are wiped out completely on server restarts and cannot be shared across multiple instances (unsuitable for horizontal scaling).

**What we intentionally left out**
Redis, distributed caching, cache replication, and persistent cache storage.

---

### 6. Multi-Provider Data Architecture

**Decision**
Structured the collection router to query Yahoo Finance, then fall back to SEC EDGAR, Tavily Search, and LLM Extraction in sequence.

**Why**
Maximizes data coverage resilience and protects the pipeline from individual endpoint failures or rate-limiting bans.

**Trade-off**
Significantly increases implementation complexity and requires normalizing mismatched raw data schemas.

**What we intentionally left out**
Paid institutional terminals (Bloomberg, Refinitiv) and custom third-party scrapers.

---

### 7. Deterministic Calculations instead of LLM Math

**Decision**
Performed all DCF, multiples comp models, CAPM, safety ratios, and rating scoring programmatically in JavaScript.

**Why**
Guarantees absolute mathematical precision and eliminates LLM hallucinations or calculation drift. The LLM is restricted to qualitative interpretation.

**Trade-off**
Limits model adjustments to pre-coded mathematical boundaries.

**What we intentionally left out**
LLM-driven calculation agents, prompt-based formula solving, and python code execution sandboxes.

---

### 8. Multi-Factor Recommendation Engine

**Decision**
Designed a scoring system that weights Valuation (30%), Financial Health (30%), Safety/Risks (15%), Momentum (15%), and News (10%).

**Why**
Avoids myopic ratings based solely on DCF upside by factoring in balance sheet solvency leverage, news sentiment catalyst modifiers, and price trends.

**Trade-off**
Requires weight tuning and normalization when valuation data is partially missing.

**What we intentionally left out**
Simple single-factor buy rules and black-box machine learning classification models.

---

### 9. Strict Company Resolution Similarity Gate

**Decision**
Implemented a similarity validation gate using Levenshtein distance and acronym checks, enforcing a minimum 70% threshold.

**Why**
Prevents the orchestrator from researching the wrong company when fuzzy autocompletes return unrelated symbols.

**Trade-off**
Ambiguous or highly misspelled company queries are rejected immediately and require manual refinement.

**What we intentionally left out**
Automatic resolution matching below 70% confidence and raw unchecked search redirections.

---

### 10. Evidence Quality Gate

**Decision**
Built a programmatic Evidence Quality Gate node that grades profile, income statement, balance sheet, cash flow, and news data.

**Why**
Prevents corrupting valuation formulas with null values by evaluating completeness prior to scoring.

**Trade-off**
Increases pipeline execution latency when recollection loops are triggered.

**What we intentionally left out**
Generative LLM validation checks and raw data bypass routes.

---

### 11. Field-Level Recovery

**Decision**
Configured the provider router to scan individual properties and patch only missing keys.

**Why**
Preserves the core numbers retrieved from trusted primary sources while avoiding inconsistencies from merging duplicate filings.

**Trade-off**
Requires strict property-by-property mapping definitions in code.

**What we intentionally left out**
Overwriting full statement sheets or falling back globally when a single cell is empty.

---

### 12. Explainability instead of Black Box AI

**Decision**
Exposes intermediate discount rates, present value arrays, subscore weights, news sentiments, and citations.

**Why**
Enables users to fully audit the recommendation and verify the math behind the Buy/Hold/Sell rating.

**Trade-off**
Yields a larger JSON payload and higher front-end component complexity.

**What we intentionally left out**
Simple single-word recommendations and hidden calculation parameters.

---

### 13. Interactive Dashboard instead of Static Report

**Decision**
Designed a tabbed glassmorphic dashboard featuring interactive period selectors and SVG progress wheels.

**Why**
Empowers users to inspect cash flows, view logs, toggle themes, and filter chart timelines dynamically.

**Trade-off**
Requires detailed front-end state management and browser-specific print stylesheet configurations.

**What we intentionally left out**
Static PDF generators, server-rendered text outputs, and standard dashboard templates.

---

### 14. BUY / HOLD / SELL instead of BUY / PASS

**Decision**
Expose both a binary Assignment Decision (INVEST / PASS) and a more detailed Research Rating (BUY / HOLD / SELL) on the presentation layer.

**Why**
MarketPilot AI computes a detailed institutional recommendation (BUY/HOLD/SELL). A separate deterministic Assignment Decision (INVEST/PASS) is then derived from the overall quantitative analysis to satisfy the assignment's binary output requirement. This ensures that high-quality, low-risk companies (such as Apple or Microsoft) that might be rated HOLD due to moderate valuation premiums are correctly marked as INVEST rather than being misclassified as PASS.

**Trade-off**
Requires maintaining a dual-layer mapping interface in the API payload and frontend dashboard view components.

**What we intentionally left out**
Raw binary-only classifiers and complex portfolio weighting recommendation outputs.

---

### 15. No Fine-Tuned Model

**Decision**
Deployed foundation models (Llama 3.3 and Gemini Flash) via key-rotated API pools.

**Why**
Eliminates the massive overhead, deployment costs, and maintenance associated with fine-tuning a custom model.

**Trade-off**
Exposes the pipeline to API provider availability and network latency.

**What we intentionally left out**
Custom LoRA training, model hosting, and offline local transformers.

---

### 16. Live Market Data instead of Stored Datasets

**Decision**
Connected the backend directly to real-time APIs to fetch live prices and news.

**Why**
Ensures the scorecard evaluation remains accurate and reflective of current market conditions.

**Trade-off**
Execution speed is capped by external API response latency.

**What we intentionally left out**
Static financial CSV datasets, offline databases, and delayed historical dumps.

---

### 17. Progressive Fallback Strategy

**Decision**
Implemented a multi-tiered fallback hierarchy (Yahoo Summary -> Yahoo TimeSeries -> SEC EDGAR -> Tavily Search -> LLM parse).

**Why**
Guarantees that the orchestrator degrades gracefully rather than throwing exceptions when APIs are rate-limited.

**Trade-off**
Increases response time when deep fallback tiers are triggered.

**What we intentionally left out**
Immediate throw exceptions and empty response returns.

---

### 18. Modular Component Architecture

**Decision**
Refactored the monolithic frontend App.jsx into isolated child components in `src/components/`.

**Why**
Simplifies file complexity, prevents merge conflicts, and permits isolated testing of individual dashboard tabs.

**Trade-off**
Requires structured prop drilling and state coordination hooks.

**What we intentionally left out**
Monolithic UI structures and global state management libraries (Redux, Recoil).

---

### 19. Why Google Stitch MCP was added

**Decision**
Integrated Google Stitch through Model Context Protocol (MCP).

**Why**
Allows for rapid UI prototyping, layout reviews, and design system variations under developer control.

**Trade-off**
Introduces dependency on MCP servers and host environments.

**What we intentionally left out**
Automatic unverified styling injections and raw code generation overrides.

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
