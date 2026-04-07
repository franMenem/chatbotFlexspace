# FlexSpace Chat Agent

AI-powered chat widget for FlexSpace Logistics. Embeddable chatbot that handles lead qualification, FAQ support, and booking scheduling via Retell AI.

## Features

- **Embeddable chat widget** - Floating button that opens a full chat interface, embeddable on any website
- **Lead capture** - Collects visitor info (name, email, phone) before starting a conversation, with phone validation by country
- **Bilingual support (EN/FR)** - Full i18n with language selector
- **Chat history** - Persists conversations so returning users can continue where they left off
- **Rating system** - Post-conversation feedback with star ratings and comments
- **Booking reminders** - Dynamic reminders when users click calendar links
- **UTM tracking** - Captures UTM parameters for marketing attribution
- **Webhook integrations** - Sends events to n8n workflows (chat started, ratings)

## Architecture

```
flexspace-agent-demo/
├── api/                          # Vercel serverless functions
│   ├── create-chat.js            # Creates Retell chat session
│   ├── send-message.js           # Sends message & gets AI response
│   ├── end-chat.js               # Ends chat session
│   ├── get-chat.js               # Gets chat details
│   └── capture-utm.js            # UTM tracking endpoint
├── public/
│   ├── index.html                # Entry point
│   └── src/
│       ├── app.js                # Main orchestrator
│       ├── components/
│       │   ├── ChatWidget/       # Chat UI (messages, input, typing indicator)
│       │   ├── ChatHistory/      # Conversation history panel
│       │   ├── FloatingChatButton/ # Floating open/close button
│       │   ├── LeadCapture/      # Lead form before chat starts
│       │   ├── WidgetSelector/   # Voice/Chat mode toggle
│       │   └── ExampleQuestions/ # Suggested starter questions
│       ├── services/
│       │   ├── config.js         # App configuration & i18n strings
│       │   ├── chatService.js    # Retell Chat API client
│       │   ├── ChatOrchestrator.js # Chat flow coordination
│       │   ├── ChatStateStore.js # Chat state management
│       │   ├── ChatHistoryStore.js # Conversation persistence
│       │   ├── LeadStore.js      # Lead data persistence
│       │   ├── ratingService.js  # Post-chat rating submission
│       │   ├── trackingService.js # UTM & event tracking
│       │   └── VariableExtractor.js # Extracts variables from AI responses
│       ├── utils/
│       │   ├── EventBus.js       # Pub/sub event system
│       │   ├── buildBookingReminder.js # Booking reminder logic
│       │   └── utm.js            # UTM parameter utilities
│       └── styles/
│           ├── variables.css     # CSS custom properties
│           ├── global.css        # Base styles
│           ├── animations.css    # Keyframe animations
│           └── embed-global.css  # Styles for embedded mode
└── vercel.json                   # Vercel routing & CORS config
```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/franMenem/chatbotFlexspace.git
   cd chatbotFlexspace
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file with your Retell AI credentials:
   ```
   RETELL_API_KEY=your_retell_api_key
   RETELL_AGENT_ID=your_agent_id
   ```

4. **Run locally**
   ```bash
   vercel dev
   ```

## Configuration

The main configuration lives in `public/src/services/config.js`:

- **Chat settings** - Bot name, theme color, auto-open behavior
- **i18n strings** - All UI text in English and French
- **Chat starters** - Suggested questions shown to users
- **Webhook URLs** - n8n endpoints for ratings and tracking

## Tech Stack

- **Frontend**: Vanilla JS (ES6 modules), CSS custom properties
- **Backend**: Vercel Serverless Functions (Node.js)
- **AI**: Retell AI SDK v5
- **Deployment**: Vercel
- **Webhooks**: n8n

## Browser Support

- Chrome/Edge 89+
- Firefox 108+
- Safari 16.4+

## Deployment

```bash
npm install -g vercel
vercel
```

## License

MIT
