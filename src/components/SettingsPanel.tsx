import React from 'react';
import { Settings, Key, Info } from 'lucide-react';
import { AIConfig } from '../store/gameStore';

interface SettingsPanelProps {
  aiConfig: AIConfig;
  onConfigChange: (config: AIConfig) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  aiConfig, 
  onConfigChange 
}) => {
  const handleConfigChange = (updates: Partial<AIConfig>) => {
    onConfigChange({ ...aiConfig, ...updates });
  };

  return (
    <div className="controls-panel">
      <h3 className="panel-title">
        <Settings size={20} />
        Settings
      </h3>

      {/* API Configuration */}
      <div className="section">
        <label className="form-label">
          <Key size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          OpenRouter API Key
        </label>
        <input
          type="password"
          value={aiConfig.apiKey}
          onChange={(e) => handleConfigChange({ apiKey: e.target.value })}
          placeholder="sk-or-..."
          className="input-field"
          style={{
            fontFamily: 'monospace',
            fontSize: '13px'
          }}
        />
        <div className="info-text" style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <Info size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>How to get your API key:</div>
              <div>1. Visit <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#9bb563', textDecoration: 'underline' }}
              >
                openrouter.ai
              </a></div>
              <div>2. Sign up or log in to your account</div>
              <div>3. Go to Keys tab and create a new API key</div>
              <div>4. Paste the key here (starts with "sk-or-")</div>
            </div>
          </div>
          
          <div style={{ 
            background: 'rgba(34, 197, 94, 0.1)', 
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '6px',
            padding: '8px',
            marginTop: '8px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#22c55e', marginBottom: '4px' }}>
              🔒 Your API key is stored locally in your browser
            </div>
            <div style={{ fontSize: '11px' }}>
              • Never shared with our servers<br/>
              • Only sent directly to OpenRouter for AI requests<br/>
              • Cleared if you clear browser data
            </div>
          </div>

          {aiConfig.apiKey && (
            <div style={{ 
              background: 'rgba(34, 197, 94, 0.1)', 
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '6px',
              padding: '8px',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ color: '#22c55e' }}>✅</span>
              <div>
                <div style={{ fontWeight: 'bold', color: '#22c55e' }}>API Key Configured</div>
                <div style={{ fontSize: '11px' }}>
                  Access to 200+ AI models from OpenRouter catalog
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Parameters */}
      <div className="section">
        <label className="form-label">AI Parameters</label>
        
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
            <span>Focused (0.0)</span>
            <span>Balanced (0.5)</span>
            <span>Creative (1.0)</span>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            Controls randomness in AI responses. Lower = more consistent, Higher = more creative
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
            Max Tokens: {aiConfig.maxTokens}
          </label>
          <input
            type="range"
            min="100"
            max="4000"
            step="100"
            value={aiConfig.maxTokens}
            onChange={(e) => handleConfigChange({ maxTokens: parseInt(e.target.value) })}
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
            <span>Quick (100)</span>
            <span>Detailed (4000)</span>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
            Maximum response length. Higher = more detailed analysis, Lower = faster responses
          </div>
        </div>
      </div>

      {/* Game Settings */}
      <div className="section">
        <label className="form-label">Game Settings</label>
        
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="checkbox"
              id="authentic-mode"
              checked={true}
              disabled
              style={{ margin: 0 }}
            />
            <label htmlFor="authentic-mode" style={{ 
              color: 'rgba(255,255,255,0.9)', 
              fontSize: '14px',
              fontWeight: 'bold',
              margin: 0 
            }}>
              Authentic Game Boy Mode
            </label>
          </div>
          <div style={{ 
            fontSize: '11px', 
            color: 'rgba(255,255,255,0.6)',
            marginLeft: '24px'
          }}>
            Real Game Boy emulation using WasmBoy WebAssembly. Enhanced mode coming soon.
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(155, 181, 99, 0.1)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.7)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🚀</span> Quick Start Guide
        </div>
        <div style={{ marginLeft: '20px' }}>
          <div>1. Set your OpenRouter API key above</div>
          <div>2. Go to AI Control tab to select a model</div>
          <div>3. Load a Game Boy ROM file</div>
          <div>4. Enable AI and press Play to watch it learn!</div>
        </div>
      </div>

      {/* Version Info */}
      <div style={{
        marginTop: '16px',
        padding: '8px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '6px',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center'
      }}>
        GameBoy AI Player v1.0.0 | Built with React & WasmBoy
      </div>
    </div>
  );
};

export default SettingsPanel; 