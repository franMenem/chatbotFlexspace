/**
 * ChatOrchestrator - Coordinates chat operations across injected dependencies:
 *  - RetellApiClient: HTTP communication
 *  - ChatStateStore: state management
 *  - EventBus: event pub/sub
 *  - VariableExtractor: response parsing
 */
import { EventBus } from '../utils/EventBus.js';
import { RetellApiClient } from './RetellApiClient.js';
import { ChatStateStore } from './ChatStateStore.js';
import { VariableExtractor } from './VariableExtractor.js';
import { chatHistoryStore } from './ChatHistoryStore.js';
import { CONFIG } from './config.js';
import { getUtmParams } from '../utils/utm.js';
import { LeadStore } from './LeadStore.js';

export class ChatOrchestrator {
  /**
   * @param {RetellApiClient} [apiClient]
   * @param {ChatStateStore} [stateStore]
   * @param {EventBus} [eventBus]
   * @param {VariableExtractor} [extractor]
   */
  constructor(
    apiClient = new RetellApiClient(),
    stateStore = new ChatStateStore(),
    eventBus = new EventBus(),
    extractor = new VariableExtractor()
  ) {
    this.apiClient = apiClient;
    this.state = stateStore;
    this.events = eventBus;
    this.extractor = extractor;
    this.selectedLang = CONFIG.defaultLang || 'en';
  }

  /**
   * Set language for next chat session
   * @param {string} lang - Language code ('en' | 'fr')
   */
  setLanguage(lang) {
    this.selectedLang = lang;
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    this.events.on(event, callback);
  }

  /**
   * Create a new chat session
   * @param {boolean} [resetChat=false] - Force reset server-side cache
   * @returns {Promise<string>} Chat ID
   */
  async createChat(resetChat = false) {
    try {
      const utm = getUtmParams();
      const leadData = LeadStore.get() || {};
      const data = await this.apiClient.createChat(resetChat, this.selectedLang, utm, leadData);

      this.state.initChat(data.chat_id);

      // Fire-and-forget: store UTMs for Retell custom function retrieval
      this.apiClient.captureUtm(data.chat_id, utm);

      this.events.emit('chatCreated', { chatId: data.chat_id });
      return data.chat_id;

    } catch (error) {
      console.error('❌ Error creating chat:', error);
      this.events.emit('error', error);
      throw error;
    }
  }

  /**
   * Send a message and get response
   * @param {string} message - User message
   * @param {boolean} [skipUserMessage=false] - Skip adding user message to history
   * @returns {Promise<Object>} Chat completion response
   */
  async sendMessage(message, skipUserMessage = false) {
    if (!this.state.isActiveChat()) {
      throw new Error('No active chat session. Create a chat first.');
    }

    try {
      if (!skipUserMessage && message.trim() !== '') {
        const userMessage = this.state.addMessage('user', message);
        this.events.emit('messageSent', userMessage);
      }

      const data = await this.apiClient.sendMessage(this.state.chatId, message);

      if (this.extractor.isChatEnded(data)) {
        this.saveToHistory();
        this.state.setEnded();
        this.events.emit('chatEnded', { chatId: this.state.chatId, autoEnded: true });
      }

      const vars = this.extractor.extract(data);
      if (vars) {
        Object.entries(vars).forEach(([key, value]) => {
          this.state.setVariable(key, value);
        });
        this.events.emit('variablesUpdated', this.state.variables);
      }

      const botContent = this.extractor.extractBotResponse(data);
      const botMessage = this.state.addMessage('agent', botContent);

      // Simulates natural typing latency
      const delay = CONFIG.responseDelay || 0;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      this.events.emit('messageReceived', botMessage);

      // Proactive end-check covers cases where backend marks ended after the response
      setTimeout(() => {
        if (this.state.isActive) {
          this.checkIfChatEnded().catch(err => {
            console.warn('⚠️ Error checking chat status:', err);
          });
        }
      }, 500);

      return data;

    } catch (error) {
      console.error('❌ Error sending message:', error);

      if (this.extractor.isChatEnded(error.message || '')) {
        this.saveToHistory();
        this.state.setEnded();
        this.events.emit('chatEnded', { chatId: this.state.chatId, autoEnded: true });
      } else {
        this.events.emit('error', error);
      }

      throw error;
    }
  }

  /**
   * Check if chat has ended according to Retell AI
   * @returns {Promise<boolean>}
   */
  async checkIfChatEnded() {
    if (!this.state.chatId || !this.state.isActive) {
      return false;
    }

    // Skip immediately-after-creation checks to avoid false 404s
    if (this.state.isRecentlyCreated(2000)) {
      return false;
    }

    try {
      const chatDetails = await this.apiClient.getChatDetails(this.state.chatId);

      if (this.extractor.isChatEnded(chatDetails)) {
        this.saveToHistory();
        this.state.setEnded();
        this.events.emit('chatEnded', { chatId: this.state.chatId, autoEnded: true });
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking if chat ended:', error);
      return false;
    }
  }

  /** @returns {string|null} */
  get chatId() {
    return this.state.chatId;
  }

  /** @returns {Array} */
  get messages() {
    return this.state.messages;
  }

  /** @returns {boolean} */
  get shouldResetChat() {
    return this.state.shouldResetChat;
  }

  /** @param {boolean} value */
  set shouldResetChat(value) {
    this.state.shouldResetChat = value;
  }

  /**
   * Check if chat is active
   * @returns {boolean}
   */
  isActiveChat() {
    return this.state.isActiveChat();
  }

  /**
   * Reset the service state (saves to history first if there are messages)
   */
  reset() {
    this.saveToHistory();
    this.state.reset();
  }

  /**
   * Save current chat to history (no-op if there are no messages)
   */
  saveToHistory() {
    if (this.state.messages.length > 0) {
      chatHistoryStore.saveChat(
        this.state.chatId,
        this.state.messages,
        this.state.variables
      );
    }
  }

  /**
   * Get lead contact data captured during pre-chat flow.
   * @returns {{ first_name: string, last_name: string, email: string, phone: string } | null}
   */
  getLeadData() {
    return LeadStore.get();
  }
}
