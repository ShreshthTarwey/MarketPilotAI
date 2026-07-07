# Project Architecture & Phase Documentation

This document outlines the design architecture, directory structure, data cascades, and implementation phases of **MarketPilot AI**.

---

## 1. Directory Structure Blueprint

```
MarketPilotAI/
├── docs/
│   ├── phase.md                     # [THIS FILE] System phases detail doc
│   └── architecture_workflow.png     # Rendered visual node execution flowchart
├── server/
│   ├── src/
│   │   ├── agent/
│   │   │   ├── nodes/
│   │   │   │   ├── validateInput.js         # Input validation constraints Node
│   │   │   │   ├── resolveCompany.js        # Autocomplete & lookup Node
│   │   │   │   ├── collectEvidence.js       # Concurrent API queries Node
│   │   │   │   ├── evaluateQuality.js       # Validation gate scorecard Node
│   │   │   │   ├── recollectMissing.js      # Targeted fallbacks recall Node
│   │   │   │   ├── computeScores.js         # Deterministic calculations Node
│   │   │   │   └── generateRecommendation.js# Qualitative LLM synthesis Node
│   │   │   ├── graph.js             # StateGraph setup and compilation
│   │   │   └── state.js             # State schema annotations and reducers
│   │   ├── config/
│   │   │   └── env.js               # Centralized credential loading
│   │   ├── providers/
│   │   │   ├── cache/
│   │   │   │   └── memoryCache.js   # In-memory TTL key pruner singleton
│   │   │   ├── implementations/
│   │   │   │   ├── companyResolver.js       # Autocomplete query logic
│   │   │   │   ├── yahooFinance.js          # QuoteSummary & TimeSeries scraper
│   │   │   │   ├── secEdgar.js              # SEC XBRL facts scraper (US stocks)
│   │   │   │   ├── stooq.js                 # Yahoo Chart price history downloader
│   │   │   │   └── tavilySearch.js          # Tavily search & news connector
│   │   │   ├── interfaces/
│   │   │   │   ├── financialProvider.js     # Abstract financial provider schema
│   │   │   │   ├── newsProvider.js          # Abstract news article schema
│   │   │   │   ├── searchProvider.js        # Abstract web search result schema
│   │   │   │   └── llmProvider.js           # Abstract LLM execution schema
│   │   │   ├── llmRouter.js         # Rotated key pool Groq/Gemini router
│   │   │   └── providerRouter.js    # Ingestion coordinator & recovery cascade
│   │   ├── scoring/
│   │   │   ├── evidenceAggregator.js# CONSISTENCY & CONFIDENCE AGGREGATOR
│   │   │   └── qualityGate.js       # Quality evaluation diagnostics calculator
│   │   └── services/
│   │       └── evidenceService.js   # Decoupled business logic API
│   └── tests/
│       ├── testCompanyResolver.js   # Autocomplete isolated test
│       ├── testYahooProvider.js     # Yahoo QuoteSummary raw test
│       ├── testTavilyProvider.js    # Tavily Search/News keys test
│       ├── testFinancialProvider.js # TimeSeries vs SEC vs Stooq test
│       ├── testProviderRouter.js    # Recovery cascade trace test
│       └── testGraph.js             # E2E StateGraph integration test
```

---

## 2. Core Architectural Principles

### A. In-Flight Request De-duplication (Cache Stampede Protection)
When retrieving `profile` and `financials` concurrently inside `collectEvidenceNode`, they execute in parallel. To prevent concurrent cache misses from firing duplicate HTTP requests to Yahoo Finance, the provider layer caches the active **Promise** inside an `inFlightBundles` registry. The second concurrent query reuses the same request promise.

### B. Intermediate Evidence Aggregator Layer
Sits between the evidence collection nodes and the Quality Gate. It normalizes different provider data shapes, removes duplicates, merges sources metadata into `providerCoverage`, counts recovered fields, and calculates a **deterministic confidence score** programmatically in JavaScript.

### C. Deterministic Confidence Score
Rather than allowing the LLM to hallucinate a confidence percentage, a JavaScript formula computes it dynamically:
*   **Base Score:** 100%
*   **Penalties:**
    *   Missing profile elements: `-5%`
    *   Missing financial sheets: `-15%`
    *   `YahooTimeSeries` fallback used: `-5%`
    *   `SecEdgar` fallback used: `-10%`
    *   `TavilySearch+LLM` fallback used: `-20%`
    *   Low news articles: `-5%` (1-2 articles), `-10%` (0 articles)
