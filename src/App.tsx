import { useEffect, useRef } from 'react';
import { Play, Pause, Square, Brain, Settings, BarChart3, Upload, Volume2, VolumeX } from 'lucide-react';
import GameBoyEmulator, { GameBoyEmulatorRef } from './components/GameBoyEmulator';
import AIController, { AIControllerRef } from './components/AIController';
import ControlPanel from './components/ControlPanel';
import GameLog from './components/GameLog';
// import GameBoyControls from './components/GameBoyControls';
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const gameDataBytes = new Uint8Array(arrayBuffer);
        handleGameLoad(gameDataBytes, file.name);
      };
      reader.readAsArrayBuffer(file);
    }
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
    <div className="modern-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🎮 GameBoy AI Player</h1>
          {currentGame && <span className="current-game">{currentGame}</span>}
        </div>
        <div className="header-right">
          <button className="header-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="ai-status-header">
            <Brain size={16} />
            <span className={`status-indicator status-${aiStatus}`}>
              {aiStatus.toUpperCase()}
            </span>
          </div>
          <button className="header-btn">
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="game-area">
        <GameBoyEmulator
          ref={emulatorRef}
          gameData={gameData}
          isPlaying={isPlaying}
          isMuted={isMuted}
          onScreenUpdate={handleScreenUpdate}
          onGameLoad={handleGameLoad}
        />

        {/* Floating AI Panel */}
        {aiEnabled && (
          <div className="floating-ai-panel">
            <div className="ai-panel-header">
              <Brain size={16} />
              <span>AI LIVE</span>
              <div className="ai-activity">
                <div className="activity-dot"></div>
                <div className="activity-dot"></div>
                <div className="activity-dot"></div>
                <div className="activity-dot"></div>
                <div className="activity-dot"></div>
              </div>
            </div>
            <div className="ai-model">
              {aiConfig.model.split('/').pop()}
            </div>
            {logs.slice(-3).map((log, index) => (
              <div key={index} className="ai-log-entry">
                {log.message.substring(0, 40)}...
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Bottom Control Bar */}
      <div className="control-bar">
        <div className="control-section">
          <button 
            className={`control-btn ${isPlaying ? 'active' : ''}`} 
            onClick={togglePlayPause} 
            disabled={!currentGame}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          <button className="control-btn" onClick={stopGame} disabled={!currentGame}>
            <Square size={16} />
            STOP
          </button>
        </div>

        <div className="control-section">
          <button 
            className={`control-btn ai-toggle ${aiEnabled ? 'ai-active' : ''}`} 
            onClick={toggleAI}
          >
            <Brain size={16} />
            AI: {aiEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="control-section">
          <label className="control-btn file-upload">
            <Upload size={16} />
            LOAD ROM
            <input
              type="file"
              accept=".gb,.gbc"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div className="control-section game-controls">
          <div className="dpad">
            <button className="dpad-btn up" onMouseDown={() => handleManualButtonPress('UP')} onMouseUp={() => handleManualButtonRelease('UP')}>⬆</button>
            <button className="dpad-btn left" onMouseDown={() => handleManualButtonPress('LEFT')} onMouseUp={() => handleManualButtonRelease('LEFT')}>⬅</button>
            <button className="dpad-btn right" onMouseDown={() => handleManualButtonPress('RIGHT')} onMouseUp={() => handleManualButtonRelease('RIGHT')}>➡</button>
            <button className="dpad-btn down" onMouseDown={() => handleManualButtonPress('DOWN')} onMouseUp={() => handleManualButtonRelease('DOWN')}>⬇</button>
          </div>
          <div className="action-buttons">
            <button className="action-btn" onMouseDown={() => handleManualButtonPress('B')} onMouseUp={() => handleManualButtonRelease('B')}>B</button>
            <button className="action-btn" onMouseDown={() => handleManualButtonPress('A')} onMouseUp={() => handleManualButtonRelease('A')}>A</button>
          </div>
          <div className="meta-buttons">
            <button className="meta-btn" onMouseDown={() => handleManualButtonPress('SELECT')} onMouseUp={() => handleManualButtonRelease('SELECT')}>SELECT</button>
            <button className="meta-btn" onMouseDown={() => handleManualButtonPress('START')} onMouseUp={() => handleManualButtonRelease('START')}>START</button>
          </div>
        </div>

        <div className="control-section stats">
          <BarChart3 size={16} />
          <div className="stats-info">
            <div>FPS: 60</div>
            <div>AI Actions: {logs.filter(l => l.type === 'ai').length}</div>
          </div>
        </div>
      </div>

      {/* Hidden Panels */}
      <div className="hidden-panels">
        <ControlPanel
          aiConfig={aiConfig}
          onConfigChange={handleAIConfigChange}
          gameState={{ isPlaying, aiEnabled, currentGame, gameData, aiStatus, logs, isMuted, aiConfig }}
        />
        <GameLog logs={logs} onClearLogs={clearLogs} />
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