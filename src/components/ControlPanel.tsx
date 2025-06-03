import React, { useState, useEffect } from 'react';
import { Settings, Cpu } from 'lucide-react';
import { AIConfig, GameState } from '../store/gameStore';

interface ControlPanelProps {
  aiConfig: AIConfig;
  onConfigChange: (config: AIConfig) => void;
  gameState: GameState;
}

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  aiConfig, 
  onConfigChange, 
  gameState 
}) => {
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Fetch available models from OpenRouter
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      setModelError(null);
      
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models');
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }
        
        const data = await response.json();
        const models = data.data || [];
        
        // Filter and sort models for better UX
        const filteredModels = models
          .filter((model: OpenRouterModel) => {
            // Filter out models that are too expensive or specialized
            const promptPrice = parseFloat(model.pricing?.prompt || '0');
            return promptPrice < 0.01; // Filter out very expensive models
          })
          .sort((a: OpenRouterModel, b: OpenRouterModel) => {
            // Sort by popularity/name
            if (a.id.includes('gpt') && !b.id.includes('gpt')) return -1;
            if (b.id.includes('gpt') && !a.id.includes('gpt')) return 1;
            if (a.id.includes('claude') && !b.id.includes('claude')) return -1;
            if (b.id.includes('claude') && !a.id.includes('claude')) return 1;
            return a.name.localeCompare(b.name);
          });
        
        setAvailableModels(filteredModels);
        console.log(`Loaded ${filteredModels.length} models from OpenRouter`);
      } catch (error) {
        console.error('Failed to fetch OpenRouter models:', error);
        setModelError(error instanceof Error ? error.message : 'Failed to load models');
        
        // Fallback to hardcoded models
        setAvailableModels([
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable' },
          { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Most capable GPT-4 model' },
          { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Excellent reasoning' },
          { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast and efficient' },
          { id: 'google/gemini-pro', name: 'Gemini Pro', description: 'Google\'s flagship model' },
          { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Open source' }
        ]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, []);

  const handleConfigChange = (updates: Partial<AIConfig>) => {
    onConfigChange({ ...aiConfig, ...updates });
  };

  return (
    <div className="controls-panel">
      <h3 style={{ 
        color: 'white', 
        margin: '0 0 16px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Settings size={20} />
        AI Configuration
      </h3>

      {/* Emulator Mode Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'block',
          marginBottom: '8px'
        }}>
          <Cpu size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Emulator Mode
        </label>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          marginBottom: '12px'
        }}>
          <button 
            className="button"
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              background: 'linear-gradient(145deg, #22c55e, #16a34a)',
              opacity: 1
            }}
            title="Authentic Game Boy emulation using WasmBoy WebAssembly"
          >
            Authentic Mode
          </button>
          <button 
            className="button"
            style={{
              fontSize: '12px',
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.1)',
              opacity: 0.6
            }}
            disabled
            title="Enhanced visual mode (Previously available)"
          >
            Enhanced Mode
          </button>
        </div>
        <div style={{ 
          fontSize: '11px', 
          color: 'rgba(255,255,255,0.6)',
          fontStyle: 'italic'
        }}>
          Authentic Mode: Real Game Boy emulation via WasmBoy WebAssembly
        </div>
      </div>

      {/* API Configuration */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'block',
          marginBottom: '8px'
        }}>
          OpenRouter API Key
        </label>
        <input
          type="password"
          value={aiConfig.apiKey}
          onChange={(e) => handleConfigChange({ apiKey: e.target.value })}
          placeholder="sk-or-..."
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.3)',
            color: 'white',
            fontSize: '14px'
          }}
        />
        <div style={{ 
          fontSize: '11px', 
          color: 'rgba(255,255,255,0.6)',
          marginTop: '4px'
        }}>
          Get your API key from <a 
            href="https://openrouter.ai" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#9bb563' }}
          >
            openrouter.ai
          </a>
        </div>
      </div>

      {/* Model Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'white' }}>
          AI Model {isLoadingModels && '(Loading...)'}
          {!isLoadingModels && availableModels.length > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.7 }}>
              ({availableModels.length} available)
            </span>
          )}
        </label>
        {modelError && (
          <div style={{ 
            fontSize: '11px', 
            color: '#ff6b6b', 
            marginBottom: '8px',
            padding: '4px 8px',
            background: 'rgba(255, 107, 107, 0.1)',
            borderRadius: '4px'
          }}>
            ⚠️ {modelError} (using fallback models)
          </div>
        )}
        <select
          value={aiConfig.model}
          onChange={(e) => handleConfigChange({ model: e.target.value })}
          disabled={isLoadingModels}
          style={{
            width: '100%',
            maxWidth: '100%',
            padding: '8px',
            background: '#2c2f33',
            border: '1px solid #40444b',
            borderRadius: '4px',
            color: 'white',
            fontSize: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {availableModels.map(model => (
            <option 
              key={model.id} 
              value={model.id} 
              style={{ 
                background: '#1e2124',
                padding: '4px 8px',
                fontSize: '14px'
              }}
            >
              {model.name}
            </option>
          ))}
        </select>
        {/* Show description of selected model */}
        {(() => {
          const selectedModel = availableModels.find(m => m.id === aiConfig.model);
          const isVisionModel = aiConfig.model.includes('claude') || 
                               aiConfig.model.includes('gpt-4') || 
                               aiConfig.model.includes('gemini') ||
                               aiConfig.model.includes('vision');
          
          return (
            <div>
              {/* Vision indicator */}
              {isVisionModel && (
                <div style={{ 
                  fontSize: '11px', 
                  color: '#22c55e',
                  marginTop: '4px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  👁️ Vision AI Enabled - Can see game screen
                </div>
              )}
              
              {/* Model description */}
              {selectedModel?.description && (
                <div style={{ 
                  fontSize: '11px', 
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: '4px',
                  fontStyle: 'italic',
                  lineHeight: '1.3'
                }}>
                  {selectedModel.description}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Temperature */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'block',
          marginBottom: '8px'
        }}>
          Temperature: {aiConfig.temperature}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={aiConfig.temperature}
          onChange={(e) => handleConfigChange({ temperature: parseFloat(e.target.value) })}
          style={{
            width: '100%',
            marginBottom: '4px'
          }}
        />
        <div style={{ 
          fontSize: '11px', 
          color: 'rgba(255,255,255,0.6)',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Focused</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ 
          color: 'rgba(255,255,255,0.9)', 
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'block',
          marginBottom: '8px'
        }}>
          Max Tokens
        </label>
        <input
          type="number"
          min="100"
          max="4000"
          value={aiConfig.maxTokens}
          onChange={(e) => handleConfigChange({ maxTokens: parseInt(e.target.value) })}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.3)',
            color: 'white',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Game Status */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          Game Status
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)' }}>
          <div>Game: {gameState.currentGame || 'None loaded'}</div>
          <div>Status: {gameState.isPlaying ? 'Playing' : 'Paused'}</div>
          <div>AI: {gameState.aiEnabled ? 'Enabled' : 'Disabled'}</div>
          <div>AI Status: <span style={{ 
            color: gameState.aiStatus === 'playing' ? '#22c55e' : 
                   gameState.aiStatus === 'thinking' ? '#fbbf24' : 
                   gameState.aiStatus === 'error' ? '#f87171' : '#9ca3af'
          }}>
            {gameState.aiStatus}
          </span></div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(155, 181, 99, 0.1)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.7)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Quick Start:</div>
        <div>1. Add your OpenRouter API key (saved locally)</div>
        <div>2. Load a Game Boy ROM file</div>
        <div>3. Enable AI and press Play</div>
        <div>4. Watch the AI learn to play!</div>
        <div style={{ marginTop: '6px', fontSize: '10px', fontStyle: 'italic' }}>
          💾 Your API key is saved in browser storage
        </div>
      </div>

      {/* Sample ROMs */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.7)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          🎮 Free Test ROMs:
        </div>
        <div style={{ marginBottom: '4px' }}>
          <a 
            href="https://github.com/pinobatch/libbet/releases/download/v1.02/libbet-1.02.zip" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#9bb563', textDecoration: 'none' }}
          >
            • Libbet (Puzzle Game)
          </a>
        </div>
        <div style={{ marginBottom: '4px' }}>
          <a 
            href="https://github.com/AntonioND/ucity/releases/download/v1.2/ucity-1.2.zip" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#9bb563', textDecoration: 'none' }}
          >
            • µCity (City Builder)
          </a>
        </div>
        <div style={{ marginBottom: '4px' }}>
          <a 
            href="https://github.com/tbsp/shock-lobster/releases/download/1.0.1/shock-lobster.gb" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#9bb563', textDecoration: 'none' }}
          >
            • Shock Lobster (Action)
          </a>
        </div>
        <div style={{ fontSize: '10px', fontStyle: 'italic', marginTop: '6px' }}>
          These are free homebrew games. Download and load them to test the AI!
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div style={{
        marginTop: '12px',
        padding: '12px',
        background: 'rgba(0,0,0,0.15)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.7)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>
          ⌨️ Controls & Features:
        </div>
        <div>• Spacebar: Play/Pause</div>
        <div>• Escape: Stop & Reset</div>
        <div>• Ctrl/Cmd + A: Toggle AI</div>
        <div>• 🔊 Mute Button: Toggle game audio</div>
        <div>• Arrow Keys: D-Pad</div>
        <div>• Z/X: A/B Buttons</div>
        <div>• Enter/Space: Start/Select</div>
      </div>
    </div>
  );
};

export default ControlPanel; 