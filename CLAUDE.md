# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a hybrid Chrome extension and Next.js application called "Discord Design Assistant" - an AI-powered graphic design assistant for Discord users that uses Google's Gemini API for design generation.

## Architecture
The project combines two distinct architectures:

### Chrome Extension (Primary)
- **manifest.json**: Manifest V3 extension configuration for Discord integration
- **background.js**: Service worker handling API calls and message routing
- **content.js**: Injected script running on Discord pages for message analysis
- **popup.js/popup.html**: Extension popup interface for settings
- **message-processor.js**: Advanced message analysis system for design requests
- **design-generator.js**: AI-powered design generation using Google's Gemini API

### Next.js App (Secondary)
- **app/**: Next.js 14 app directory with TypeScript
- **components/**: React components using Radix UI and Tailwind CSS
- **hooks/**: Custom React hooks (use-mobile.ts, use-toast.ts)
- **lib/**: Utility functions

## Development Commands

### Next.js Development
```bash
npm run dev          # Start Next.js development server
npm run build        # Build Next.js application
npm start            # Start production Next.js server
npm run lint         # Run Next.js linter
```

### Chrome Extension Development
No specific build commands - the extension files are used directly. Load the extension in Chrome developer mode pointing to the project root.

## Key Components

### Extension Core Classes
- **MessageProcessor**: Analyzes Discord messages for design requirements, categories, urgency, and sentiment
- **DesignGenerator**: Handles AI-powered design generation with templates for logos, social media, business cards, web design, and packaging

### Extension Flow
1. Content script monitors Discord chat channels
2. MessageProcessor analyzes incoming design requests
3. DesignGenerator creates design briefs using Gemini API
4. Results displayed in injected design panel within Discord interface

## Discord Integration
### DOM Selectors Used
- **Message containers**: `[class*="message-"]`, `[class*="messageListItem-"]`, `[id*="chat-messages-"]`
- **Message content**: `[class*="messageContent-"]`, `[class*="markup-"]`
- **Chat containers**: `[class*="chatContent-"]`, `[class*="messagesWrapper-"]`, `[class*="scroller-"]`

### Activation Conditions
- Extension activates on Discord channels: URLs containing `/channels/`
- Monitors real-time message updates using MutationObserver
- Processes both new and existing messages for design requests

## Configuration
- **API Key**: Google Gemini API key stored in Chrome extension storage
- **Auto-generate**: Toggle for automatic design generation
- **Permissions**: activeTab, storage, scripting for discord.com

## Tech Stack
- **Extension**: Vanilla JavaScript (ES6), Chrome Extensions API
- **Next.js**: React 18, TypeScript, Tailwind CSS v4, Radix UI
- **AI Integration**: Google Gemini 2.0 Flash API
- **Styling**: Tailwind CSS with custom animations, PostCSS