*   **Bound:** Minimum 30%, Maximum 100%

### D. Disabled Target Prices
To prevent LLM hallucination, `targetPrice` is set to `null` and marked as "Not Estimated" until a deterministic valuation algorithm (DCF/relative multiples) is coded in JavaScript (Phase 4).

---

## 3. Detailed Workflow Execution Diagram

```mermaid
graph TD
    Start([User Input: Company Name Query]) --> Node0[validateInputNode]
    Node0 -- Checks query length/chars --> Node1[resolveCompanyNode]
    
    Node1 -- calls --> Service[EvidenceService.resolveCompany]
    Service -- calls --> Resolver[companyResolver.js]
    
    Node1 --> Node2[collectEvidenceNode]
    
    Node2 -- Parallel concurrent fetch --> Service2[EvidenceService queries]
    Service2 -- calls --> Router[providerRouter.js]
    
    Node2 -- Normalizes via --> Aggregator[evidenceAggregator.js]
    Aggregator -- Calculates --> Confidence[Deterministic Confidence Score]
    
    Node2 --> Node3[evaluateQualityNode]
    Node3 -- Runs diagnostics --> Gate[scoring/qualityGate.js]
    
    Node3 --> Edge{Enough Evidence? <br> Score >= 80% or Attempts >= 2}
    
    Edge -- No --> Node4[recollectMissingNode]
    Node4 -- targeted recall --> Service2
    Node4 -- Loops back --> Node3
    
    Edge -- Yes --> Node5[computeScoresNode]
    Node5 -- Calculates profitability/solvency ratios --> Scorecard[JS Math calculator]
    
    Node5 --> Node6[generateRecommendationNode]
    Node6 -- Shuffled LLM rotation --> LLM[llmRouter.js]
    
    Node6 --> End([Completed: Final Report JSON])
    End --> Spacer["&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"]
    
    style Node0 fill:#ffe6cc,stroke:#ea580c,stroke-width:2px,color:#431407
    style Node1 fill:#d4ebf2,stroke:#0891b2,stroke-width:2px,color:#083344
    style Node2 fill:#d4ebf2,stroke:#0891b2,stroke-width:2px,color:#083344
    style Node3 fill:#ffe6cc,stroke:#ea580c,stroke-width:2px,color:#431407
    style Node4 fill:#d4ebf2,stroke:#0891b2,stroke-width:2px,color:#083344
    style Node5 fill:#d5e8d4,stroke:#16a34a,stroke-width:2px,color:#052e16
    style Node6 fill:#e1d5e7,stroke:#9333ea,stroke-width:2px,color:#3b0764
    style Spacer fill:none,stroke:none
```

---

## 4. Development Implementation Phases

### Phase 1: Foundation Layer (Complete)
Established config validation (`env.js`), graph channels (`state.js`), and abstract provider contracts (`interfaces/`).

### Phase 2: Data & Provider Layer (Complete)
Implemented cache singleton, ticker autocompletes, Tavily search connectors, SEC EDGAR XBRL scrapers, Yahoo Chart historical downloaders, and the master router's field-level recovery cascade.

### Phase 3: LangGraph Orchestration Layer (Complete)
Built the service layer, single-responsibility nodes, input validation, evidence aggregator diagnostics, compiled StateGraph with conditional routing, and verification tests.

### Phase 4: Deterministic Scoring & Valuations (Complete)

We have built a fully transparent, configurable, and mathematically explainable **Consensus Valuation Engine** in JavaScript. The implementation separates core formulas from LLM interpretation, ensuring that numerical accuracy is fully preserved in code while the LLM focuses entirely on qualitative analysis.

#### A. Phase 4 Files & Usages
The following files were created or modified to implement the financial scoring and deterministic valuation pipeline:

