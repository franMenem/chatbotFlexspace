/**
 * Chat Agent Application
 * Initializes and coordinates chat widget components
 */
import { ChatWidget } from './components/ChatWidget/ChatWidget.js';
import { FloatingChatButton } from './components/FloatingChatButton/FloatingChatButton.js';
import { ChatOrchestrator } from './services/ChatOrchestrator.js';

class ChatApp {
  constructor() {
    this.chatService = new ChatOrchestrator();
    this.chatContainer = null;
    this.isChatWidgetOpen = false;
    this.components = {};
  }

  /**
   * Initialize the chat application
   */
  init() {
    this.setupComponents();
    this.setupChatService();
  }

  /**
   * Setup chat UI components
   */
  setupComponents() {
    const body = document.body;

    // Chat Widget Container (floating)
    this.chatContainer = document.createElement('div');
    this.chatContainer.className = 'widget-container chat-widget-container';
    this.chatContainer.style.display = 'none'; // Hidden by default
    body.appendChild(this.chatContainer);

    // Chat Widget
    this.components.chatWidget = new ChatWidget(this.chatService);
    this.components.chatWidget.mount(this.chatContainer);

    // Floating Chat Button
    this.components.floatingButton = new FloatingChatButton(
      (isOpen) => this.toggleFloatingChat(isOpen)
    );
    this.components.floatingButton.mount(body);
  }

  /**
   * Setup Chat service callbacks
   */
  setupChatService() {
    // When chat ends (explicitly via endChat()), check if widget is closed to clean up
    this.chatService.on('chatEnded', () => {
      // Only cleanup if widget is closed
      if (!this.isChatWidgetOpen) {
        this.cleanupChatConversation();
      }
    });
  }

  /**
   * Clean up chat conversation (messages, variables, state)
   * Only called when conversation explicitly ended AND widget is closed
   */
  cleanupChatConversation() {
    this.components.chatWidget.clearMessages();
    this.chatService.reset();
    // Force reset server-side chat cache on next creation
    this.chatService.shouldResetChat = true;
  }

  /**
   * Toggle floating chat widget
   * @param {boolean} isOpen - Is chat open
   */
  async toggleFloatingChat(isOpen) {
    this.isChatWidgetOpen = isOpen;

    if (isOpen) {
      // Show floating UI
      this.chatContainer.classList.add('floating');
      this.chatContainer.style.display = 'flex';
      
      // Welcome screen is visible by default.
      // If there IS an active chat, hide it so chat resumes directly.
      if (this.chatService.isActiveChat()) {
        this.components.chatWidget.hideWelcomeScreen();
      }
    } else {
      this.chatContainer.classList.remove('floating');
      this.chatContainer.style.display = 'none';

      // Always save to history when widget closes (if there are messages)
      // This ensures conversations are saved even if Retell hasn't marked them as ended
      if (this.chatService.messages && this.chatService.messages.length > 0) {
        this.chatService.saveToHistory();
      }

      // When widget closes, check if chat has ended in Retell AI
      // This detects automatic chat termination (e.g., after inactivity)
      if (this.chatService.isActiveChat()) {
        try {
          await this.chatService.checkIfChatEnded();
        } catch (error) {
          // On error, assume chat is still active
        }
      }
    }
  }
}

// Initialize chat app when DOM is ready
// Support both normal page load and dynamic injection (embed.js)
// When loaded via embed.js, DOMContentLoaded may have already fired
function initApp() {
  const chatApp = new ChatApp();
  chatApp.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
