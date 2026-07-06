/**
 * llmProvider.js
 * Abstract interface contract and JSDoc schemas for all LLM Providers and Routers.
 * Any concrete provider (e.g. Gemini, Groq, Router) must extend this class and override its methods.
 */

class ILLMProvider {
  constructor() {
    if (new.target === ILLMProvider) {
      throw new TypeError("Cannot construct ILLMProvider instances directly. Implementations must override.");
    }
  }

  /**
   * Generates a structured JSON response from the LLM based on prompts.
   * 
   * @param {string} prompt - Instruction and context text for the model.
   * @param {Object} [options] - Generation options.
   * @returns {Promise<{ data: Object, metadata: Object }>} Parsed JSON data and provider metadata.
   * @abstract
   */
  async generateJSON(prompt, options = {}) {
    throw new Error(`generateJSON() not implemented in sub-class.`);
  }

  /**
   * Generates raw text response from the LLM.
   * 
   * @param {string} prompt - Input prompt text.
   * @param {Object} [options] - Options.
   * @returns {Promise<{ text: string, metadata: Object }>} Plain text output and provider metadata.
   * @abstract
   */
  async generateText(prompt, options = {}) {
    throw new Error(`generateText() not implemented in sub-class.`);
  }
}

module.exports = ILLMProvider;