1.  **[`server/src/config/valuationConfig.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/config/valuationConfig.js) [NEW]**
    *   **Usage:** Declares baseline macro settings (risk-free rate, market risk premium, forecast years, and terminal perpetual growth) alongside sector multiples tables (prepared for P/E, P/B, EV/EBITDA, P/S) and consensus blending weights.
    *   **Pipeline Position:** Loaded by the valuation library at execution time to set policy rules.
2.  **[`server/src/scoring/valuationCalculator.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/scoring/valuationCalculator.js) [NEW]**
    *   **Usage:** Contains the core mathematical modeling engines:
        *   *CAPM Cost of Equity:* Solves $\beta_L$ using balance sheet leverage, then applies CAPM.
        *   *Smoothed Growth Average:* Averages YoY growths and applies linear compression to eliminate spikes.
        *   *5-Year DCF:* Projects FCF, discounts using Cost of Equity ($K_e$), and solves intrinsic fair price keylessly.
        *   *Relative Multiples:* Multiplies earnings and book equity by sector benchmarks.
        *   *Consensus Blender:* Averages DCF (60%) and Comps (40%).
    *   **Pipeline Position:** Invoked by `computeScoresNode` to perform quantitative valuation.
3.  **[`server/src/agent/state.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/state.js) [MODIFY]**
    *   **Usage:** Added the rich `valuation` state channel and schema to store raw consensus prices, upside margins of safety, assumptions, and intermediate calculation arrays.
    *   **Pipeline Position:** Defines the shared data schema passed between LangGraph nodes.
4.  **[`server/src/agent/nodes/computeScores.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/computeScores.js) [MODIFY]**
    *   **Usage:** Extracts the resolved financial history, invokes `valuationCalculator.compileValuationReport()`, and updates the graph state with the rich valuation payload.
    *   **Pipeline Position:** Executed directly after the targeted recollection nodes check out of quality gates.
5.  **[`server/src/agent/nodes/generateRecommendation.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/generateRecommendation.js) [MODIFY]**
    *   **Usage:** Injects the current trading price, consensus target price, and the rich intermediate assumptions into the LLM synthesis prompt template, forcing prompt constraints that restrict the LLM from inventing numerical scores.
    *   **Pipeline Position:** The final node of the StateGraph before compile output.
6.  **[`server/src/scoring/evidenceAggregator.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/scoring/evidenceAggregator.js) [MODIFY]**
    *   **Usage:** Realigned `calculateConfidence` to query the program's stateless `evaluateQualityGate` report, ensuring that empty balance sheet elements correctly decrease the deterministic confidence percentage (e.g. dropping to 60% for partial filings).
    *   **Pipeline Position:** Invoked inside `collectEvidenceNode` and `recollectMissingNode` to audit data quality.
