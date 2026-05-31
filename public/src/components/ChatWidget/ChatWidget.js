/**
 * ChatWidget Component (Refactored)
 * Coordinates sub-components for chat interface
 *
 * Dependencies:
 * - MessageList: Handles message rendering
 * - ChatInput: Handles user input
 * - TypingIndicator: Shows typing animation
 * - ExampleQuestions: Shows starter suggestions
 */
import { CONFIG } from '../../services/config.js';
import { RatingService } from '../../services/ratingService.js';
import { TrackingService } from '../../services/trackingService.js';
import { buildBookingReminder } from '../../utils/buildBookingReminder.js';
import { chatHistoryStore } from '../../services/ChatHistoryStore.js';
import { MessageList } from './MessageList.js';
import { ChatInput } from './ChatInput.js';
import { TypingIndicator } from './TypingIndicator.js';
import { ExampleQuestions } from '../ExampleQuestions/ExampleQuestions.js';
import { ChatHistory } from '../ChatHistory/ChatHistory.js';
import { LeadCapture } from '../LeadCapture/LeadCapture.js';

export class ChatWidget {
  /**
   * @param {Object} chatService - Chat service instance (ChatOrchestrator)
   */
  constructor(chatService) {
    this.chatService = chatService;

    // Sub-components
    this.messageList = new MessageList();
    this.chatInput = new ChatInput(
      (msg) => this.handleSendMessage(msg),
      () => { this.hideStarters(); this.hideQuickReplies(); }
    );
    this.typingIndicator = new TypingIndicator();
    this.startersComponent = null;
    this.historyPanel = null;
    this.leadCapture = null;

    // State
    this.element = null;
    this.welcomeScreen = null;
    this.startersFixedContainer = null;
    this.quickRepliesContainer = null;
    this.startersShown = false;
    this.isChatEnded = false;
    this.isProcessing = false;
    this.bookingReminderSent = false;
    this.conversationEndedBanner = null;
    this.isViewingHistory = false;
    this.selectedLang = CONFIG.defaultLang || 'en';
  }

  /**
   * Create the chat widget element
   * @returns {HTMLElement}
   */
  create() {
    const widget = document.createElement('div');
    widget.className = 'chat-widget';

    const header = this._buildHeader();
    const messagesContainer = this._buildMessagesArea();
    this._buildStartersAndQuickReplies();
    const inputContainer = this._buildInputWithRestart();
    this.historyPanel = new ChatHistory(
      (chat) => this.loadHistoryChat(chat),
      () => this.historyPanel.hide()
    );
    this.welcomeScreen = this._buildWelcomeScreen();

    widget.appendChild(header);
    widget.appendChild(messagesContainer);
    widget.appendChild(this.startersFixedContainer);
    widget.appendChild(this.quickRepliesContainer);
    widget.appendChild(inputContainer);
    widget.appendChild(this.welcomeScreen);
    this.historyPanel.mount(widget);

    this.leadCapture = new LeadCapture(this.getTranslations(), () => this._showLangScreen());
    this.leadCapture.mount(widget);

    this.element = widget;
    this.setupServiceListeners();

    return widget;
  }

  /** Build chat header with history button and online status */
  _buildHeader() {
    const header = document.createElement('div');
    header.className = 'chat-header';
    header.innerHTML = `
      <div class="chat-header-left">
        <button class="chat-history-btn has-tooltip" data-tooltip="Chat History">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </button>
        <h3>${CONFIG.chatTitle}</h3>
      </div>
      <div class="chat-status">
        <span class="status-dot"></span>
        <span class="status-text">Online</span>
      </div>
    `;

    this.statusDot = header.querySelector('.status-dot');
    this.statusText = header.querySelector('.status-text');
    header.querySelector('.chat-history-btn').addEventListener('click', () => this.toggleHistory());

    return header;
  }

  /** Build the scrollable messages area and bind the booking-reminder hook */
  _buildMessagesArea() {
    const messagesContainer = this.messageList.create();
    this.typingIndicator.setContainer(messagesContainer);

    // Fires the booking reminder once when any calendar button is clicked
    messagesContainer.addEventListener('click', (e) => {
      if (e.target.closest('.outlook-calendar-button')) {
        this.handleBookingButtonClick();
      }
    });

    return messagesContainer;
  }

