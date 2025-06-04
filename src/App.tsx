import { useEffect, useRef } from 'react';
import { Play, Pause, Square, Brain } from 'lucide-react';
import GameBoyEmulator, { GameBoyEmulatorRef } from './components/GameBoyEmulator';
import AIController, { AIControllerRef } from './components/AIController';
import ControlPanel from './components/ControlPanel';
import GameLog from './components/GameLog';
import GameBoyControls from './components/GameBoyControls';
import { APP_VERSION } from "./version";
import { useGameStore, type GameState, type AIConfig } from './store/gameStore';

function App() {
  const {
    isPlaying,
    aiEnabled,
    currentGame,
    gameData,
    aiStatus,
    logs,
    isMuted,
    aiConfig,
    loadGame,
    togglePlayPause,
    stopGame,
    toggleAI,
    toggleMute,
    addLog,
    clearLogs,
    updateAIConfig,
    setAIStatus
  } = useGameStore();

  const emulatorRef = useRef<GameBoyEmulatorRef>(null);
  const aiControllerRef = useRef<AIControllerRef>(null);
  const screenRef = useRef<ImageData | null>(null);

  const handleGameLoad = (gameData: Uint8Array, fileName: string) => {
    loadGame(gameData, fileName);
  };

  const handleScreenUpdate = (screen: ImageData) => {
    screenRef.current = screen;
  };

  const handleManualButtonPress = (button: string) => {
    console.log(`[MANUAL TEST] Press: ${button}, AI Enabled: ${aiEnabled}`);
    if (aiEnabled) {
      addLog('user', `User: Manual input BLOCKED (AI active) - ${button}`);
      return;
    }
    if (emulatorRef.current) {
      console.log(`[MANUAL TEST] App: Forwarding press ${button} to emulatorRef`);
      addLog('user', `User: Manual press -> ${button}`);
      emulatorRef.current.pressButton(button);
    }
  };

  const handleManualButtonRelease = (button: string) => {
    console.log(`[MANUAL TEST] Release: ${button}, AI Enabled: ${aiEnabled}`);
    if (aiEnabled) {
      console.log(`[MANUAL TEST] App: Manual release ${button} BLOCKED (AI active)`);
      return;
    }
    if (emulatorRef.current) {
      console.log(`[MANUAL TEST] App: Forwarding release ${button} to emulatorRef`);
      addLog('user', `User: Manual release -> ${button}`);
      emulatorRef.current.releaseButton(button);
    }
  };

  const handleAIConfigChange = (newConfig: AIConfig) => {
    updateAIConfig(newConfig);
  };

  const handleAIStatusChange = (status: GameState['aiStatus']) => {
    setAIStatus(status);
  };

  useEffect(() => {
    addLog('info', 'GameBoy AI Player initialized');
  }, [addLog]);

  useEffect(() => {
    console.log(`[MANUAL TEST] App: AI Control useEffect triggered. AI Enabled: ${aiEnabled}, Is Playing: ${isPlaying}, Game: ${currentGame}`);
    if (aiEnabled && isPlaying && currentGame && aiControllerRef.current) {
      addLog('info', 'App: useEffect -> STARTING AI (due to state change)');
      aiControllerRef.current.startPlaying();
    } else if ((!aiEnabled || !isPlaying) && aiControllerRef.current) {
      addLog('info', 'App: useEffect -> STOPPING AI (due to state change or game not playing)');
      aiControllerRef.current.stopPlaying();
    }
  }, [aiEnabled, isPlaying, currentGame, addLog]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      switch (event.key) {
        case ' ': event.preventDefault(); togglePlayPause(); break;
        case 'Escape': event.preventDefault(); stopGame(); break;
        case 'a': case 'A': if (event.ctrlKey || event.metaKey) { event.preventDefault(); toggleAI(); } break;
        default: break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentGame, isPlaying, aiEnabled, togglePlayPause, stopGame, toggleAI]);

  return (
    <div className="app-container container">
      <header className="app-header">
        <h1 className="app-title">🎮 GameBoy AI Player</h1>
        <div className="app-version">v{APP_VERSION}</div>
      </header>

      <div className="main-grid">
        <div className="left-column">
          <GameBoyEmulator
            ref={emulatorRef}
            gameData={gameData}
            isPlaying={isPlaying}
            isMuted={isMuted}
            onScreenUpdate={handleScreenUpdate}
            onGameLoad={handleGameLoad}
          />
          <GameBoyControls
            onButtonPress={handleManualButtonPress}
            onButtonRelease={handleManualButtonRelease}
            disabled={aiEnabled}
          />
        </div>
        <div className="right-column">
          <div className="controls-panel">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button className="button" onClick={togglePlayPause} disabled={!currentGame}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button className="button" onClick={stopGame} disabled={!currentGame}>
                <Square size={16} /> Stop
              </button>
              <button className="button" onClick={toggleAI} style={{ background: aiEnabled ? 'linear-gradient(145deg, #22c55e, #16a34a)' : 'linear-gradient(145deg, #667eea, #764ba2)' }}>
                <Brain size={16} /> AI {aiEnabled ? 'ON' : 'OFF'}
              </button>
              <button className="button" onClick={toggleMute} style={{ background: isMuted ? 'linear-gradient(145deg, #ef4444, #dc2626)' : 'linear-gradient(145deg, #10b981, #059669)' }} title={isMuted ? 'Unmute audio' : 'Mute audio'}>
                {isMuted ? '🔇' : '🔊'}
              </button>
            </div>
            <div className={`status-indicator status-${aiStatus}`}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
              AI Status: {aiStatus}
              {aiEnabled && currentGame && (
                <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
                  {isPlaying ? 'Game is playing' : 'Game is paused'} •
                  {aiConfig.apiKey ? 'API key set' : 'No API key'} •
                  Model: {aiConfig.model.split('/').pop()}
                </div>
              )}
            </div>
          </div>
          <ControlPanel
            aiConfig={aiConfig}
            onConfigChange={handleAIConfigChange}
            gameState={{ isPlaying, aiEnabled, currentGame, gameData, aiStatus, logs, isMuted, aiConfig }}
          />
          <GameLog logs={logs} onClearLogs={clearLogs} />
        </div>
      </div>

      <AIController
        ref={aiControllerRef}
        config={aiConfig}
        gameState={{ isPlaying, aiEnabled, currentGame, gameData, aiStatus, logs, isMuted, aiConfig }}
        onStatusChange={handleAIStatusChange}
        onLog={addLog}
        emulatorRef={emulatorRef}
      />
    </div>
  );
}

export default App;