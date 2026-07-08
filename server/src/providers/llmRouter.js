/**
 * llmRouter.js
 * Concrete implementation of the LLM Provider Router.
 * Implements API key rotation for Groq, and automatic failover to Gemini.
 * Exposes a clean, unified abstract interface to the rest of the application.
 */

const ILLMProvider = require('./interfaces/llmProvider');
const config = require('../config/env');

class LLMRouter extends ILLMProvider {
  /**
   * @param {Object} [dependencies]
   * @param {string[]} [dependencies.groqKeys] - Overrides config Groq keys for testing
   * @param {string} [dependencies.geminiKey] - Overrides config Gemini key for testing
   */
  constructor(dependencies = {}) {
    super();
    this.groqKeys = dependencies.groqKeys || config.groqApiKeys || [];
    this.geminiKey = dependencies.geminiKey || config.geminiApiKey || '';
    
    // Default model targets
    this.groqModel = 'llama-3.3-70b-versatile'; // Standard fast, high-reasoning model on Groq
    this.geminiModel = 'gemini-1.5-flash';       // Standard cost-efficient multimodal model
  }

  /**
   * Shuffles a cloned key pool to distribute request traffic.
   * 
   * @param {string[]} keysPool
   * @returns {string[]} Shuffled copy of the keys pool.
   */
  _shuffleKeys(keysPool) {
    const cloned = [...keysPool];
    for (let i = cloned.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
    }
    return cloned;
  }

  /**
   * Helper to perform a POST request with timeout safety.
   * 
   * @param {string} url 
   * @param {Object} options 
   * @param {number} [timeoutMs] 
   */
  async _fetchWithTimeout(url, options, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  /**
   * Checks if an error status code or message is retryable.
   * We retry: HTTP 429 (Rate Limit), HTTP 503 (Service Unavailable),
   * Network Timeouts (AbortError), and general network connection drops.
   * 
   * @param {Error|number} errorOrStatus - Catches HTTP status number or Error object.
   * @returns {boolean} True if the routing logic should try another key.
   */
  _isRetryable(errorOrStatus) {
    if (typeof errorOrStatus === 'number') {
      return errorOrStatus === 429 || errorOrStatus === 503 || errorOrStatus >= 500;
    }
    
    const message = errorOrStatus.message ? errorOrStatus.message.toLowerCase() : '';
    const name = errorOrStatus.name || '';
    
    // Timeout/Abort errors and network errors
    if (name === 'AbortError' || name === 'TimeoutError') return true;
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout') || message.includes('econnrefused') || message.includes('retryable')) {
      return true;
    }
    
    return false;
  }