7.  **[`server/tests/testGraph.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/tests/testGraph.js) [MODIFY]**
    *   **Usage:** Added diagnostic sections rendering the base FCF, projected arrays, terminal values, present values, and multiple valuations to verify all mathematical formulas.
    *   **Pipeline Position:** Terminal test CLI runner.

---

## 1. Why We Estimate Intrinsic Value (Target Price)

### What is Intrinsic Value?
Intrinsic value is the "true" or "fair" value of a business based on its underlying cash-generating power, financial health, and risk profile. It is completely independent of the current stock market trading price. If a company's intrinsic value is $100 and it trades at $80, it is undervalued; if it trades at $120, it is overvalued.

### Why Professional Investors Estimate Fair Value
1. **Margin of Safety:** Investors seek a "buffer" between the purchase price and the intrinsic value. If we buy a stock below its intrinsic value, we protect ourselves against forecasting errors or temporary market downturns.
2. **Objective Decision-Making:** Having a math-backed target price prevents investors from making emotional decisions driven by daily market volatility or short-term panic/hype.

### Why Different Analysts Obtain Different Target Prices
Valuation is not a hard science; it is a set of logical projections. Different analysts make different assumptions about:
*   How fast the company will grow in the future.
*   The risk of the business (which changes the interest rate/discount rate).
*   Long-term perpetual growth rates.
Small adjustments in these inputs can shift a target price by 20% to 50%. Therefore, our model should be treated as a **rigorous mathematical estimate**, not an absolute, immutable truth.

### Why Calculate Our Own Valuation vs. Fetching Analyst Targets
Relying solely on Wall Street analyst consensus target prices introduces several vulnerabilities:
1. **Analyst Optimism Bias:** Sell-side analysts often have conflicts of interest (parent banks wanting to maintain corporate relationships) and historically skew heavily towards optimistic "Buy" ratings.
2. **Stale Lagging Indicators:** Analysts update their targets infrequently (e.g. once a quarter). If interest rates spike or revenue trends drop suddenly, consensus numbers remain outdated for weeks.
3. **Low Coverage on Niche / Mid-Cap Equities:** While blue-chip companies have massive analyst coverage, smaller or regional equities (e.g., fast-growing Indian mid-caps, pre-IPOs, or niche players) often have zero coverage.
4. **Custom Stress-Testing (Scenario Planning):** By controlling the code, we can dynamically change assumptions (e.g., *"What is the valuation if revenue growth drops to 3%?"*). This allows the agent to run stress tests and pass the outputs to the LLM for deep strategic synthesis.

---

## 2. Dynamic vs. Configurable Inputs

Professional finance platforms split valuation parameters to balance stock-specific accuracy with macroeconomic policy guidelines.

### A. Dynamic Inputs (Stock-Specific)
These inputs are retrieved and computed dynamically for each target company:
*   **Revenue:** Total sales generated by the business.
*   **Net Income:** Bottom-line profit after all expenses, interest, and taxes.
*   **Free Cash Flow (FCF):** Cash generated from operations minus capital expenditures. This is the raw cash available to return to investors.
*   **Book Value / Total Equity:** Net worth of the company (Total Assets minus Total Liabilities).
*   **Market Capitalization:** Current stock market value of the company (Stock Price $\times$ Shares Outstanding).
*   **Current Stock Price:** The last traded market price of the stock.
*   **Debt:** Short-term and long-term interest-bearing liabilities. Used to evaluate solvency and lever the CAPM Beta.

### B. Configurable Inputs (Global Policy Settings)
These settings are centralized in [`valuationConfig.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/config/valuationConfig.js) rather than being hardcoded in scripts:
*   **Risk-Free Rate ($R_f$):** Yield on long-term government bonds. Represents the return on a zero-risk investment (default `4.0%`).
*   **Market Risk Premium (MRP):** The extra yield expected for investing in the stock market over risk-free bonds (default `6.0%`).
*   **Forecast Horizon:** The number of future years projected in cash flows (default `5 years`).
*   **Terminal Growth Rate:** Long-term perpetual growth proxy matching inflation expectations (default `2.5%`).
*   **Sector Multiples:** Comparable benchmark tables (P/E, P/B, EV/EBITDA, P/S) grouped by industry categories.

*Why Configurable?* Centralizing these parameters ensures the entire codebase updates instantly if macroeconomic conditions change (e.g., if inflation spikes, we can raise the Risk-Free Rate in one place rather than editing multiple files).

---

## 3. In-Depth Formula Documentation

This section outlines every calculation executed by the valuation engine.

---

### A. Revenue Growth Rate (Smoothed Average)
*   **Purpose:** Measures the rate of expansion of the company's business. We average the last 3 years of growth and smooth out spikes to avoid outlier forecasts.
*   **Formula:**
    $$\text{YoY Growth}_t = \left(\frac{\text{Revenue}_t - \text{Revenue}_{t-1}}{\text{Revenue}_{t-1}}\right) \times 100$$
    $$\text{Smoothed YoY Growth}_t = \begin{cases} 
      30 + 0.1 \times (\text{YoY Growth}_t - 30) & \text{if } \text{YoY Growth}_t > 30 \\
      -20 + 0.1 \times (\text{YoY Growth}_t + 20) & \text{if } \text{YoY Growth}_t < -20 \\
      \text{YoY Growth}_t & \text{otherwise}
   \end{cases}$$
    $$\text{Consensus growth} = \text{Average of all Smoothed YoY Growths}$$
*   **Variable Meanings:**
    *   $\text{Revenue}_t$: Revenue in year $t$.
    *   $\text{YoY Growth}_t$: Unadjusted year-over-year growth rate percentage.
*   **Why We Use It:** Establishes a baseline trajectory for future cash projections.
*   **Advantages:** Averaging and smoothing prevents a single abnormal year (e.g. pandemic recovery spike) from distorting long-term projections.
*   **Limitations:** Past growth does not guarantee future performance.
*   **Industry Practice:** Standard modeling practice is to review 3-5 years of historical trends and apply a conservative decay or smoothing factor.

---

### B. Free Cash Flow Growth Rate (Projected)
*   **Purpose:** Projecting future FCF based on smoothed historical revenue growth.
*   **Formula:**
    $$\text{Projected } g_{\text{FCF}} = \max\left(\text{MinLimit}, \min\left(\text{MaxLimit}, \text{Consensus Growth}\right)\right)$$
    *Note:* `MinLimit = 2.5%` and `MaxLimit = 12.0%` loaded from configuration.
