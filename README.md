# 🎮 GameBoy AI Player

An intelligent web application that uses AI to play classic Game Boy games. Built with React, TypeScript, and the WasmBoy emulator, powered by OpenRouter's AI models.

![GameBoy AI Player](https://img.shields.io/badge/GameBoy-AI%20Player-green?style=for-the-badge&logo=gameboy)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![WebAssembly](https://img.shields.io/badge/WebAssembly-WasmBoy-purple?style=for-the-badge&logo=webassembly)

![Updated Layout](https://placehold.co/600x400?text=Updated+Layout)
## ✨ Features

### 🎯 **Real Game Boy Emulation**
- **Authentic emulation** using WasmBoy WebAssembly emulator
- Support for Game Boy (.gb) and Game Boy Color (.gbc) ROMs
- Real Game Boy graphics, sound, and gameplay mechanics
- Save state functionality for game progress

### 🤖 **AI Integration**
- **Multiple AI models** via OpenRouter API (Claude 3.5 Sonnet, GPT-4o, Gemini Pro, etc.)
- **Intelligent screen analysis** that understands different game types
- **Real-time decision making** with 2-second intervals
- **Game-specific strategies** for Tetris, platformers, RPGs, and more
- **Button success memory** shared with the AI before each decision

### 🎮 **Interactive Controls**
- **Manual play mode** with keyboard controls
- **AI play mode** with automated gameplay
- **Hybrid mode** - switch between manual and AI control
- **Visual Game Boy controls** with authentic button layout

### 📊 **Monitoring & Debugging**
- **Real-time activity logging** with categorized messages
- **AI decision tracking** and reasoning display
- **Performance monitoring** with status indicators
- **Screen analysis visualization** for debugging

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- OpenRouter API key ([get one here](https://openrouter.ai))
- Game Boy ROM files (.gb or .gbc)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gameboy-ai-player
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### Usage

1. **Configure AI**
   - Add your OpenRouter API key in the control panel
   - Select an AI model (Claude 3.5 Sonnet recommended)
   - Adjust temperature and max tokens as needed

2. **Load a Game**
   - Click "Load ROM" and select a Game Boy file
   - Or try the free homebrew games linked in the app

3. **Play or Watch**
   - **Manual**: Use keyboard controls to play yourself
   - **AI Mode**: Enable AI and press Play to watch it learn
   - **Hybrid**: Switch between modes anytime

## 🎮 Controls

### Keyboard Controls
| Key | Action |
|-----|--------|
| **Arrow Keys** | D-Pad (Up/Down/Left/Right) |
| **Z** | A Button |
| **X** | B Button |
| **Enter** | Start Button |
| **Space** | Select Button |

### Application Shortcuts
| Shortcut | Action |
|----------|--------|
| **Spacebar** | Play/Pause |
| **Escape** | Stop & Reset |
| **Ctrl/Cmd + A** | Toggle AI Mode |

## 🧠 AI Capabilities

### Screen Analysis
The AI analyzes Game Boy screens using advanced computer vision techniques:

- **Game Type Detection**: Automatically identifies Tetris, platformers, RPGs, etc.
- **Visual Pattern Recognition**: Understands game elements like players, enemies, obstacles
- **State Analysis**: Detects menus, dialog boxes, game over screens
- **Pixel Composition**: Analyzes Game Boy's 4-shade display patterns

### Decision Making
- **Context-Aware**: Makes decisions based on game type and current situation
- **Strategic Thinking**: Plans moves ahead for puzzle games like Tetris
- **Adaptive Learning**: Improves performance through trial and error
- **Button Memory**: Remembers which buttons changed the screen successfully
- **Error Recovery**: Handles unexpected situations gracefully

### Supported Game Types
- **🧩 Puzzle Games** (Tetris, Dr. Mario): Strategic piece placement and line clearing
- **🏃 Platformers** (Mario, Metroid): Movement, jumping, obstacle avoidance
- **⚔️ RPGs** (Pokémon, Zelda): Navigation, menu interaction, dialog progression
- **🎯 Action Games**: Real-time combat and movement decisions

## 🛠️ Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **CSS-in-JS** for component styling
- **Lucide React** for icons

### Emulation Layer
- **WasmBoy** - WebAssembly Game Boy emulator
- **AssemblyScript** compiled emulator core
- **Web Audio API** for authentic Game Boy sound
- **Canvas API** for pixel-perfect graphics rendering

### AI Integration
- **OpenRouter API** for multiple AI model access
- **Axios** for HTTP requests with proper error handling
- **Custom screen analysis** algorithms
- **Real-time decision processing** with configurable intervals

### Key Components

```
src/
├── components/
│   ├── GameBoyEmulator.tsx    # WasmBoy integration
│   ├── AIController.tsx       # AI decision engine
│   ├── ControlPanel.tsx       # Configuration UI
│   ├── GameLog.tsx           # Activity monitoring
│   └── GameBoyControls.tsx   # Virtual controls
├── types/
│   └── wasmboy.d.ts          # TypeScript definitions
└── App.tsx                   # Main application
```

## 🎯 Free Test ROMs

Try these free homebrew Game Boy games:

- **[Libbet](https://github.com/pinobatch/libbet)** - Puzzle game perfect for AI testing
- **[µCity](https://github.com/AntonioND/ucity)** - City builder with complex decision making
- **[Shock Lobster](https://github.com/tbsp/shock-lobster)** - Action game for reflex testing

*Note: These are legal homebrew games created by the community.*

## 🔧 Configuration

### AI Models Available
- **Claude 3.5 Sonnet** (Recommended) - Best reasoning and game understanding
- **GPT-4o** - Excellent performance with good speed
- **GPT-4o Mini** - Faster, cost-effective option
- **Gemini Pro** - Google's advanced model
- **Llama 3.1 8B** - Open-source alternative

### Performance Tuning
- **Temperature**: 0.1-0.3 for focused gameplay, 0.7-1.0 for creative exploration
- **Max Tokens**: 500-1000 for quick decisions, 1000+ for complex reasoning
- **Frame Skip**: Adjust emulator performance for slower devices

## 🐛 Troubleshooting

### Common Issues

**Game won't load**
- Ensure ROM file is valid .gb or .gbc format
- Check browser console for error messages
- Try a different ROM file

**AI not responding**
- Verify OpenRouter API key is correct
- Check network connection
- Monitor activity log for error messages

**Performance issues**
- Reduce AI decision frequency
- Lower max tokens setting
- Close other browser tabs

**Audio problems**
- Click anywhere on the page to enable audio context
- Check browser audio permissions
- Ensure speakers/headphones are connected

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

- **New AI strategies** for different game types
- **Enhanced screen analysis** algorithms
- **Save state management** improvements
- **Performance optimizations**
- **Additional emulator features**

## 📄 License

This project is open source. Game Boy is a trademark of Nintendo. This project is for educational and research purposes.

## 🙏 Acknowledgments

- **WasmBoy** - Excellent WebAssembly Game Boy emulator
- **OpenRouter** - AI model access platform
- **Game Boy homebrew community** - Free test ROMs
- **React & TypeScript communities** - Amazing development tools

---

**Made with ❤️ for retro gaming and AI enthusiasts** 