  /**
   * Attempts to execute the prompt on Groq using dynamic API Key rotation.
   * 
   * @param {string} prompt 
   * @param {boolean} isJsonMode 
   * @returns {Promise<{ content: string, metadata: Object }>} Content and provider metadata.
   */
  async _tryGroqPool(prompt, isJsonMode) {
    if (this.groqKeys.length === 0) {
      throw new Error("No Groq API keys available in pool.");
    }

    // Dynamic, per-request key shuffling
    const shuffledPool = this._shuffleKeys(this.groqKeys);
    const errors = [];

    for (let i = 0; i < shuffledPool.length; i++) {
      const apiKey = shuffledPool[i];
      const maskedKey = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
      const startTime = Date.now();
      
      try {
        console.log(`[LLM Router]: Request attempt on Groq using Key ${i + 1}/${shuffledPool.length} (${maskedKey})`);
        
        const payload = {
          model: this.groqModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1
        };

        if (isJsonMode) {
          payload.response_format = { type: 'json_object' };
        }

        const response = await this._fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          // If non-retryable error (e.g. 400 Bad Request, 401 Unauthorized), fail immediately
          if (!this._isRetryable(response.status)) {
            const text = await response.text();
            throw new Error(`Non-retryable HTTP ${response.status}: ${text}`);
          }
          throw new Error(`Retryable HTTP ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
          throw new Error("Groq API returned an empty message payload.");
        }

        const latencyMs = Date.now() - startTime;
        return {
          content,
          metadata: {
            provider: 'Groq',
            model: this.groqModel,
            latencyMs,
            keyIdentifier: maskedKey,
            success: true
          }
        };

      } catch (err) {
        console.warn(`[LLM Router]: Groq key index ${i} failed. Reason: ${err.message}`);
        errors.push({ keyIndex: i, error: err.message });
        
        // If it's a non-retryable error, halt key loop and fail up immediately
        if (err.message.startsWith('Non-retryable') || !this._isRetryable(err)) {
          throw new Error(`Fatal non-retryable failure on Groq: ${err.message}`);
        }
      }
    }

    throw new Error(`All Groq keys in pool failed. Retries exhausted. Errors: ${JSON.stringify(errors)}`);
  }

  /**
   * Fallback method using Gemini API.
   * 
   * @param {string} prompt 
   * @param {boolean} isJsonMode 
   * @returns {Promise<{ content: string, metadata: Object }>} Content and provider metadata.
   */
  async _tryGemini(prompt, isJsonMode) {
    if (!this.geminiKey) {
      throw new Error("Gemini API key is not configured.");
    }

    console.log(`[LLM Router]: Falling back to Gemini API`);
    const startTime = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent?key=${this.geminiKey}`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.1
      }
    };

    if (isJsonMode) {
      payload.generationConfig.responseMimeType = 'application/json';
    }

    const response = await this._fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini HTTP Error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error("Gemini API returned an empty text payload.");
    }

    const latencyMs = Date.now() - startTime;
    return {
      content,
      metadata: {
        provider: 'Gemini',
        model: this.geminiModel,
        latencyMs,
        keyIdentifier: 'GEMINI_DEFAULT',
        success: true
      }
    };
  }

  /**
   * Master execution router. Try Groq Pool -> Fallback to Gemini -> Throw structured error.
   * 
   * @param {string} prompt 
   * @param {boolean} isJsonMode 
   * @returns {Promise<{ content: string, metadata: Object }>}
   */
  async _routeRequest(prompt, isJsonMode) {
    try {
      // Step 1: Attempt Groq key pool (shuffled per-request)
      return await this._tryGroqPool(prompt, isJsonMode);
    } catch (groqError) {
      // If it was a fatal non-retryable error, it propogates directly without trying Gemini
      if (groqError.message.includes('Fatal non-retryable')) {
        throw groqError;
      }
      
      console.warn(`[LLM Router]: Groq pool failed or exhausted. Fallback triggered. Error: ${groqError.message}`);
      
      try {
        // Step 2: Attempt Gemini fallback
        return await this._tryGemini(prompt, isJsonMode);
      } catch (geminiError) {
        console.error(`[LLM Router]: Gemini fallback failed. Error: ${geminiError.message}`);
        
        // Step 3: Throw structured error
        throw new Error(
          JSON.stringify({
            status: "error",
            code: "LLM_PROVIDER_EXHAUSTED",
            message: "All configured LLM providers (Groq pool and Gemini fallback) failed to respond.",
            details: {
              groq: groqError.message,
              gemini: geminiError.message
            }
          })
        );
      }
    }
  }

  /**
   * Generates a structured JSON response from the LLM.
   * 
   * @param {string} prompt 
   * @param {Object} [options] 
   * @returns {Promise<{ data: Object, metadata: Object }>}
   */
  async generateJSON(prompt, options = {}) {
    const { content, metadata } = await this._routeRequest(prompt, true);
    try {
      const data = JSON.parse(content);
      return { data, metadata };
    } catch (err) {
      console.error("[LLM Router]: Failed to parse returned text as JSON:", content);
      throw new Error(`Model output was not valid JSON: ${err.message}`);
    }
  }

  /**
   * Generates plain text from the LLM.
   * 
   * @param {string} prompt 
   * @param {Object} [options] 
   * @returns {Promise<{ text: string, metadata: Object }>}
   */
  async generateText(prompt, options = {}) {
    const { content, metadata } = await this._routeRequest(prompt, false);
    return { text: content, metadata };
  }
}

module.exports = LLMRouter;