*   **Why We Use It:** Estimates how fast cash generated by operations will expand.
*   **Advantages:** Hard bounds prevent unsustainable cash growth estimates (e.g. projecting a company to grow at 50% for 5 years).
*   **Limitations:** Disregards capital investment cycles that might temporarily suppress FCF.
*   **Industry Practice:** Conservative projection growth rates are capped at nominal GDP growth proxies (2.5% to 12%).

---

### C. Levered Beta ($\beta_L$) & Cost of Equity ($K_e$) via CAPM
*   **Purpose:** Estimates the required rate of return that investors demand for holding the company's stock, adjusted for financial leverage (debt).
*   **Formulas:**
    $$\beta_{\text{levered}} = \beta_{\text{unlevered}} \times \left(1 + (1 - \text{Tax Rate}) \times \frac{\text{Total Debt}}{\text{Total Equity}}\right)$$
    $$\text{Cost of Equity } (K_e) = R_f + \beta_{\text{levered}} \times \text{MRP}$$
    *Note:* $R_f = 4.0\%$, $\text{MRP} = 6.0\%$, $\beta_{\text{unlevered}} = 1.0$, and tax rate = `25%`. $K_e$ is bounded between `7.5%` and `15.0%`.
*   **Variable Meanings:**
    *   $\beta_{\text{unlevered}}$: The baseline risk of the industry assuming the company has zero debt.
    *   $\beta_{\text{levered}}$: The risk of the stock including its debt structure.
    *   $\frac{\text{Total Debt}}{\text{Total Equity}}$: Solvency leverage ratio (D/E).
*   **Why We Use It:** A company with higher debt is riskier. Levering the Beta mathematically increases its risk profile, which raises the Cost of Equity ($K_e$) discount rate, lowering the present value of future cash flows.
*   **Advantages:** Dynamically connects stock solvency (solvency score) to the valuation discount rate.
*   **Limitations:** CAPM assumes market efficiency and that risk is purely represented by stock volatility (Beta).
*   **Industry Practice:** CAPM is the universal standard for calculating the cost of equity across global investment banks.

---

### D. Perpetual Terminal Value (TV)
*   **Purpose:** Estimates the value of all cash flows beyond the 5-year forecast horizon into infinity.
*   **Formula:**
    $$TV = \frac{FCF_5 \times (1 + g_{\text{terminal}})}{K_e - g_{\text{terminal}}}$$
    *Note:* perpetual terminal growth $g_{\text{terminal}}$ is set to `2.5%` (inflation proxy).
*   **Variable Meanings:**
    *   $FCF_5$: Free Cash Flow projected in Year 5.
    *   $g_{\text{terminal}}$: Perpetual inflation growth rate (inflation limit ceiling).
    *   $K_e$: Cost of Equity discount rate.
*   **Why We Use It:** A business is assumed to operate infinitely. This formula computes the present value from Year 6 onwards.
*   **Advantages:** Compresses infinite future cash flows into a single number today using a perpetuity math formula.
*   **Limitations:** Highly sensitive to the difference between WACC/Ke and terminal growth ($K_e - g_{\text{terminal}}$).
*   **Industry Practice:** Standard perpetual growth rates match long-term macroeconomic GDP growth (2.0% to 3.0%).

---

### E. Discounted Cash Flow (PV of Cash Flows)
*   **Purpose:** Discounts all projected future cash flows and the Terminal Value back to today's dollars.
*   **Formula:**
    $$PV = \sum_{t=1}^5 \frac{FCF_t}{(1 + K_e)^t} + \frac{TV}{(1 + K_e)^5}$$
*   **Why We Use It:** Time value of money: $1 received 5 years from now is worth less than $1 today.
*   **Advantages:** Mathematically sound, cash-focused valuation.
*   **Limitations:** Projections are highly dependent on growth and discount assumptions.
*   **Industry Practice:** The absolute gold standard of corporate finance valuation.

---

### F. Enterprise Value & Equity Value (Algebraic Resolution)
*   **Purpose:** Resolves the fair stock price keylessly without requiring an outstanding shares database.
*   **Formula:**
    $$\text{Fair Stock Price (DCF)} = \text{Current Stock Price} \times \left(\frac{\text{Total Present Value of Equity (PV)}}{\text{Total Market Cap}}\right)$$
