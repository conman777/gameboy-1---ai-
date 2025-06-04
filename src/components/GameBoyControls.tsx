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

  const buttonClass = 'gb-button';

  return (
    <div className="controls-panel">
      <h3 className="panel-title center-text">
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
              className={`${buttonClass} dpad-button`}
              onMouseDown={() => handleButtonPress('UP')}
              onMouseUp={() => handleButtonRelease('UP')}
              onMouseLeave={() => handleButtonRelease('UP')}
              disabled={disabled}
            >
              ▲
            </button>
            <div></div>
            
            <button
              className={`${buttonClass} dpad-button`}
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
              className={`${buttonClass} dpad-button`}
              onMouseDown={() => handleButtonPress('RIGHT')}
              onMouseUp={() => handleButtonRelease('RIGHT')}
              onMouseLeave={() => handleButtonRelease('RIGHT')}
              disabled={disabled}
            >
              ▶
            </button>
            
            <div></div>
            <button
              className={`${buttonClass} dpad-button`}
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
              className={`${buttonClass} action-button`}
              onMouseDown={() => handleButtonPress('B')}
              onMouseUp={() => handleButtonRelease('B')}
              onMouseLeave={() => handleButtonRelease('B')}
              disabled={disabled}
            >
              B
            </button>
            <button
              className={`${buttonClass} action-button`}
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
          className={`${buttonClass} small-button`}
          onMouseDown={() => handleButtonPress('SELECT')}
          onMouseUp={() => handleButtonRelease('SELECT')}
          onMouseLeave={() => handleButtonRelease('SELECT')}
          disabled={disabled}
        >
          SELECT
        </button>
        <button
          className={`${buttonClass} small-button`}
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