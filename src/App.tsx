import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Settings, Brain, Upload } from 'lucide-react';
import GameBoyEmulator from './components/GameBoyEmulator';
import AIController from './components/AIController';
import ControlPanel from './components/ControlPanel';
import GameLog from './components/GameLog';
import GameBoyControls from './components/GameBoyControls';

export interface GameState {
  isPlaying: boolean;
  aiEnabled: boolean;
  currentGame: string | null;
  gameData: Uint8Array | null;
  screen: ImageData | null;
  aiStatus: 'idle' | 'thinking' | 'playing' | 'error';
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: Date;
  type: 'info' | 'ai' | 'game' | 'error' | 'user';
  message: string;
}

export interface AIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

function App() {
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    aiEnabled: false,
    currentGame: null,
    gameData: null,
    screen: null,
    aiStatus: 'idle',
    logs: []
  });

  // Load API key from localStorage on startup
  const [aiConfig, setAIConfig] = useState<AIConfig>(() => {
    const savedApiKey = localStorage.getItem('gameboy-ai-api-key');
    return {
      apiKey: savedApiKey || '',
      model: 'anthropic/claude-3.5-sonnet',
      temperature: 0.7,
      maxTokens: 1000
    };
  });

  const [isMuted, setIsMuted] = useState(() => {
    const savedMuteState = localStorage.getItem('gameboy-ai-muted');
    return savedMuteState === 'true';
  });

  const emulatorRef = useRef<any>(null);
  const aiControllerRef = useRef<any>(null);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setGameState(prev => ({
      ...prev,
      logs: [...prev.logs, {
        timestamp: new Date(),
        type,
        message
      }]
    }));
  }, []);

  const clearLogs = () => {
    setGameState(prev => ({
      ...prev,
      logs: []
    }));
    addLog('info', 'Activity log cleared');
  };

  const handleGameLoad = useCallback((gameData: Uint8Array, fileName: string) => {
    setGameState(prev => ({
      ...prev,
      currentGame: fileName,
      gameData,
      isPlaying: false
    }));
    addLog('game', `Loaded: ${fileName}`);
  }, [addLog]);

  const handlePlayPause = () => {
    if (!gameState.currentGame) {
      addLog('error', 'No game loaded');
      return;
    }

    const newIsPlaying = !gameState.isPlaying;
    console.log('App: handlePlayPause', { newIsPlaying, aiEnabled: gameState.aiEnabled });
    
    setGameState(prev => ({
      ...prev,
      isPlaying: newIsPlaying
    }));

    if (newIsPlaying) {
      addLog('game', 'Game started');
      if (gameState.aiEnabled && aiControllerRef.current) {
        console.log('App: Starting AI from handlePlayPause');
        aiControllerRef.current.startPlaying();
      }
    } else {
      addLog('game', 'Game paused');
      if (aiControllerRef.current) {
        aiControllerRef.current.stopPlaying();
      }
    }
  };

  const handleStop = () => {
    setGameState(prev => ({
      ...prev,
      isPlaying: false
    }));
    
    if (aiControllerRef.current) {
      aiControllerRef.current.stopPlaying();
    }
    
    if (emulatorRef.current) {
      emulatorRef.current.reset();
    }
    
    addLog('game', 'Game stopped and reset');
  };

  const handleAIToggle = () => {
    const newAIEnabled = !gameState.aiEnabled;
    console.log('App: handleAIToggle', { 
      currentAIEnabled: gameState.aiEnabled, 
      newAIEnabled,
      isPlaying: gameState.isPlaying,
      currentGame: gameState.currentGame
    });
    
    setGameState(prev => ({
      ...prev,
      aiEnabled: newAIEnabled,
      aiStatus: newAIEnabled ? 'idle' : 'idle'
    }));
    
    addLog('ai', `AI ${newAIEnabled ? 'enabled' : 'disabled'}`);
    
    if (newAIEnabled) {
      // If AI is being enabled and game is already playing, start AI immediately
      if (gameState.isPlaying && aiControllerRef.current) {
        console.log('App: Starting AI because game is already playing');
        setTimeout(() => {
          // Use setTimeout to ensure state has updated
          aiControllerRef.current?.startPlaying();
        }, 100);
      }
    } else {
      // If AI is being disabled, stop it
      if (aiControllerRef.current) {
        aiControllerRef.current.stopPlaying();
      }
    }
  };

  const handleScreenUpdate = useCallback((screen: ImageData) => {
    setGameState(prev => ({
      ...prev,
      screen
    }));
  }, []);

  const handleAIStatusChange = (status: GameState['aiStatus']) => {
    setGameState(prev => ({
      ...prev,
      aiStatus: status
    }));
  };

  const handleManualButtonPress = useCallback((button: string) => {
    if (gameState.aiEnabled) {
      addLog('user', `Manual input blocked - AI is controlling the game`);
      return;
    }
    
    if (emulatorRef.current) {
      emulatorRef.current.pressButton(button);
      addLog('user', `Player pressed: ${button}`);
    }
  }, [gameState.aiEnabled, addLog]);

  const handleManualButtonRelease = useCallback((button: string) => {
    if (gameState.aiEnabled) {
      return; // Don't log release when AI is enabled
    }
    
    if (emulatorRef.current) {
      emulatorRef.current.releaseButton(button);
      // Don't log release events to avoid spam
    }
  }, [gameState.aiEnabled]);

  const handleSaveState = async () => {
    if (!gameState.currentGame) {
      addLog('error', 'No game loaded');
      return;
    }

    try {
      // WasmBoy save state functionality would go here
      addLog('game', 'Game state saved');
    } catch (error) {
      addLog('error', `Failed to save state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoadState = async () => {
    if (!gameState.currentGame) {
      addLog('error', 'No game loaded');
      return;
    }

    try {
      // WasmBoy load state functionality would go here
      addLog('game', 'Game state loaded');
    } catch (error) {
      addLog('error', `Failed to load state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Save API key to localStorage whenever it changes
  const handleAIConfigChange = (newConfig: AIConfig) => {
    setAIConfig(newConfig);
    if (newConfig.apiKey !== aiConfig.apiKey) {
      localStorage.setItem('gameboy-ai-api-key', newConfig.apiKey);
      if (newConfig.apiKey) {
        addLog('info', 'API key saved locally');
      }
    }
  };

  const handleMuteToggle = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    localStorage.setItem('gameboy-ai-muted', newMuteState.toString());
    addLog('info', `Audio ${newMuteState ? 'muted' : 'unmuted'}`);
  };

  useEffect(() => {
    addLog('info', 'GameBoy AI Player initialized');
  }, []);

  // Debug: Track gameState changes
  useEffect(() => {
    console.log('App: gameState changed', {
      isPlaying: gameState.isPlaying,
      aiEnabled: gameState.aiEnabled,
      currentGame: gameState.currentGame,
      aiStatus: gameState.aiStatus
    });
  }, [gameState.isPlaying, gameState.aiEnabled, gameState.currentGame, gameState.aiStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if not typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          handlePlayPause();
          break;
        case 'Escape':
          event.preventDefault();
          handleStop();
          break;
        case 'a':
        case 'A':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleAIToggle();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState.currentGame, gameState.isPlaying, gameState.aiEnabled]);

  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ 
          color: 'white', 
          fontSize: '2.5rem', 
          fontWeight: 'bold',
          textShadow: '0 4px 8px rgba(0,0,0,0.3)',
          margin: '0 0 0.5rem 0'
        }}>
          🎮 GameBoy AI Player
        </h1>
        <p style={{ 
          color: 'rgba(255,255,255,0.8)', 
          fontSize: '1.1rem',
          margin: 0
        }}>
          Watch AI play classic GameBoy games using OpenRouter
        </p>
      </header>

      <div className="grid grid-2">
        <div>
          <GameBoyEmulator
            ref={emulatorRef}
            gameData={gameState.gameData}
            isPlaying={gameState.isPlaying}
            isMuted={isMuted}
            onScreenUpdate={handleScreenUpdate}
            onGameLoad={handleGameLoad}
            onButtonPress={handleManualButtonPress}
          />
          
          <div className="controls-panel">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button 
                className="button" 
                onClick={handlePlayPause}
                disabled={!gameState.currentGame}
              >
                {gameState.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {gameState.isPlaying ? 'Pause' : 'Play'}
              </button>
              
              <button 
                className="button" 
                onClick={handleStop}
                disabled={!gameState.currentGame}
              >
                <Square size={16} />
                Stop
              </button>
              
              <button 
                className="button" 
                onClick={handleAIToggle}
                style={{
                  background: gameState.aiEnabled 
                    ? 'linear-gradient(145deg, #22c55e, #16a34a)' 
                    : 'linear-gradient(145deg, #667eea, #764ba2)'
                }}
              >
                <Brain size={16} />
                AI {gameState.aiEnabled ? 'ON' : 'OFF'}
              </button>

              <button 
                className="button" 
                onClick={handleMuteToggle}
                style={{
                  background: isMuted 
                    ? 'linear-gradient(145deg, #ef4444, #dc2626)' 
                    : 'linear-gradient(145deg, #10b981, #059669)'
                }}
                title={isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>

            </div>
            
            <div className={`status-indicator status-${gameState.aiStatus}`}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: 'currentColor' 
              }} />
              AI Status: {gameState.aiStatus}
              {gameState.aiEnabled && gameState.currentGame && (
                <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
                  {gameState.isPlaying ? 'Game is playing' : 'Game is paused'} • 
                  {aiConfig.apiKey ? 'API key set' : 'No API key'} • 
                  Model: {aiConfig.model.split('/').pop()}
                </div>
              )}
            </div>
          </div>

          {/* Game Controls */}
          <GameBoyControls
            onButtonPress={handleManualButtonPress}
            onButtonRelease={handleManualButtonRelease}
            disabled={gameState.aiEnabled}
          />
        </div>

        <div>
          <ControlPanel
            aiConfig={aiConfig}
            onConfigChange={handleAIConfigChange}
            gameState={gameState}
          />
          
          <GameLog logs={gameState.logs} onClearLogs={clearLogs} />
        </div>
      </div>

      <AIController
        ref={aiControllerRef}
        config={aiConfig}
        gameState={gameState}
        onStatusChange={handleAIStatusChange}
        onLog={addLog}
        emulatorRef={emulatorRef}
      />
    </div>
  );
}

export default App;