*   **Why We Use It:** By solving the PV-to-Market-Cap ratio, we calculate undervaluation or overvaluation directly and apply that offset to the current price. This avoids fetching shares outstanding, bypassing paid API restrictions.
*   **Advantages:** Highly robust, keyless, and structurally reliable.
*   **Numerical Example:**
    *   Current Price = $100. Market Cap = $10 Billion. Present Value of Cash Flows (PV) = $12 Billion.
    *   $\text{Fair Stock Price} = 100 \times \left(\frac{12 \text{B}}{10 \text{B}}\right) = \$120$.

---

### G. Relative Valuation (Comparable Multiples)
*   **Purpose:** Values a company based on peer sector multiples (P/E and P/B).
*   **Formulas:**
    $$\text{PE Valuation} = \text{Current Price} \times \left(\frac{\text{Net Income} \times \text{Target PE}}{\text{Market Cap}}\right)$$
    $$\text{PB Valuation} = \text{Current Price} \times \left(\frac{\text{Book Equity} \times \text{Target PB}}{\text{Market Cap}}\right)$$
    $$\text{Relative Multiple Fair Price} = \frac{\text{PE Valuation} + \text{PB Valuation}}{2}$$
*   **Why We Use It:** Complements DCF (which focuses on cash flow) by factoring in current market sector pricing benchmarks.
*   **Advantages:** Easy to calculate, reflects current real-world market multiples.
*   **Limitations:** If the entire sector is overvalued, multiples valuation will also be overvalued.
*   **Industry Practice:** Multiples are always used alongside DCF to provide a sanity check.

---

### H. Blended Consensus Valuation
*   **Purpose:** Blends the cash flow model and multiples model into a single consensus target price.
*   **Formula:**
    $$\text{Consensus Target Price} = 60\% \times \text{DCF Value} + 40\% \times \text{Relative Multiples Value}$$
*   **Why We Use It:** Blending balances long-term fundamental value (60% weight) with short-term comps sentiment (40% weight).

---

### I. Valuation Upside / Downside %
*   **Purpose:** Identifies the expected return premium (or loss) if the stock moves to its intrinsic value.
*   **Formulas:**
    $$\text{Valuation Upside (\%)} = \left(\frac{\text{Consensus Target Price} - \text{Current Price}}{\text{Current Price}}\right) \times 100 \quad [\text{If Consensus } > \text{ Current}]$$
    $$\text{Valuation Downside (\%)} = \left(\frac{\text{Current Price} - \text{Consensus Target Price}}{\text{Current Price}}\right) \times 100 \quad [\text{If Current } > \text{ Consensus}]$$

---

### J. Margin of Safety (MoS)
*   **Purpose:** Measures the discount of the purchase price relative to the intrinsic target price.
*   **Formula:**
    $$\text{Margin of Safety (\%)} = \left(\frac{\text{Consensus Target Price} - \text{Current Price}}{\text{Consensus Target Price}}\right) \times 100$$
*   **Why We Use It:** If our target price is $100 and it trades at $80, the 20% margin of safety protects us if our future cash flow projections are slightly off.
*   **Advantages:** Crucial risk management metric.
*   **Industry Practice:** Value investors (like Warren Buffett) require a minimum 20% margin of safety before buying.

---

## 4. Valuation Engine Assumptions & Uncertainties

Every valuation model makes projections about the future. Professional analysts recognize that **valuations are estimates, not predictions**. 

To balance flexibility and consistency, our system divides assumptions into two categories: **Dynamic Assumptions** (calculated specifically for each stock) and **Configurable/Static Assumptions** (macro constants loaded from `valuationConfig.js`).

---

### A. Dynamic Assumptions (Calculated per Stock)
These parameters are computed on the fly based on the company's real financial status:
1.  **Revenue Growth (Historical):** Calculated directly from the company's financial history. For example, TCS.NS's revenue growth was `4.58%` based on its income statements, while Apple's was `6.43%`.
2.  **Free Cash Flow (FCF) Forecast Growth:** Pegged directly to the company's historical revenue growth (bounded between `2.5%` and `12%` to prevent outlier projections).
3.  **Cost of Equity WACC (CAPM):** Calculated dynamically using the company's actual **Debt-to-Equity (Solvency)** ratio:
    *   **High Risk / High Leverage:** Apple carries high leverage (Debt-to-Equity = 3.87). The CAPM formula dynamically increased its cost of equity (WACC) to our ceiling cap of **`15.0%`**, reflecting high risk.
    *   **Low Risk / Low Leverage:** TCS.NS carries lower leverage (Debt-to-Equity = 0.69). The CAPM formula dynamically calculated a lower Cost of Equity of **`13.1%`**, yielding a more favorable discount rate.
