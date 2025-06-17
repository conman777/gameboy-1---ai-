import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Search } from 'lucide-react';
import { AIConfig, GameState } from '../store/gameStore';
import { useButtonMemoryStore } from '../store/buttonMemoryStore';

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
  const [filteredModels, setFilteredModels] = useState<OpenRouterModel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const { successCounts, clearMemory } = useButtonMemoryStore();
  const [refreshCount, setRefreshCount] = useState(0);

  // Default model - good balance of performance and cost
  const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

  // Fetch available models from OpenRouter (re-run whenever API key changes)
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      setModelError(null);

      try {
        const headers: Record<string, string> = {};
        if (aiConfig.apiKey) {
          headers['Authorization'] = `Bearer ${aiConfig.apiKey}`;
        }

        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }

        const data = await response.json();
        const models = data.data || [];
        
        // Sort models by preference and popularity
        const sortedModels = models.sort((a: OpenRouterModel, b: OpenRouterModel) => {
          // Prioritize popular/good models at the top
          const getModelPriority = (model: OpenRouterModel) => {
            const id = model.id.toLowerCase();
            if (id.includes('claude-3.5-sonnet')) return 1;
            if (id.includes('gpt-4o') && !id.includes('mini')) return 2;
            if (id.includes('claude-3.5-haiku')) return 3;
            if (id.includes('gpt-4o-mini')) return 4;
            if (id.includes('claude-3') && id.includes('sonnet')) return 5;
            if (id.includes('gemini-1.5-pro')) return 6;
            if (id.includes('gpt-4')) return 7;
            if (id.includes('claude')) return 8;
            if (id.includes('gemini')) return 9;
            if (id.includes('llama')) return 10;
            if (id.includes('gpt')) return 11;
            return 12;
          };
          
          const priorityA = getModelPriority(a);
          const priorityB = getModelPriority(b);
          
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          
          return a.name.localeCompare(b.name);
        });
        
        setAvailableModels(sortedModels);
        setFilteredModels(sortedModels);
        
        // Set default model if not already set
        if (!aiConfig.model && sortedModels.length > 0) {
          const defaultModel = sortedModels.find((m: OpenRouterModel) => m.id === DEFAULT_MODEL) || sortedModels[0];
          onConfigChange({ ...aiConfig, model: defaultModel.id });
        }
        
        console.log(`Loaded ${sortedModels.length} models from OpenRouter`);
        console.log('Sample models:', sortedModels.slice(0, 10).map((m: OpenRouterModel) => m.id));
      } catch (error) {
        console.error('Failed to fetch OpenRouter models:', error);
        setModelError(error instanceof Error ? error.message : 'Failed to load models');
        
        // Fallback to hardcoded models with enhanced selection
        const fallbackModels = [
          { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Best reasoning and game understanding' },
          { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Most capable GPT-4 model with vision' },
          { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', description: 'Fast and efficient Claude model' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and affordable with vision' },
          { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Google flagship with long context' },
          { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Excellent reasoning' },
          { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Large open source model' },
          { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Efficient open source' }
        ];
        
        setAvailableModels(fallbackModels);
        setFilteredModels(fallbackModels);
        
        // Set default for fallback too
        if (!aiConfig.model) {
          onConfigChange({ ...aiConfig, model: DEFAULT_MODEL });
        }
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
  }, [aiConfig.apiKey, refreshCount]);

  // Filter models based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredModels(availableModels);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = availableModels.filter(model => 
        model.name.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query) ||
        (model.description && model.description.toLowerCase().includes(query))
      );
      setFilteredModels(filtered);
    }
  }, [searchQuery, availableModels]);

  const handleConfigChange = (updates: Partial<AIConfig>) => {
    onConfigChange({ ...aiConfig, ...updates });
  };

  const formatPrice = (price: string | undefined) => {
    if (!price) return 'Free';
    const num = parseFloat(price);
    if (num === 0) return 'Free';
    if (num < 0.001) return `$${(num * 1000000).toFixed(2)}/1M`;
    if (num < 1) return `$${(num * 1000).toFixed(2)}/1K`;
    return `$${num.toFixed(2)}/1K`;
  };

  return (
    <div className="controls-panel">
      <h3 className="panel-title">
        <Cpu size={20} />
        AI Control
      </h3>

      {/* API Key Status */}
      {!aiConfig.apiKey ? (
        <div style={{ 
          fontSize: '12px', 
          color: '#ff6b6b', 
          marginBottom: '16px',
          padding: '8px 12px',
          background: 'rgba(255, 107, 107, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(255, 107, 107, 0.3)'
        }}>
          ⚠️ Please set your OpenRouter API key in Settings to access AI models
        </div>
      ) : (
        <div style={{ 
          fontSize: '12px', 
          color: '#22c55e', 
          marginBottom: '16px',
          padding: '8px 12px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          ✅ API key configured - full model catalog available
        </div>
      )}

      {/* Model Selection with Search */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'white' }}>
          AI Model Selection {isLoadingModels && '(Loading all models...)'}
          {!isLoadingModels && (
            <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.7 }}>
              (Showing {filteredModels.length} of {availableModels.length} total models)
            </span>
          )}
        </label>
        
        {!isLoadingModels && availableModels.length > 0 && (
          <div style={{ 
            fontSize: '11px', 
            color: '#22c55e',
            marginBottom: '8px',
            padding: '4px 8px',
            background: 'rgba(34, 197, 94, 0.1)',
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>✅ Loaded {availableModels.length} models from OpenRouter</span>
            <button
              onClick={() => {
                console.log('All available models:', availableModels);
                console.log('Current filtered models:', filteredModels);
              }}
              style={{
                background: 'none',
                border: '1px solid rgba(34, 197, 94, 0.5)',
                color: '#22c55e',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              Debug Models
            </button>
          </div>
        )}
        
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

        {/* Search Input */}
        <div style={{ position: 'relative', marginBottom: '8px', display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: '8px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'rgba(255,255,255,0.5)' 
              }} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all models: claude, gpt, gemini, llama, mistral, cohere..."
              className="input-field"
              style={{
                paddingLeft: '32px',
                fontSize: '13px',
                background: 'rgba(0,0,0,0.3)',
                marginBottom: '0',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                width: '100%'
              }}
            />
          </div>
          <button
            onClick={() => {
              setRefreshCount(c => c + 1);
            }}
            title="Refresh model list"
            style={{
              background: 'linear-gradient(145deg, #667eea, #764ba2)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '12px',
              padding: '6px 10px',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Model Select Dropdown */}
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
            fontSize: '13px',
            maxHeight: '200px',
            overflow: 'auto'
          }}
        >
          {filteredModels.map(model => {
            const isRecommended = model.id === DEFAULT_MODEL;
            const pricing = model.pricing;
            const promptPrice = formatPrice(pricing?.prompt);
            
            return (
              <option 
                key={model.id} 
                value={model.id} 
                style={{ 
                  background: '#1e2124',
                  padding: '6px 8px',
                  fontSize: '13px'
                }}
              >
                {isRecommended ? '⭐ ' : ''}{model.name} {promptPrice !== 'Free' ? `(${promptPrice})` : ''}
              </option>
            );
          })}
        </select>

        {/* Show description and details of selected model */}
        {(() => {
          const selectedModel = filteredModels.find((m: OpenRouterModel) => m.id === aiConfig.model) || 
                               availableModels.find((m: OpenRouterModel) => m.id === aiConfig.model);
          const isVisionModel = aiConfig.model.includes('claude') || 
                               aiConfig.model.includes('gpt-4') || 
                               aiConfig.model.includes('gemini') ||
                               aiConfig.model.includes('vision');
          const isDefault = aiConfig.model === DEFAULT_MODEL;
          
          return (
            <div style={{ marginTop: '8px' }}>
              {/* Default indicator */}
              {isDefault && (
                <div style={{ 
                  fontSize: '11px', 
                  color: '#fbbf24',
                  marginBottom: '4px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ⭐ Recommended Default - Best for game playing
                </div>
              )}
              
              {/* Vision indicator */}
              {isVisionModel && (
                <div style={{ 
                  fontSize: '11px', 
                  color: '#22c55e',
                  marginBottom: '4px',
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
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: '4px',
                  fontStyle: 'italic',
                  lineHeight: '1.3'
                }}>
                  {selectedModel.description}
                </div>
              )}

              {/* Pricing info */}
              {selectedModel?.pricing && (
                <div style={{ 
                  fontSize: '10px', 
                  color: 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  gap: '12px'
                }}>
                  <span>Input: {formatPrice(selectedModel.pricing.prompt)}</span>
                  <span>Output: {formatPrice(selectedModel.pricing.completion)}</span>
                  {selectedModel.context_length && (
                    <span>Context: {selectedModel.context_length.toLocaleString()}</span>
                  )}
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

      {/* Button Success Stats */}
      <div style={{
        marginTop: '20px',
        padding: '12px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        fontSize: '12px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ fontWeight: 'bold', color: 'white' }}>Button Success Stats</span>
          <button className="button" style={{ fontSize: '10px', padding: '4px 8px' }} onClick={clearMemory}>
            Clear Memory
          </button>
        </div>
        {Object.keys(successCounts).length === 0 ? (
          <div style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.6)' }}>No data yet</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: 'rgba(255,255,255,0.8)' }}>
            {Object.entries(successCounts).map(([btn, count]) => (
              <li key={btn} style={{ marginBottom: '4px' }}>{btn}: {count}</li>
            ))}
          </ul>
        )}
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