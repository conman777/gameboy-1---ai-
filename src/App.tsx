import { useEffect, useRef, useState } from 'react';
import { GamepadIcon, Settings, FileText, Save } from 'lucide-react';
import GameBoyEmulator, { GameBoyEmulatorRef } from './components/GameBoyEmulator';
import AIController, { AIControllerRef } from './components/AIController';
import ControlPanel from './components/ControlPanel';
import SettingsPanel from './components/SettingsPanel';
import GameLog from './components/GameLog';
import GameBoyControls from './components/GameBoyControls';
import SaveStatesPanel from './components/SaveStatesPanel';
import AIVisualizationOverlay from './components/AIVisualizationOverlay';
import { useGameStore, type GameState, type AIConfig } from './store/gameStore';
import { useButtonMemoryStore } from './store/buttonMemoryStore';
import { useRomMemoryStore } from './store/romMemoryStore';
import KnowledgeBase from './components/KnowledgeBase';

function App() {
  const [activeTab, setActiveTab] = useState<'game' | 'settings' | 'log' | 'saves'>('game');
  const [showAIVisualization, setShowAIVisualization] = useState(false);
  const [aiVisualizationData, setAIVisualizationData] = useState<{
    observation?: string;
    reasoning?: string;
  }>({});

  const {
    isPlaying,
    aiEnabled,
    currentGame,
    gameData,
    currentRomId,
    aiStatus,
    logs,
    isMuted,
    aiConfig,
    usageStats,
    loadGame,
    togglePlayPause,
    stopGame,
    toggleAI,
    addLog,
    clearLogs,
    updateAIConfig,
    setAIStatus,
    updateUsageStats,
    resetUsageStats
  } = useGameStore();

  const { successCounts, clearMemory, loadFromRomMemory } = useButtonMemoryStore();
  const { loadRomMemory, clearRomMemory } = useRomMemoryStore();

  const emulatorRef = useRef<GameBoyEmulatorRef>(null);
  const aiControllerRef = useRef<AIControllerRef>(null);
  const screenRef = useRef<ImageData | null>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleGameLoad = async (gameData: Uint8Array, fileName: string) => {
    await loadGame(gameData, fileName);
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

  const handleClearMemory = async () => {
    clearMemory(); // Clear current session memory
    if (currentRomId) {
      await clearRomMemory(currentRomId); // Clear persistent ROM memory
      addLog('info', `Cleared memory for ROM: ${currentRomId.substring(0, 8)}...`);
    } else {
      addLog('info', 'Cleared session memory');
    }
  };

  const handleTokenUsage = (promptTokens: number, completionTokens: number) => {
    // For now, we'll still pass 0 and let ControlPanel calculate it properly
    // This ensures the cost calculation is consistent and uses the latest pricing data
    updateUsageStats(promptTokens, completionTokens, 0);
  };

  // Extract AI visualization data from recent logs
  useEffect(() => {
    const recentLogs = logs.slice(-10);
    
    const latestObservation = recentLogs
      .filter(log => log.type === 'ai' && log.message.includes('👁️ AI sees:'))
      .slice(-1)[0]?.message.replace('👁️ AI sees: ', '');
      
    const latestReasoning = recentLogs
      .filter(log => log.type === 'ai' && log.message.includes('🧠 AI thinks:'))
      .slice(-1)[0]?.message.replace('🧠 AI thinks: ', '');
    
    setAIVisualizationData({
      observation: latestObservation,
      reasoning: latestReasoning
    });
  }, [logs]);

  // Find the game canvas for AI visualization overlay and manage emulator positioning
  useEffect(() => {
    const findCanvas = () => {
      const canvas = document.getElementById('wasmboy-canvas') as HTMLCanvasElement;
      if (canvas && gameCanvasRef.current !== canvas) {
        gameCanvasRef.current = canvas;
      }
    };

    // Move emulator to correct position based on active tab
    const moveEmulator = () => {
      const emulatorContainer = document.getElementById('emulator-container');
      const gameSection = document.querySelector('.game-section');
      
      if (emulatorContainer && gameSection && activeTab === 'game') {
        // Move emulator into the game section if it's not already there
        if (!gameSection.contains(emulatorContainer)) {
          gameSection.appendChild(emulatorContainer);
        }
      }
    };

    // Try to find canvas and position emulator
    findCanvas();
    moveEmulator();
    
    const interval = setInterval(() => {
      findCanvas();
      moveEmulator();
    }, 100); // Check more frequently for positioning

    return () => clearInterval(interval);
  }, [currentGame, activeTab]);

  const handleManualButtonPress = (button: string) => {
    if (emulatorRef.current && !aiEnabled) {
      addLog('user', `🎮 Manual button press: ${button}`);
      emulatorRef.current.pressButton(button);
    }
  };

  const handleManualButtonRelease = (button: string) => {
    if (emulatorRef.current && !aiEnabled) {
      emulatorRef.current.releaseButton(button);
    }
  };

  useEffect(() => {
    addLog('info', 'GameBoy AI Player initialized');
  }, [addLog]);

  // Load ROM memory when a new ROM is loaded
  useEffect(() => {
    if (currentRomId) {
      const loadMemory = async () => {
        await loadRomMemory(currentRomId);
        const romMemory = useRomMemoryStore.getState().currentMemory;
        if (romMemory) {
          loadFromRomMemory(romMemory.successCounts);
          addLog('info', `Loaded memory for ROM: ${currentRomId.substring(0, 8)}...`);
        }
      };
      loadMemory();
    }
  }, [currentRomId, loadRomMemory, loadFromRomMemory, addLog]);

  useEffect(() => {
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
        // Tab shortcuts
        case '1': if (event.ctrlKey || event.metaKey) { event.preventDefault(); setActiveTab('game'); } break;
        case '2': if (event.ctrlKey || event.metaKey) { event.preventDefault(); setActiveTab('settings'); } break;
        case '3': if (event.ctrlKey || event.metaKey) { event.preventDefault(); setActiveTab('saves'); } break;
        case '4': if (event.ctrlKey || event.metaKey) { event.preventDefault(); setActiveTab('log'); } break;
        default: break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentGame, isPlaying, aiEnabled, togglePlayPause, stopGame, toggleAI]);

  const tabs = [
    { id: 'game' as const, label: 'Game & AI Control', icon: GamepadIcon, shortcut: '1' },
    { id: 'settings' as const, label: 'Settings', icon: Settings, shortcut: '2' },
    { id: 'saves' as const, label: 'Save States', icon: Save, shortcut: '3' },
    { id: 'log' as const, label: 'Log', icon: FileText, shortcut: '4' }
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">🎮 GameBoy AI Player</h1>
          <div className="status-display">
            <div className={`status-indicator status-${aiStatus}`}>
              <div className="status-dot" />
              Status: {aiStatus.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={`${tab.label} (Ctrl+${tab.shortcut})`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              <span className="tab-shortcut">⌘{tab.shortcut}</span>
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      <main className="tab-content">
        {/* Always-mounted GameBoy Emulator */}
        <div 
          id="emulator-container"
          className={activeTab === 'game' ? 'emulator-visible' : 'emulator-hidden'}
        >
          <GameBoyEmulator
            ref={emulatorRef}
            gameData={gameData}
            isPlaying={isPlaying}
            isMuted={isMuted}
            onScreenUpdate={handleScreenUpdate}
            onGameLoad={handleGameLoad}
          />
        </div>

        {activeTab === 'game' && (
          <div className="tab-panel">
            <div className="game-layout">
              {/* Game Screen - Contains the AI Visualization Overlay */}
              <div className="game-section" style={{ position: 'relative' }}>
                {/* AI Visualization Overlay */}
                <AIVisualizationOverlay
                  gameScreenRef={gameCanvasRef}
                  isVisible={showAIVisualization}
                  onToggleVisibility={() => setShowAIVisualization(!showAIVisualization)}
                  aiObservation={aiVisualizationData.observation}
                  aiReasoning={aiVisualizationData.reasoning}
                />
              </div>
              
              {/* AI Thoughts Section */}
              <div className="thoughts-section">
                <div className="controls-panel">
                  <h3 className="panel-title">
                    🧠 AI Thoughts
                  </h3>
                  <div className="ai-thoughts-display">
                    {(() => {
                      // Extract recent AI analysis from logs
                      const recentLogs = logs.slice(-10); // Look at last 10 logs
                      
                      // Get the latest vision analysis
                      const latestVision = recentLogs
                        .filter(log => log.type === 'ai' && log.message.includes('👁️ AI sees:'))
                        .slice(-1)[0]?.message.replace('👁️ AI sees: ', '');
                      
                      // Get the latest thoughts  
                      const latestThought = recentLogs
                        .filter(log => log.type === 'ai' && log.message.includes('🧠 AI thinks:'))
                        .slice(-1)[0]?.message.replace('🧠 AI thinks: ', '');
                      
                      // Get the latest action
                      const latestAction = recentLogs
                        .filter(log => log.type === 'ai' && log.message.includes('🎮 Pressing'))
                        .slice(-1)[0]?.message;
                      
                      if (!latestVision && !latestThought && !latestAction) {
                        return (
                          <div className="thoughts-empty">
                            AI thoughts will appear here when the AI is playing...
                          </div>
                        );
                      }
                      
                      return (
                        <div className="thoughts-content">
                          {latestVision && (
                            <div className="thought-item thought-vision">
                              <strong>👁️ Sees:</strong> {latestVision}
                            </div>
                          )}
                          
                          {latestThought && (
                            <div className="thought-item thought-reasoning">
                              <strong>🧠 Thinks:</strong> {latestThought}
                            </div>
                          )}
                          
                          {latestAction && (
                            <div className="thought-item thought-action">
                              <strong>{latestAction}</strong>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
               
                {/* Knowledge Base under AI thoughts */}
                <KnowledgeBase romId={currentRomId} />
              </div>
              
              {/* AI Control Panel */}
              <div className="control-section">
                <ControlPanel
                  aiConfig={aiConfig}
                  onConfigChange={handleAIConfigChange}
                  gameState={{ isPlaying, aiEnabled, currentGame, gameData, currentRomId, aiStatus, logs, isMuted, aiConfig, usageStats }}
                  successCounts={successCounts}
                  onToggleAI={toggleAI}
                  onTogglePlayPause={togglePlayPause}
                  onStopGame={stopGame}
                  onClearMemory={handleClearMemory}
                  onResetUsageStats={resetUsageStats}
                  onLoadRom={handleGameLoad}
                />
                
                {/* Manual GameBoy Controls */}
                <GameBoyControls
                  onButtonPress={handleManualButtonPress}
                  onButtonRelease={handleManualButtonRelease}
                  disabled={aiEnabled}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-panel">
            <SettingsPanel
              aiConfig={aiConfig}
              onConfigChange={handleAIConfigChange}
            />
          </div>
        )}

        {activeTab === 'saves' && (
          <div className="tab-panel">
            <SaveStatesPanel
              currentRomId={currentRomId}
              emulatorRef={emulatorRef}
              onLoadState={(stateId) => addLog('game', `Loaded save state: ${stateId.substring(0, 8)}...`)}
              onSaveState={(stateName) => addLog('game', `Created save state: ${stateName}`)}
            />
          </div>
        )}

        {activeTab === 'log' && (
          <div className="tab-panel">
            <GameLog 
              logs={logs}
              onClearLogs={clearLogs}
            />
          </div>
        )}
      </main>

      {/* Hidden AI Controller */}
      <AIController
        ref={aiControllerRef}
        config={aiConfig}
        gameState={{ isPlaying, aiEnabled, currentGame, gameData, currentRomId, aiStatus, logs, isMuted, aiConfig, usageStats }}
        onStatusChange={handleAIStatusChange}
        onLog={addLog}
        onTokenUsage={handleTokenUsage}
        emulatorRef={emulatorRef}
      />
    </div>
  );
}

export default App;