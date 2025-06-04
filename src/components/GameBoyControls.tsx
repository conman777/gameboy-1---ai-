import React from 'react';

interface GameBoyControlsProps {
  onButtonPress: (button: string) => void;
  onButtonRelease?: (button: string) => void;
  disabled?: boolean;
}

const GameBoyControls: React.FC<GameBoyControlsProps> = ({ onButtonPress, onButtonRelease, disabled = false }) => {
  const handleButtonPress = (button: string) => {
    if (!disabled) {
      onButtonPress(button);
    }
  };

  const handleButtonRelease = (button: string) => {
    if (!disabled && onButtonRelease) {
      onButtonRelease(button);
    }
  };

  const buttonStyle = {
    backgroundColor: disabled ? '#666' : '#8b956d',
    border: '2px solid #1e2124',
    borderRadius: '4px',
    color: '#1e2124',
    fontWeight: 'bold',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none' as const,
    transition: 'all 0.1s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    opacity: disabled ? 0.5 : 1
  };

  const dpadButtonStyle = {
    ...buttonStyle,
    width: '40px',
    height: '40px',
    fontSize: '16px'
  };

  const actionButtonStyle = {
    ...buttonStyle,
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    fontSize: '14px',
    fontWeight: 'bold'
  };

  const smallButtonStyle = {
    ...buttonStyle,
    width: '60px',
    height: '20px',
    borderRadius: '10px',
    fontSize: '10px'
  };

  return (
    <div className="controls-panel game-controls">
      <h3 style={{ 
        color: 'white', 
        margin: '0 0 16px 0',
        textAlign: 'center'
      }}>
        🎮 Game Controls
      </h3>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        {/* D-Pad */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>
            D-PAD
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '40px 40px 40px',
            gridTemplateRows: '40px 40px 40px',
            gap: '2px'
          }}>
            <div></div>
            <button
              style={dpadButtonStyle}
              onMouseDown={() => handleButtonPress('UP')}
              onMouseUp={() => handleButtonRelease('UP')}
              onMouseLeave={() => handleButtonRelease('UP')}
              disabled={disabled}
            >
              ▲
            </button>
            <div></div>
            
            <button
              style={dpadButtonStyle}
              onMouseDown={() => handleButtonPress('LEFT')}
              onMouseUp={() => handleButtonRelease('LEFT')}
              onMouseLeave={() => handleButtonRelease('LEFT')}
              disabled={disabled}
            >
              ◀
            </button>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#1e2124',
              borderRadius: '4px'
            }}></div>
            <button
              style={dpadButtonStyle}
              onMouseDown={() => handleButtonPress('RIGHT')}
              onMouseUp={() => handleButtonRelease('RIGHT')}
              onMouseLeave={() => handleButtonRelease('RIGHT')}
              disabled={disabled}
            >
              ▶
            </button>
            
            <div></div>
            <button
              style={dpadButtonStyle}
              onMouseDown={() => handleButtonPress('DOWN')}
              onMouseUp={() => handleButtonRelease('DOWN')}
              onMouseLeave={() => handleButtonRelease('DOWN')}
              disabled={disabled}
            >
              ▼
            </button>
            <div></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', marginBottom: '8px' }}>
            ACTION
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '15px',
            alignItems: 'center'
          }}>
            <button
              style={actionButtonStyle}
              onMouseDown={() => handleButtonPress('B')}
              onMouseUp={() => handleButtonRelease('B')}
              onMouseLeave={() => handleButtonRelease('B')}
              disabled={disabled}
            >
              B
            </button>
            <button
              style={actionButtonStyle}
              onMouseDown={() => handleButtonPress('A')}
              onMouseUp={() => handleButtonRelease('A')}
              onMouseLeave={() => handleButtonRelease('A')}
              disabled={disabled}
            >
              A
            </button>
          </div>
        </div>
      </div>

      {/* Start/Select Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        gap: '20px',
        marginTop: '20px'
      }}>
        <button
          style={smallButtonStyle}
          onMouseDown={() => handleButtonPress('SELECT')}
          onMouseUp={() => handleButtonRelease('SELECT')}
          onMouseLeave={() => handleButtonRelease('SELECT')}
          disabled={disabled}
        >
          SELECT
        </button>
        <button
          style={smallButtonStyle}
          onMouseDown={() => handleButtonPress('START')}
          onMouseUp={() => handleButtonRelease('START')}
          onMouseLeave={() => handleButtonRelease('START')}
          disabled={disabled}
        >
          START
        </button>
      </div>

      {/* Keyboard Instructions */}
      <div style={{ 
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.7)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Keyboard Controls:</div>
        <div>Arrow Keys: D-Pad • Z: A Button • X: B Button</div>
        <div>Enter: Start • Space: Select</div>
      </div>

      {disabled && (
        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.6)',
          fontSize: '12px',
          fontStyle: 'italic'
        }}>
          Controls disabled while AI is playing
        </div>
      )}
    </div>
  );
};

export default GameBoyControls; 