  /** Build the starters and quick-replies containers (hidden by default) */
  _buildStartersAndQuickReplies() {
    if (CONFIG.chatStarters?.length > 0) {
      this.startersComponent = new ExampleQuestions(
        CONFIG.chatStarters,
        (q) => this.handleStarterClick(q)
      );
    }

    this.startersFixedContainer = document.createElement('div');
    this.startersFixedContainer.className = 'chat-starters-fixed';
    this.startersFixedContainer.style.display = 'none';

    this.quickRepliesContainer = document.createElement('div');
    this.quickRepliesContainer.className = 'quick-replies-container';
    this.quickRepliesContainer.style.display = 'none';
  }

  /** Build chat input container and prepend the restart icon button */
  _buildInputWithRestart() {
    const inputContainer = this.chatInput.create();
    this.inputContainer = inputContainer;

    this.restartIcon = document.createElement('button');
    this.restartIcon.className = 'chat-restart-icon';
    this.restartIcon.style.display = 'none';
    this.restartIcon.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 4v6h6"></path>
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
      </svg>
    `;
    this.restartIcon.addEventListener('click', () => this.handleStartNewConversation());
    inputContainer.insertBefore(this.restartIcon, inputContainer.firstChild);

    return inputContainer;
  }

  /** Build the welcome overlay (language selector + start button) */
  _buildWelcomeScreen() {
    const welcomeScreen = document.createElement('div');
    welcomeScreen.className = 'chat-welcome-screen';
    const t = this.getTranslations();
    welcomeScreen.innerHTML = `
      <div class="welcome-content">
        <div class="welcome-avatar">
          <img src="${CONFIG.baseUrl}/agent-avatar.png" alt="${CONFIG.chatBotName}" />
        </div>
        <h3 class="welcome-title">${t.welcomeTitle}</h3>
        <p class="welcome-subtitle">${t.welcomeSubtitle}</p>
        <div class="welcome-lang-selector">
          <button class="lang-btn selected" data-lang="en">
            <span class="lang-label">English</span>
          </button>
          <button class="lang-btn" data-lang="fr">
            <span class="lang-label">Français</span>
          </button>
        </div>
        <button class="welcome-start-btn">${t.welcomeButton}</button>
      </div>
    `;

    welcomeScreen.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleLanguageChange(btn.dataset.lang));
    });
    welcomeScreen.querySelector('.welcome-start-btn').addEventListener('click', () => {
      this.dismissWelcomeScreen();
    });

    return welcomeScreen;
  }

  /**
   * Setup chat service event listeners
   */
  setupServiceListeners() {
    this.chatService.on('messageReceived', async (message) => {
      // Ignore messages if viewing history (prevents race conditions)
      if (this.isViewingHistory) {
        this.typingIndicator.hide();
        this.setProcessing(false);
        return;
      }

      this.typingIndicator.hide();
      this.hideQuickReplies();

      // Parse quick replies before streaming (so the tag never appears)
      const { cleanText, options } = this.parseQuickReplies(message.content);

      // Stream the clean message word-by-word
      await this.messageList.addBotMessageStreaming(cleanText);
      this.setProcessing(false);

      // Show quick reply chips if options were found
      if (options.length > 0) {
        this.renderQuickReplies(options);
      }

      // Show starters after first bot message (only if no quick replies)
      if (options.length === 0 && this.startersComponent && !this.startersShown) {
        this.renderStarters();
      }
    });

    this.chatService.on('error', (error) => {
      // Ignore errors if viewing history
      if (this.isViewingHistory) {
        this.setProcessing(false);
        return;
      }
      this.messageList.showError(error.message);
      this.setProcessing(false);
    });

    this.chatService.on('chatEnded', () => {
      // Ignore chatEnded if viewing history
      if (this.isViewingHistory) return;
      this.handleChatEnded();
    });

    this.chatService.on('chatCreated', ({ chatId }) => {
      TrackingService.chatStarted({ chatId, lang: this.selectedLang });
    });
  }

  /**
   * Show lead capture screen (step 1 of pre-chat flow).
   * Refreshes content so returning-user check runs against current localStorage.
   */
  showWelcomeScreen() {
    if (this.chatService.isActiveChat() || this.isProcessing) return;
    const t = this.getTranslations();
    this.leadCapture?.refresh(t);
    this.leadCapture?.show();
    this.welcomeScreen?.classList.remove('visible');
  }

  /**
   * Show language selector screen (step 2 of pre-chat flow).
   * Called after lead capture completes.
   */
  _showLangScreen() {
    this.leadCapture?.hide();
    if (this.welcomeScreen) {
      this.welcomeScreen.classList.add('visible');
    }
  }

  /**
   * Hide both the lead screen and the language selector screen.
   */
  hideWelcomeScreen() {
    this.leadCapture?.hide();
    if (this.welcomeScreen) {
      this.welcomeScreen.classList.remove('visible');
    }
  }

  /**
   * Dismiss welcome screen and start chat with selected language
   */
  async dismissWelcomeScreen() {
    this.chatService.setLanguage(this.selectedLang);
    this.updateHeaderForLanguage();
    this.updateStartersForLanguage();
    this.hideWelcomeScreen();
    this.restartIcon.style.display = 'flex';
    this.setOnlineStatus(true);
    await this.sendInitialGreeting();
  }

  /**
   * Get translations for current language
   * @returns {Object} Translation strings
   */
  getTranslations() {
    return CONFIG.i18n?.[this.selectedLang] || CONFIG.i18n?.en || {};
  }

  /**
   * Handle language selection from welcome screen
   * @param {string} lang - Language code ('en' | 'fr')
   */
  handleLanguageChange(lang) {
    this.selectedLang = lang;
    this.updateLangButtonSelection();
    this.updateWelcomeScreenTexts();
  }

  /** Highlight the selected language button */
  updateLangButtonSelection() {
    this.welcomeScreen.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.lang === this.selectedLang);
    });
  }

  /** Update welcome screen texts to match selected language */
  updateWelcomeScreenTexts() {
    const t = this.getTranslations();
    const title = this.welcomeScreen.querySelector('.welcome-title');
    const subtitle = this.welcomeScreen.querySelector('.welcome-subtitle');
    const button = this.welcomeScreen.querySelector('.welcome-start-btn');

    if (title) title.textContent = t.welcomeTitle;
    if (subtitle) subtitle.textContent = t.welcomeSubtitle;
    if (button) button.textContent = t.welcomeButton;
  }

  /** Update header title to match selected language */
  updateHeaderForLanguage() {
    const t = this.getTranslations();
    const headerTitle = this.element?.querySelector('.chat-header-left h3');
    if (headerTitle) headerTitle.textContent = t.chatTitle;
  }

  /** Rebuild starters for selected language */
  updateStartersForLanguage() {
    const t = this.getTranslations();
    if (t.chatStarters?.length > 0) {
      this.startersComponent = new ExampleQuestions(
        t.chatStarters,
        (q) => this.handleStarterClick(q)
      );
      this.startersShown = false;
    }
  }

  /**
   * Send initial greeting when widget opens
   */
  async sendInitialGreeting() {
    if (this.isProcessing || this.chatService.isActiveChat()) return;

    try {
      this.setProcessing(true);
      const shouldReset = this.chatService.shouldResetChat || false;
      await this.chatService.createChat(shouldReset);
      this.chatService.shouldResetChat = false;
      const greeting = this.getTranslations().initialGreeting || 'Hello';
      await this.chatService.sendMessage(greeting, true);
    } catch (error) {
      console.error('Error sending initial greeting:', error);
      this.setProcessing(false);
    }
  }

  /**
   * Handle send message
   * @param {string} message
   */
  async handleSendMessage(message) {
    if (!message || this.isProcessing || this.isChatEnded) return;

    this.hideStarters();
    this.hideQuickReplies();
    this.messageList.addUserMessage(message);
    this.setProcessing(true);

    try {
      if (!this.chatService.isActiveChat()) {
        await this.chatService.createChat();
      }
      await this.chatService.sendMessage(message);
    } catch (error) {
      if (!error.message?.includes('Chat has ended')) {
        this.messageList.showError('Failed to send message. Please try again.');
      }
      this.setProcessing(false);
    }
  }

  /**
   * Handle calendar booking button click — shows a one-time reminder.
   * Message is dynamic based on what contact info the user provided.
   */
  handleBookingButtonClick() {
    if (this.bookingReminderSent || this.isChatEnded) return;
    this.bookingReminderSent = true;

    const lead = this.chatService.getLeadData();
    const t = this.getTranslations();
    this.messageList.addBotMessage(buildBookingReminder(lead, t));
  }

  /**
   * Handle starter question click
   * @param {string} question
   */
  async handleStarterClick(question) {
    if (this.isProcessing || this.isChatEnded) return;
    this.hideStarters();
    await this.handleSendMessage(question);
  }

  /**
   * Handle chat ended
   */
  handleChatEnded() {
    const t = this.getTranslations();
    this.isChatEnded = true;
    this.hideQuickReplies();
    this.chatInput.disable(t.inputEndedPlaceholder);
    this.setOnlineStatus(false);
    this.conversationEndedBanner = this.messageList.showEndedBanner(
      () => this.handleStartNewConversation(),
      t,
      ({ rating, comment }) => this.submitRating(rating, comment)
    );
  }

  /**
   * Submit conversation rating to webhook and mark as rated in history
   * @param {string} rating - 'positive' or 'negative'
   * @param {string} comment - Optional comment
   * @param {string} [chatId] - Override chatId (for history ratings)
   */
  submitRating(rating, comment, chatId = null) {
    const id = chatId || this.chatService.chatId || '';
    RatingService.submit({
      rating,
      comment,
      lang: this.selectedLang,
      chatId: id
    });
    if (id) {
      chatHistoryStore.setRated(id, rating);
    }
  }

  /**
   * Start new conversation
   */
  async handleStartNewConversation() {
    // Reset viewing history flag to accept new messages
    this.isViewingHistory = false;

    this.messageList.cancelStreaming();
    this.clearMessages();
    this.isChatEnded = false;
    this.bookingReminderSent = false;
    this.chatInput.enable();
    this.chatService.reset();
    this.chatService.shouldResetChat = true;
    this.restartIcon.style.display = 'none';
    this.setOnlineStatus(true);
    this.showWelcomeScreen();
  }

  /**
   * Set processing state
   * @param {boolean} processing
   */
  setProcessing(processing) {
    this.isProcessing = processing;
    if (!this.isChatEnded) {
      this.chatInput.setProcessing(processing);
    }
    if (processing) {
      this.typingIndicator.show();
    } else {
      this.typingIndicator.hide();
    }
  }

  renderStarters() {
    // Don't show starters if chat is ended or viewing history
    if (!this.startersComponent || this.startersShown || this.isChatEnded) return;
    this.startersFixedContainer.innerHTML = '';
    this.startersFixedContainer.appendChild(this.startersComponent.render());
    this.startersFixedContainer.style.display = 'block';
    this.startersShown = true;
  }

  hideStarters() {
    if (this.startersFixedContainer) {
      this.startersFixedContainer.style.display = 'none';
      this.startersFixedContainer.innerHTML = '';
    }
  }

  /**
   * Parse [options: A | B | C] from bot message text
   * @param {string} text - Raw message content
   * @returns {{ cleanText: string, options: string[] }}
   */
  parseQuickReplies(text) {
    const match = text.match(/\[options:\s*(.+?)\]/i);
    if (!match) return { cleanText: text, options: [] };

    const cleanText = text.replace(/\[options:\s*.+?\]/i, '').trim();
    const options = match[1].split('|').map(opt => opt.trim()).filter(Boolean);
    return { cleanText, options };
  }

  /**
   * Render quick reply dropdown from bot-provided options
   * @param {string[]} options
   */
  renderQuickReplies(options) {
    if (!this.quickRepliesContainer || this.isChatEnded) return;

    this.quickRepliesContainer.innerHTML = '';

    const dropdown = document.createElement('div');
    dropdown.className = 'quick-reply-dropdown';

    const t = this.getTranslations();
    const trigger = document.createElement('button');
    trigger.className = 'quick-reply-trigger';
    trigger.innerHTML = `
      <span>${t.selectOption || 'Select an option'}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
    trigger.addEventListener('click', () => {
      dropdown.classList.toggle('open');
    });

    const menu = document.createElement('div');
    menu.className = 'quick-reply-menu';

    options.forEach(option => {
      const item = document.createElement('button');
      item.className = 'quick-reply-option';
      item.textContent = option;
      item.addEventListener('click', () => this.handleQuickReplyClick(option));
      menu.appendChild(item);
    });

    dropdown.appendChild(trigger);
    dropdown.appendChild(menu);
    this.quickRepliesContainer.appendChild(dropdown);

    this.quickRepliesContainer.style.display = 'block';
    this.messageList.scrollToBottom();
  }