4.  **Target Sector Multiples:** Solved dynamically by scanning the company's business category (e.g., mapping `"Technology"` to a PE multiple of `25` or `Consumer Electronics` to `24`, and general sectors to `18`).

---

### B. Configurable/Static Assumptions (Centralized Policies)
These parameters are set globally in [`valuationConfig.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/config/valuationConfig.js) to establish policy baseline criteria:
1.  **Forecast Horizon (5 Years):** Forecasting cash flows out 5 years is the corporate finance standard. Projections beyond 5 years introduce massive forecasting errors.
2.  **Perpetual Growth Rate (2.5%):** The long-term terminal growth rate of any mature corporation must not exceed the long-term growth rate of the macroeconomy (which matches inflation, typically 2.0% - 3.0%). Pegging this at 2.5% aligns with central bank targets.
3.  **CAPM Macro Constants:** Risk-free rate (`4.0%`) and Market Risk Premium (`6.0%`) are centralized macro policies representing the current baseline return expectations.
4.  **Valuation Weights (60% DCF / 40% Multiples):** Standard blend weighting that balances long-term fundamental cash generation (DCF) with current market sentiment benchmarks (multiples).

---

### Phase 5: LLM Synthesis & REST API (Complete)

We have exposed our Compiled LangGraph Orchestrator to external clients via an Express REST API server. 

#### A. API Endpoints Scaffolding
The API server is hosted on port `5000` (configurable via `PORT` environment variables) and implements two main endpoints:

1.  **`GET /api/resolve` (Company Resolution)**
    *   *Purpose:* Translates a search string (e.g. `"Tata"` or `"Apple"`) into a verified ticker symbol (e.g. `"TCS.NS"` or `"AAPL"`).
    *   *Usage:* Used by the frontend search input bar to retrieve autocomplete recommendations and display validation states before initiating research.
2.  **`GET/POST /api/research` (Core Graph Orchestrator)**
    *   *Purpose:* Accepts a company query, compiles the initial graph state, executes all collector, validator, recollection, scoring, and recommendation nodes, and returns the final normalized JSON report payload.
    *   *Payload Structure:* Returns `{ success: true, data: { resolvedIdentity, profile, financials, news, scores, valuation, recommendation, qualityReport, warnings } }`.

#### B. Centralized Error & 404 Middleware
Error handling is centralized inside [`server/src/config/errorHandler.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/config/errorHandler.js):
*   **Route Interceptor (`handle404`):** Catches invalid path requests and returns a clean, structured JSON 404 response.
*   **Global Exception Catcher (`globalErrorHandler`):** Intercepts internal exceptions (unhandled promise rejections, database drops) and returns a JSON 500 response.
*   **Rate Limit Auditing:** Automatically audits error messages for `"rate limit"` text or `429` status codes. If detected, it returns a friendly JSON response instructing the user to wait, preventing frontend crashes.

#### C. LLM Reasoning & Prompt Constraints
Inside [`generateRecommendation.js`](file:///c:/Users/Asus/Desktop/MarketPilotAI/server/src/agent/nodes/generateRecommendation.js), the LLM prompt templates have been strictly constrained to act as **Qualitative Synthesizers**:
1.  **Mathematical Integrity:** Injects the exact numerical outputs (e.g. Operating Margin, Debt-to-Equity, CAPM Cost of Equity, Fair Consensus DCF values, and margins of safety) directly into the prompt.
2.  **Strict Limits:** Explicitly instructs the LLM not to invent, override, or calculate any quantitative parameters. It must read the exact numbers provided.
3.  **Logical Consistency:** Forces the LLM to output its recommendation rating (Buy/Hold/Sell) and target price matching the deterministic consensus fair price, ensuring that the qualitative thesis does not contradict the math.

---

### Phase 6: React Frontend Dashboard (Upcoming)
Create an interactive dashboard showcasing score visuals, citation overlays, recovery logs, and pdf exports.

