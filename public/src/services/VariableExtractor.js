/**
 * VariableExtractor - Extracts variables from Retell API responses
 * Single Responsibility: Only handles parsing and extraction logic
 */
export class VariableExtractor {
  /**
   * Priority variables for personalization
   * @type {string[]}
   */
  static PRIORITY_VARS = [
    'first_name', 'last_name', 'email', 'company_name',
    'user_number', 'call_type', 'primary_service_type'
  ];

  /** Status values that indicate a chat is no longer active */
  static ENDED_STATUS = new Set(['ended', 'finished', 'completed', 'error']);

  /** Boolean fields whose `true` value means the chat has ended */
  static ENDED_BOOLEAN_FIELDS = ['ended', 'is_ended', 'finished'];

  /** Timestamp fields whose presence (non-null) means the chat has ended */
  static ENDED_TIMESTAMP_FIELDS = ['ended_at', 'finished_at', 'end_time'];

  /**
   * Extract variables from API response
   * Checks multiple possible locations in Retell AI response
   * @param {Object} data - API response data
   * @returns {Object|null} Extracted variables or null if none found
   */
  extract(data) {
    if (!data || typeof data !== 'object') {
      return null;
    }

    // Check multiple possible locations for variables
    const vars = this.findVariables(data);

    if (!vars) {
      return null;
    }

    // Filter out empty values
    const filtered = {};
    Object.keys(vars).forEach(key => {
      const value = vars[key];
      if (value !== null && value !== undefined && value !== '') {
        filtered[key] = value;
      }
    });

    return Object.keys(filtered).length > 0 ? filtered : null;
  }

  /**
   * Find variables in response data
   * @param {Object} data - API response
   * @returns {Object|null}
   */
  findVariables(data) {
    // Path 1: Direct variables object
    if (data.variables && typeof data.variables === 'object') {
      return data.variables;
    }

    // Path 2: Nested in metadata
    if (data.metadata?.variables && typeof data.metadata.variables === 'object') {
      return data.metadata.variables;
    }

    // Path 3: extracted_variables field
    if (data.extracted_variables && typeof data.extracted_variables === 'object') {
      return data.extracted_variables;
    }

    // Path 4: Nested in state
    if (data.state?.variables && typeof data.state.variables === 'object') {
      return data.state.variables;
    }

    return null;
  }

  /**
   * Check if a variable is a priority variable
   * @param {string} name - Variable name
   * @returns {boolean}
   */
  isPriorityVar(name) {
    return VariableExtractor.PRIORITY_VARS.includes(name);
  }

  /**
   * Extract bot response content from API response
   * @param {Object} data - API response
   * @returns {string} Bot response content
   */
  extractBotResponse(data) {
    // Path 1: Messages array with agent role
    if (Array.isArray(data.messages)) {
      const lastAgentMsg = [...data.messages]
        .reverse()
        .find(msg => msg.role === 'agent' && msg.content);

      if (lastAgentMsg) {
        return lastAgentMsg.content;
      }
    }

    // Path 2: Direct response string
    if (typeof data.response === 'string') {
      return data.response;
    }

    // Path 3: output_text field
    if (typeof data.output_text === 'string') {
      return data.output_text;
    }

    console.warn('⚠️ Unknown Retell response format:', data);
    return 'No response received';
  }

  /**
   * Check if response indicates chat has ended
   * @param {Object|string} data - API response object or error text
   * @returns {boolean}
   */
  isChatEnded(data) {
    if (typeof data === 'string') {
      return /chat (already )?ended/i.test(data);
    }

    if (!data || typeof data !== 'object') return false;

    if (VariableExtractor.ENDED_STATUS.has(data.status)) return true;
    if (VariableExtractor.ENDED_STATUS.has(data.chat_status)) return true;
    if (VariableExtractor.ENDED_BOOLEAN_FIELDS.some(f => data[f] === true)) return true;
    return VariableExtractor.ENDED_TIMESTAMP_FIELDS.some(f => data[f] != null);
  }
}