  /**
   * Hide quick reply dropdown
   */
  hideQuickReplies() {
    if (this.quickRepliesContainer) {
      this.quickRepliesContainer.style.display = 'none';
      this.quickRepliesContainer.innerHTML = '';
    }
  }

  /**
   * Handle quick reply option click
   * @param {string} option - Selected option text
   */
  async handleQuickReplyClick(option) {
    if (this.isProcessing || this.isChatEnded) return;
    this.hideQuickReplies();
    this.hideStarters();
    await this.handleSendMessage(option);
  }

  /**
   * Toggle online/offline status in the header
   * @param {boolean} online
   */
  setOnlineStatus(online) {
    const t = this.getTranslations();
    if (this.statusDot) {
      this.statusDot.classList.toggle('offline', !online);
    }
    if (this.statusText) {
      this.statusText.textContent = online ? t.online : t.offline;
    }
  }

  clearMessages() {
    // Remove the ended banner explicitly if it exists
    if (this.conversationEndedBanner && this.conversationEndedBanner.parentNode) {
      this.conversationEndedBanner.remove();
    }
    this.conversationEndedBanner = null;

    // Clear all messages from the list
    this.messageList.clear();

    // Reset starters and quick replies state
    this.startersShown = false;
    this.hideStarters();
    this.hideQuickReplies();

    // Reset chat state
    this.isChatEnded = false;
  }

