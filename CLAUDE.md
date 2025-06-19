# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GameBoy AI Player - a React/TypeScript web application that uses AI to play classic Game Boy games. The app integrates WasmBoy (WebAssembly Game Boy emulator) with OpenRouter's AI models to create an intelligent game-playing system.

## Development Commands

- **Start development server**: `npm run dev` (runs on port 3000)
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
- **Lint code**: `npm run lint`
- **Type checking**: `npm run typecheck`

## Architecture

### Core Components Structure
- **App.tsx**: Main application with tab navigation (Game/Settings/Log) and state orchestration
- **GameBoyEmulator.tsx**: WasmBoy integration for Game Boy emulation
- **AIController.tsx**: AI decision engine that analyzes screens and makes button decisions
- **ControlPanel.tsx**: Main control interface for AI configuration and game controls
- **SettingsPanel.tsx**: Detailed AI model configuration
- **GameLog.tsx**: Activity monitoring and debugging output

### State Management (Zustand)
- **gameStore.ts**: Central game state, AI config, logs, and usage statistics
- **buttonMemoryStore.ts**: Tracks successful button press patterns for each game
- **romMemoryStore.ts**: Persistent storage of button memories per ROM
- **actionMemoryStore.ts**: Records AI actions and outcomes for learning

### Storage & Memory System
- **IndexedDB integration** via `idb` for persistent ROM-specific memories
- **Button success tracking**: AI learns which buttons produce screen changes
- **ROM identification**: Uses SHA-256 hashing for unique ROM identification
- **Persistent AI configuration**: API keys and model settings stored locally

### AI Integration Flow
1. Screen capture from WasmBoy emulator (ImageData)
2. Convert to base64 for AI vision analysis
3. Include button memory context and game-specific strategies
4. AI responds with button press decisions and reasoning
5. Execute button presses and record success/failure
6. Update memory stores for future decisions

### Key Technical Details
- **WasmBoy emulator**: Provides authentic Game Boy emulation via WebAssembly
- **OpenRouter API**: Supports multiple AI models (Claude, GPT-4, Gemini, etc.)
- **Vision analysis**: AI analyzes actual Game Boy screen pixels for decision making
- **Rate limiting**: Built-in API rate limiting with exponential backoff
- **Memory persistence**: ROM-specific learning data survives browser sessions

## Important Implementation Notes

### AI Decision Engine
- Uses 2-second intervals for AI decisions by default
- Implements vision failure fallback (switches to text mode after repeated vision API failures)
- Tracks consecutive errors and implements exponential backoff
- Records button success rates to improve future decisions

### Game Boy Integration
- Supports both .gb and .gbc ROM formats
- Handles save states and authentic Game Boy audio/video
- Manual keyboard controls work alongside AI controls
- Real-time screen capture for AI analysis

### Error Handling Patterns
- Network request failures trigger automatic retries with backoff
- Vision API failures fall back to text-based analysis
- Invalid ROM files are handled gracefully
- Memory store failures don't crash the application