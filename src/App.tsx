import { useEffect, useRef } from 'react';
import GameBoyEmulator, { GameBoyEmulatorRef } from './components/GameBoyEmulator';
import AIController, { AIControllerRef } from './components/AIController';
import { useGameStore, type GameState, type AIConfig } from './store/gameStore';
import { useButtonMemoryStore } from './store/buttonMemoryStore';

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
    addLog,
    clearLogs,
    updateAIConfig,
    setAIStatus
  } = useGameStore();

  const { successCounts, clearMemory } = useButtonMemoryStore();

  const emulatorRef = useRef<GameBoyEmulatorRef>(null);
  const aiControllerRef = useRef<AIControllerRef>(null);
  const screenRef = useRef<ImageData | null>(null);

  const handleGameLoad = (gameData: Uint8Array, fileName: string) => {
    loadGame(gameData, fileName);
  };

  const handleScreenUpdate = (screen: ImageData) => {
    screenRef.current = screen;
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
    <div className="dashboard-container">
      {/* Top Header Bar */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">🎮 GameBoy AI Player</h1>
          <div className="header-nav">
            <button className="nav-button">Config</button>
            <button className="nav-button">Log</button>
            <button className="nav-button">Help</button>
          </div>
        </div>
        <div className="header-right">
          <div className="status-display">
            <div className={`status-indicator status-${aiStatus}`}>
              <div className="status-dot" />
              Status: {aiStatus.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="dashboard-main">
        {/* Game Screen Panel */}
        <section className="dashboard-panel game-panel">
          <div className="panel-header">
            <h3 className="panel-title">GAME SCREEN</h3>
          </div>
          <div className="panel-content">
            <GameBoyEmulator
              ref={emulatorRef}
              gameData={gameData}
              isPlaying={isPlaying}
              isMuted={isMuted}
              onScreenUpdate={handleScreenUpdate}
              onGameLoad={handleGameLoad}
            />
          </div>
        </section>

        {/* AI Control Panel */}
        <section className="dashboard-panel control-panel">
          <div className="panel-header">
            <h3 className="panel-title">AI CONTROL</h3>
          </div>
          <div className="panel-content">
            <div className="control-section">
              <div className="api-config">
                <label className="config-label">API Key:</label>
                <input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => handleAIConfigChange({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-or-..."
                  className="config-input"
                />
              </div>
              
              <div className="model-config">
                <label className="config-label">Model:</label>
                <select
                  value={aiConfig.model}
                  onChange={(e) => handleAIConfigChange({ ...aiConfig, model: e.target.value })}
                  className="config-select"
                >
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
                  <option value="openai/gpt-4o">GPT-4o</option>
                  <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
                </select>
              </div>

              <div className="slider-config">
                <label className="config-label">Temp: {aiConfig.temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={aiConfig.temperature}
                  onChange={(e) => handleAIConfigChange({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                  className="config-slider"
                />
              </div>

              <div className="slider-config">
                <label className="config-label">Tokens: {aiConfig.maxTokens}</label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={aiConfig.maxTokens}
                  onChange={(e) => handleAIConfigChange({ ...aiConfig, maxTokens: parseInt(e.target.value) })}
                  className="config-slider"
                />
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className={`dashboard-button ${aiEnabled ? 'ai-active' : 'ai-inactive'}`}
                onClick={toggleAI}
              >
                🚀 {aiEnabled ? 'STOP AI' : 'START AI'}
              </button>
              <button 
                className="dashboard-button"
                onClick={togglePlayPause}
                disabled={!currentGame}
              >
                {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
              </button>
              <button 
                className="dashboard-button"
                onClick={stopGame}
                disabled={!currentGame}
              >
                ⏹ STOP
              </button>
            </div>

            {/* Memory Stats */}
            <div className="memory-section">
              <h4 className="memory-title">Memory:</h4>
              <div className="memory-stats">
                {Object.entries(successCounts).length > 0 ? (
                  Object.entries(successCounts)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 3)
                    .map(([button, count]) => (
                      <div key={button} className="memory-item">
                        {button}: {count}
                      </div>
                    ))
                ) : (
                  <div className="memory-item">No data yet</div>
                )}
              </div>
              <button className="clear-memory-btn" onClick={clearMemory}>
                Clear Memory
              </button>
            </div>
          </div>
        </section>

        {/* Activity Log Panel */}
        <section className="dashboard-panel log-panel">
          <div className="panel-header">
            <h3 className="panel-title">ACTIVITY LOG</h3>
          </div>
          <div className="panel-content">
            <div className="log-container dashboard-log">
              {logs.length === 0 ? (
                <div className="log-empty">No activity yet...</div>
              ) : (
                logs.slice(-10).map((log, index) => (
                  <div key={index} className="log-entry dashboard-log-entry">
                    <div className="log-time">
                      {log.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className={`log-type log-${log.type}`}>
                      {log.type === 'info' && 'ℹ️'}
                      {log.type === 'ai' && '🤖'}
                      {log.type === 'game' && '🎮'}
                      {log.type === 'error' && '❌'}
                      {log.type === 'user' && '👤'}
                    </div>
                    <div className="log-message">{log.message}</div>
                  </div>
                ))
              )}
            </div>
            <div className="log-controls">
              <button className="log-action-btn" onClick={clearLogs}>Clear</button>
              <button className="log-action-btn" onClick={() => {
                const logText = logs.map(log => 
                  `${log.timestamp.toISOString()} [${log.type.toUpperCase()}] ${log.message}`
                ).join('\n');
                const blob = new Blob([logText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `gameboy-ai-logs-${new Date().toISOString().split('T')[0]}.txt`;
                link.click();
                URL.revokeObjectURL(url);
              }}>Export</button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Controls */}
      <footer className="dashboard-footer">
        <div className="footer-controls">
          Manual Controls: Arrow Keys = D-Pad • Z = A • X = B • Enter = Start
        </div>
      </footer>

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