  /**
   * Toggle history panel
   */
  toggleHistory() {
    if (this.historyPanel) {
      this.historyPanel.toggle();
    }
  }

  /**
   * Load a chat from history
   * @param {Object} chat - Chat object from history
   */
  loadHistoryChat(chat) {
    // Hide history panel
    this.historyPanel.hide();

    // IMPORTANT: Mark as viewing history to ignore pending async messages
    this.isViewingHistory = true;

    // Mark as ended FIRST to prevent starters from showing
    this.isChatEnded = true;

    // Clear current messages (will also hide starters)
    this.clearMessages();

    // Re-set isChatEnded since clearMessages resets it
    const t = this.getTranslations();
    this.isChatEnded = true;
    this.chatInput.disable(t.inputEndedPlaceholder);

    // Display the historical messages (read-only, strip option tags)
    chat.messages.forEach(msg => {
      if (msg.role === 'user') {
        this.messageList.addUserMessage(msg.content);
      } else {
        const { cleanText } = this.parseQuickReplies(msg.content);
        this.messageList.addBotMessage(cleanText);
      }
    });

    // Show ended banner — include rating only if not already rated
    this.setOnlineStatus(false);
    const alreadyRated = chatHistoryStore.isRated(chat.id);
    this.conversationEndedBanner = this.messageList.showEndedBanner(
      () => this.handleStartNewConversation(),
      t,
      alreadyRated ? null : ({ rating, comment }) => this.submitRating(rating, comment, chat.id)
    );
  }

  mount(parent) {
    parent.appendChild(this.create());
  }

  destroy() {
    this.messageList.cancelStreaming();
    if (!this.chatService.isActiveChat()) {
      this.clearMessages();
    }
  }
}
