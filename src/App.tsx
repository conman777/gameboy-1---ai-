import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Brain } from 'lucide-react';
import GameBoyEmulator, { GameBoyEmulatorRef } from './components/GameBoyEmulator';
import AIController, { AIControllerRef } from './components/AIController';
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

  const emulatorRef = useRef<GameBoyEmulatorRef>(null);
  const aiControllerRef = useRef<AIControllerRef>(null);

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
    setGameState(prev => ({ ...prev, logs: [] }));
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
    console.log(`[MANUAL TEST] App: handlePlayPause -> newIsPlaying: ${newIsPlaying}, current AI Enabled: ${gameState.aiEnabled}`);
    addLog('info', `App: handlePlayPause -> isPlaying: ${newIsPlaying}`);
    setGameState(prev => ({ ...prev, isPlaying: newIsPlaying }));

    if (!newIsPlaying && aiControllerRef.current) {
        console.log(`[MANUAL TEST] App: handlePlayPause -> Manually stopping AI due to pause. AI Enabled: ${gameState.aiEnabled}`);
        addLog('info', `App: handlePlayPause -> Manually stopping AI due to pause`);
        aiControllerRef.current.stopPlaying();
    }
  };

  const handleStop = () => {
    console.log(`[MANUAL TEST] App: handleStop called. AI Enabled: ${gameState.aiEnabled}`);
    addLog('info', `App: handleStop called`);
    setGameState(prev => ({ ...prev, isPlaying: false }));
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
    console.log(`[MANUAL TEST] App: handleAIToggle -> newAIEnabled: ${newAIEnabled}`);
    addLog('info', `App: handleAIToggle -> aiEnabled: ${newAIEnabled}`);
    setGameState(prev => ({
      ...prev,
      aiEnabled: newAIEnabled,
      aiStatus: newAIEnabled ? 'idle' : 'idle'
    }));
    if (!newAIEnabled && aiControllerRef.current) {
        console.log(`[MANUAL TEST] App: handleAIToggle -> Manually stopping AI. Current isPlaying: ${gameState.isPlaying}`);
        addLog('info', `App: handleAIToggle -> Manually stopping AI`);
        aiControllerRef.current.stopPlaying();
    }
  };

  const handleScreenUpdate = useCallback((screen: ImageData) => {
    setGameState(prev => ({ ...prev, screen }));
  }, []);

  const handleAIStatusChange = (status: GameState['aiStatus']) => {
    setGameState(prev => ({ ...prev, aiStatus: status }));
  };

  const handleManualButtonPress = useCallback((button: string) => {
    console.log(`[MANUAL TEST] Press: ${button}, AI Enabled: ${gameState.aiEnabled}`);
    if (gameState.aiEnabled) {
      addLog('user', `User: Manual input BLOCKED (AI active) - ${button}`);
      return;
    }
    if (emulatorRef.current) {
      console.log(`[MANUAL TEST] App: Forwarding press ${button} to emulatorRef`);
      addLog('user', `User: Manual press -> ${button}`);
      emulatorRef.current.pressButton(button);
    }
  }, [gameState.aiEnabled, addLog]);

  const handleManualButtonRelease = useCallback((button: string) => {
    console.log(`[MANUAL TEST] Release: ${button}, AI Enabled: ${gameState.aiEnabled}`);
    if (gameState.aiEnabled) {
      // No log for blocked release to avoid spam, but good for testing here
      console.log(`[MANUAL TEST] App: Manual release ${button} BLOCKED (AI active)`);
      return;
    }
    if (emulatorRef.current) {
      console.log(`[MANUAL TEST] App: Forwarding release ${button} to emulatorRef`);
      addLog('user', `User: Manual release -> ${button}`);
      emulatorRef.current.releaseButton(button);
    }
  }, [gameState.aiEnabled, addLog]);

  const handleAIConfigChange = (newConfig: AIConfig) => {
    setAIConfig(newConfig);
    if (newConfig.apiKey !== aiConfig.apiKey) {
      localStorage.setItem('gameboy-ai-api-key', newConfig.apiKey);
      if (newConfig.apiKey) addLog('info', 'API key saved locally');
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
  }, [addLog]);

  useEffect(() => {
    console.log(`[MANUAL TEST] App: AI Control useEffect triggered. AI Enabled: ${gameState.aiEnabled}, Is Playing: ${gameState.isPlaying}, Game: ${gameState.currentGame}`);
    if (gameState.aiEnabled && gameState.isPlaying && gameState.currentGame && aiControllerRef.current) {
      addLog('info', 'App: useEffect -> STARTING AI (due to state change)');
      aiControllerRef.current.startPlaying();
    } else if ((!gameState.aiEnabled || !gameState.isPlaying) && aiControllerRef.current) {
      addLog('info', 'App: useEffect -> STOPPING AI (due to state change or game not playing)');
      aiControllerRef.current.stopPlaying();
    }
  }, [gameState.aiEnabled, gameState.isPlaying, gameState.currentGame]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      switch (event.key) {
        case ' ': event.preventDefault(); handlePlayPause(); break;
        case 'Escape': event.preventDefault(); handleStop(); break;
        case 'a': case 'A': if (event.ctrlKey || event.metaKey) { event.preventDefault(); handleAIToggle(); } break;
        default: break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gameState.currentGame, gameState.isPlaying, gameState.aiEnabled, handlePlayPause, handleStop, handleAIToggle]);

  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', textShadow: '0 4px 8px rgba(0,0,0,0.3)', margin: '0 0 0.5rem 0' }}>
          🎮 GameBoy AI Player
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', margin: 0 }}>
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
          />
          <div className="controls-panel">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button className="button" onClick={handlePlayPause} disabled={!gameState.currentGame}>
                {gameState.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {gameState.isPlaying ? 'Pause' : 'Play'}
              </button>
              <button className="button" onClick={handleStop} disabled={!gameState.currentGame}>
                <Square size={16} /> Stop
              </button>
              <button className="button" onClick={handleAIToggle} style={{ background: gameState.aiEnabled ? 'linear-gradient(145deg, #22c55e, #16a34a)' : 'linear-gradient(145deg, #667eea, #764ba2)' }}>
                <Brain size={16} /> AI {gameState.aiEnabled ? 'ON' : 'OFF'}
              </button>
              <button className="button" onClick={handleMuteToggle} style={{ background: isMuted ? 'linear-gradient(145deg, #ef4444, #dc2626)' : 'linear-gradient(145deg, #10b981, #059669)' }} title={isMuted ? 'Unmute audio' : 'Mute audio'}>
                {isMuted ? '🔇' : '🔊'}
              </button>
            </div>
            <div className={`status-indicator status-${gameState.aiStatus}`}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
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
          <GameBoyControls
            onButtonPress={handleManualButtonPress}
            onButtonRelease={handleManualButtonRelease}
            disabled={gameState.aiEnabled}
          />
        </div>
        <div>
          <ControlPanel aiConfig={aiConfig} onConfigChange={handleAIConfigChange} gameState={gameState} />
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