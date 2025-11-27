# MB-AI - AI Chatbot Assistant

## Overview
MB-AI is an AI-powered chatbot assistant built with Next.js 16 that helps users make smarter B-school decisions using verified data. It's India's first MBA intelligence assistant, featuring web search capabilities, vector database integration (Pinecone), and content moderation.

## Project Type
- **Framework**: Next.js 16.0.0 (with Turbopack)
- **Language**: TypeScript
- **UI Library**: React 19.2.0
- **Styling**: Tailwind CSS 4
- **AI SDK**: Vercel AI SDK with multiple provider support (OpenAI, DeepSeek, Groq, Fireworks, xAI)

## Project Structure
```
MB-AI/
├── app/                          # Next.js app directory
│   ├── api/chat/                 # Chat API endpoint
│   │   ├── route.ts              # Main chat handler
│   │   └── tools/                # AI tools (web search, vector search)
│   ├── page.tsx                  # Main chat interface
│   ├── parts/                    # UI components
│   └── terms/                    # Terms of Use page
├── components/                   # React components
│   ├── ai-elements/              # AI-specific UI components
│   ├── messages/                 # Message display components
│   └── ui/                       # Reusable UI components (Radix UI)
├── lib/                          # Utility libraries
│   ├── moderation.ts             # Content moderation logic
│   ├── pinecone.ts               # Vector database integration
│   ├── sources.ts                # Source/citation handling
│   └── utils.ts                  # General utilities
├── knowledge_base/               # PDF documents for vector search
├── config.ts                     # Main configuration file
├── prompts.ts                    # AI behavior configuration
└── next.config.ts                # Next.js configuration
```

## Key Features
- Advanced AI chat with GPT-4.1
- Web search integration (Exa API)
- Vector database search (Pinecone)
- Content moderation (OpenAI Moderation API)
- College comparison tools
- Real-time streaming responses
- Citation and source handling

## Configuration Files

### Essential Customization Files
1. **config.ts** - Primary configuration:
   - AI_NAME, OWNER_NAME
   - WELCOME_MESSAGE
   - MODEL settings
   - Pinecone configuration
   - Moderation messages

2. **prompts.ts** - AI behavior:
   - System prompts
   - Tool calling instructions
   - Tone and style
   - Guardrails

### Development Setup
- **Port**: 5000 (configured for Replit webview)
- **Host**: 0.0.0.0 (allows external access)
- **Dev Server**: `npm run dev`
- **Turbopack**: Enabled by default in Next.js 16

## Environment Variables Required
The application requires the following environment variables (see env.template):
- `OPENAI_API_KEY` - Required for AI model and moderation
- `EXA_API_KEY` - Optional, for web search functionality
- `PINECONE_API_KEY` - Optional, for vector database search
- `FIREWORKS_API_KEY` - Optional, for Fireworks AI provider

## Replit-Specific Configuration
- **Next.js Config**: Configured with `allowedDevOrigins: ['*']` to support Replit's iframe-based preview
- **Cache Control**: Headers set to prevent caching issues with the Replit proxy
- **Workflow**: "Start application" runs `npm run dev` on port 5000 with webview output

## Recent Changes
- 2025-11-27: Initial import from GitHub
  - Installed all npm dependencies
  - Configured Next.js for Replit environment (port 5000, host 0.0.0.0)
  - Added allowedDevOrigins and cache control headers
  - Set up workflow for webview preview
  - Verified application loads and runs successfully

## Known Issues
- Hydration mismatch warning in React DevTools (common with SSR, does not affect functionality)
- WebSocket HMR connection may show errors but falls back to polling

## User Preferences
- None documented yet

## Dependencies
Key dependencies include:
- AI SDK providers: OpenAI, DeepSeek, Groq, Fireworks, xAI
- UI: Radix UI components, Lucide icons, Tailwind CSS
- AI tools: Pinecone, Exa (web search)
- Utilities: Zod, date-fns, nanoid, react-hook-form

## Notes
- The application is designed for easy customization via config.ts and prompts.ts
- No backend server needed - API routes handled by Next.js
- Vector database (Pinecone) stores MBA college information and placement reports
- Content moderation runs on all user messages before AI processing
