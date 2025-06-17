import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Upload } from 'lucide-react'; // Play and Square are unused
import { WasmBoy } from 'wasmboy';

interface GameBoyEmulatorProps {
  gameData: Uint8Array | null;
  isPlaying: boolean;
  isMuted?: boolean;
  onScreenUpdate: (screen: ImageData) => void;
  onGameLoad: (gameData: Uint8Array, fileName: string) => void;
  onButtonPress?: (button: string) => void;
}

export interface GameBoyEmulatorRef {
  reset: () => void;
  pressButton: (button: string) => void;
  releaseButton: (button: string) => void;
  getScreenData: () => ImageData | null;
  isReady: () => boolean;
}

// WasmBoy joypad state object
interface JoypadState {
  UP: boolean;
  RIGHT: boolean;
  DOWN: boolean;
  LEFT: boolean;
  A: boolean;
  B: boolean;
  SELECT: boolean;
  START: boolean;
}

const GameBoyEmulator = forwardRef<GameBoyEmulatorRef, GameBoyEmulatorProps>(
  ({ gameData, isPlaying, isMuted = false, onScreenUpdate, onGameLoad }, ref) => { // Removed onButtonPress
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wasmBoyInitialized = useRef(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [, setCurrentJoypadState] = useState<JoypadState>({ // currentJoypadState is unused
      UP: false,
      RIGHT: false,
      DOWN: false,
      LEFT: false,
      A: false,
      B: false,
      SELECT: false,
      START: false
    });

    // Map button names to joypad state keys
    const buttonMap: { [key: string]: keyof JoypadState } = {
      'UP': 'UP',
      'DOWN': 'DOWN',
      'LEFT': 'LEFT',
      'RIGHT': 'RIGHT',
      'A': 'A',
      'B': 'B',
      'START': 'START',
      'SELECT': 'SELECT'
    };

    // Initialize WasmBoy
    useEffect(() => {
      const initWasmBoy = async () => {
        if (!wasmBoyInitialized.current && canvasRef.current) {
          try {
            // console.log('🎮 Initializing WasmBoy...');
            
            // Set willReadFrequently on the canvas context early
            const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }
            
            // Configure WasmBoy with proper options
            const config = {
              headless: false,
              useGbcWhenOptional: true,
              isAudioEnabled: !isMuted,
              frameSkip: 0,
              audioBatchProcessing: false,
              timersBatchProcessing: false,
              audioAccumulateSamples: false,
              graphicsBatchProcessing: false,
              graphicsDisableScanlineRendering: false,
              tileRendering: true,
              tileCaching: true,
              updateGraphicsCallback: false,
              updateAudioCallback: false,
              saveStateCallback: false
            };

            // console.log('🔧 Configuring WasmBoy with config:', config);
            await WasmBoy.config(config);
            
            // console.log('🖼️ Setting canvas for WasmBoy rendering...');
            // Wait for WasmBoy to finish binding the canvas so our styles stick
            await WasmBoy.setCanvas(canvasRef.current);
            // Ensure the canvas is scaled up for better visibility
            if (canvasRef.current) {
              canvasRef.current.width = 480; // internal resolution
              canvasRef.current.height = 432;
              canvasRef.current.style.width = '480px';
              canvasRef.current.style.height = '432px';
              canvasRef.current.style.imageRendering = 'pixelated';
            }
            
            // console.log('🎮 Disabling default joypad for custom input control...');
            await (WasmBoy as any).disableDefaultJoypad();
            
            // console.log('✅ WasmBoy initialized successfully');
            // console.log('WasmBoy state after init:');
            // console.log('  isReady:', WasmBoy.isReady());
            // console.log('  isPlaying:', WasmBoy.isPlaying());
            // console.log('  isPaused:', WasmBoy.isPaused());
            
            wasmBoyInitialized.current = true;
            setIsInitialized(true);
          } catch (error) {
            // console.error('❌ Failed to initialize WasmBoy:', error);
            onGameLoadError(new Error(`Failed to initialize emulator: ${error instanceof Error ? error.message : String(error)}`));
            throw error; // Re-throw to allow further handling if necessary
          }
        }
      };

      initWasmBoy();
    }, [isMuted]);

    // Handle game loading
    useEffect(() => {
      if (gameData && isInitialized) {
        WasmBoy.loadROM(gameData).catch(onGameLoadError);
      }
    }, [gameData, isInitialized]);

    // Handle play/pause
    useEffect(() => {
      const handlePlayPause = async () => {
        if (wasmBoyInitialized.current && gameData) {
          try {
            // console.log('=== PLAY/PAUSE HANDLING START ===');
            // console.log('isPlaying:', isPlaying);
            
            if (isPlaying) {
              // console.log('Starting WasmBoy...');
              await WasmBoy.play();
              // console.log('WasmBoy.play() completed');
            } else {
              // console.log('Pausing WasmBoy...');
              await WasmBoy.pause();
              // console.log('WasmBoy.pause() completed');
            }
            
          } catch (error) {
            // console.error('Failed to handle play/pause:', error);
            // Optionally, notify App.tsx of this error too
          }
        }
      };

      handlePlayPause();
    }, [isPlaying, gameData]);

    // Handle mute state changes dynamically
    useEffect(() => {
      if (wasmBoyInitialized.current) {
        try {
          // Try different WasmBoy audio control methods
          if (typeof (WasmBoy as any).disableAudio === 'function' && typeof (WasmBoy as any).enableAudio === 'function') {
            if (isMuted) {
              (WasmBoy as any).disableAudio();
              console.log('Audio muted using disableAudio()');
            } else {
              (WasmBoy as any).enableAudio();
              console.log('Audio unmuted using enableAudio()');
            }
          } else if (typeof (WasmBoy as any).updateConfig === 'function') {
            // Try updating config
            (WasmBoy as any).updateConfig({ isAudioEnabled: !isMuted });
            console.log(`Audio ${isMuted ? 'muted' : 'unmuted'} using updateConfig`);
          } else if (typeof (WasmBoy as any).config === 'function') {
            // Try reconfiguring
            (WasmBoy as any).config({ isAudioEnabled: !isMuted });
            console.log(`Audio ${isMuted ? 'muted' : 'unmuted'} using config`);
          } else {
            console.warn('No known audio control methods found on WasmBoy');
          }
        } catch (error) {
          console.warn('Failed to change audio state:', error);
        }
      }
    }, [isMuted]);

    // DISABLED: Update joypad state in WasmBoy whenever our state changes
    // This was causing race conditions with direct WasmBoy calls in pressButton/releaseButton
    // useEffect(() => {
    //   if (wasmBoyInitialized.current) {
    //     console.log('🎮 Updating WasmBoy joypad state:', currentJoypadState);
    //     
    //     try {
    //       WasmBoy.setJoypadState(currentJoypadState);
    //       console.log('✅ setJoypadState called successfully');
    //     } catch (error) {
    //       console.error('❌ Error setting joypad state:', error);
    //     }
    //   }
    // }, [currentJoypadState]);

    // Screen update loop
    useEffect(() => {
      // console.log('=== SCREEN UPDATE EFFECT TRIGGERED ===');
      
      let animationFrameId: number;
      // let frameCount = 0; // frameCount not used for essential logic
      
      const updateScreen = () => {
        if (wasmBoyInitialized.current && isPlaying) {
          try {
            // frameCount++;
            // if (frameCount % 120 === 0) { // Example: reduce logging frequency or remove
            //   console.log(`Screen update loop running, frame ${frameCount}`);
            // }
            
            const screenData = getScreenData();
            if (screenData) {
              onScreenUpdate(screenData);
            }
            // else if (frameCount % 60 === 0) { // Reduce or remove logging
            //   console.warn('No screen data available');
            // }
          } catch (error) {
            // console.error('Error updating screen:', error);
          }
        }
        
        if (isPlaying) {
          animationFrameId = requestAnimationFrame(updateScreen);
        }
      };
      
      if (isPlaying && wasmBoyInitialized.current) {
        // console.log('✅ Starting screen update loop');
        updateScreen();
      }
      // else {
      //   console.log('❌ Not starting screen update loop:', { isPlaying, wasmBoyInitialized: wasmBoyInitialized.current });
      // }
      
      return () => {
        if (animationFrameId) {
          // console.log('Stopping screen update loop');
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, [isPlaying, onScreenUpdate]);

    // Helper function to get screen data
    const getScreenData = (): ImageData | null => {
      if (!wasmBoyInitialized.current || !canvasRef.current) {
        return null;
      }
      
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        
        // Always capture the Game Boy's native resolution (160×144) regardless of display scaling
        const NATIVE_WIDTH = 160;
        const NATIVE_HEIGHT = 144;

        return ctx.getImageData(0, 0, NATIVE_WIDTH, NATIVE_HEIGHT);
      } catch (error) {
        // console.error('Failed to get screen data:', error);
        return null;
      }
    };

    // Debug function for testing WasmBoy directly (can be removed or wrapped in dev check)
    const testWasmBoyDirectly = () => {
      // console.log('=== DIRECT WASMBOY TEST ===');
      // ... (rest of the function)
    };

    // Enhanced debug function for comprehensive testing (can be removed or wrapped in dev check)
    const testWasmBoyComprehensive = async () => {
      // console.log('=== COMPREHENSIVE WASMBOY TEST ===');
      // ... (rest of the function)
    };

    // Expose testWasmBoyDirectly globally for debugging (REMOVE FOR PRODUCTION)
    useEffect(() => {
      // console.log('=== SETTING UP DEBUG FUNCTIONS ===');
      (window as any).testWasmBoyDirectly = testWasmBoyDirectly;
      (window as any).testWasmBoyComprehensive = testWasmBoyComprehensive;
      (window as any).testButtonInput = (button: string) => {
        if (ref && 'current' in ref && ref.current) {
          ref.current.pressButton(button);
          setTimeout(() => {
            if (ref && 'current' in ref && ref.current) ref.current.releaseButton(button);
          }, 200);
        }
      };
      (window as any).debugCanvas = () => { /* ... */ };
      (window as any).testAllInputMethods = async (_button = 'START') => { /* ... */ };
      // console.log('✅ Debug functions available in development mode.');
      return () => {
        // console.log('Cleaning up debug functions');
        delete (window as any).testWasmBoyDirectly;
        delete (window as any).testWasmBoyComprehensive;
        delete (window as any).testButtonInput;
        delete (window as any).debugCanvas;
        delete (window as any).testAllInputMethods;
      };
    }, [ref]);

    const pressButton = async (button: string) => {
      console.log('[EMULATOR LOG] pressButton called with button:', button);
      if (!wasmBoyInitialized.current) {
        // console.warn('⚠️ WasmBoy not initialized, cannot press button');
        return;
      }
      // console.log(`🎮 PRESSING BUTTON: ${button}`);
      try {
        const joypadKey = buttonMap[button.toUpperCase()];
        if (!joypadKey) {
          // console.warn('Unknown button:', button);
          return;
        }
        setCurrentJoypadState(prevState => {
          const newState = { ...prevState, [joypadKey]: true };
          try {
            WasmBoy.setJoypadState(newState);
          } catch (error) {
            // console.error('❌ Error calling WasmBoy.setJoypadState for press:', error);
          }
          return newState;
        });
        // console.log(`✅ Button ${button} pressed`);
      } catch (error) {
        // console.error(`❌ Error pressing button ${button}:`, error);
      }
    };

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (wasmBoyInitialized.current) WasmBoy.reset();
      },
      pressButton,
      releaseButton: async (button: string) => {
        if (!wasmBoyInitialized.current) {
          // console.warn('⚠️ WasmBoy not initialized, cannot release button');
          return;
        }
        // console.log(`🎮 RELEASING BUTTON: ${button}`);
        try {
          const joypadKey = buttonMap[button.toUpperCase()];
          if (!joypadKey) {
            // console.warn('Unknown button:', button);
            return;
          }
          setCurrentJoypadState(prevState => {
            const newState = { ...prevState, [joypadKey]: false };
            try {
              WasmBoy.setJoypadState(newState);
            } catch (error) {
              // console.error('❌ Error calling WasmBoy.setJoypadState for release:', error);
            }
            return newState;
          });
          // console.log(`✅ Button ${button} released`);
        } catch (error) {
          // console.error(`❌ Error releasing button ${button}:`, error);
        }
      },
      getScreenData,
      isReady: () => wasmBoyInitialized.current && WasmBoy.isReady()
    }));

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const gameDataBytes = new Uint8Array(arrayBuffer);
          onGameLoad(gameDataBytes, file.name);
        };
        reader.readAsArrayBuffer(file);
      }
    };

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        console.log('[EMULATOR KEYDOWN] handleKeyDown fired for key:', event.key);
        if (!wasmBoyInitialized.current) return;
        let button = '';
        switch (event.key) {
          case 'ArrowUp': button = 'UP'; break;
          case 'ArrowDown': button = 'DOWN'; break;
          case 'ArrowLeft': button = 'LEFT'; break;
          case 'ArrowRight': button = 'RIGHT'; break;
          case 'z': case 'Z': button = 'A'; break;
          case 'x': case 'X': button = 'B'; break;
          case 'Enter': button = 'START'; break;
          case ' ': button = 'SELECT'; break;
          default: return;
        }
        event.preventDefault();
        if (ref && 'current' in ref && ref.current) {
          ref.current.pressButton(button);
        }
      };
      const handleKeyUp = (event: KeyboardEvent) => {
        if (!wasmBoyInitialized.current) return;
        let button = '';
        switch (event.key) {
          case 'ArrowUp': button = 'UP'; break;
          case 'ArrowDown': button = 'DOWN'; break;
          case 'ArrowLeft': button = 'LEFT'; break;
          case 'ArrowRight': button = 'RIGHT'; break;
          case 'z': case 'Z': button = 'A'; break;
          case 'x': case 'X': button = 'B'; break;
          case 'Enter': button = 'START'; break;
          case ' ': button = 'SELECT'; break;
          default: return;
        }
        event.preventDefault();
        if (ref && 'current' in ref && ref.current) {
          ref.current.releaseButton(button);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }, [ref]);

    // A helper function to pass to onGameLoad in case of error
    const onGameLoadError = (error: Error) => {
      console.error('Game load error:', error);
    };


    return (
      <div className="gameboy-dmg">
        {/* Game Boy Body */}
        <div className="gameboy-body">
          
          {/* Top Section with Branding */}
          <div className="gameboy-top">
            <div className="gameboy-logo">
              <div className="nintendo-logo">Nintendo</div>
              <div className="gameboy-text">GAME BOY</div>
            </div>
          </div>

          {/* Screen Section */}
          <div className="gameboy-screen-section">
            <div className="screen-label">DOT MATRIX WITH STEREO SOUND</div>
            
            <div className="screen-housing">
              <div className="screen-bezel">
                <div className="screen-glass">
                  <canvas
                    id="wasmboy-canvas"
                    ref={canvasRef}
                    width={160}
                    height={144}
                    className="gameboy-lcd"
                  />
                </div>
              </div>
              
              {/* Power LED */}
              <div className="power-section">
                <div className={`power-led ${isPlaying ? 'power-on' : 'power-off'}`}></div>
                <div className="power-label">POWER</div>
              </div>
            </div>
          </div>

          {/* Nintendo Branding */}
          <div className="nintendo-section">
            <div className="nintendo-text">Nintendo GAME BOY</div>
          </div>

          {/* D-Pad and Controls Section */}
          <div className="controls-section">
            
            {/* Left Side - D-Pad */}
            <div className="dpad-section">
              <div className="dpad-container">
                <div className="dpad">
                  <div className="dpad-center"></div>
                  <div className="dpad-up"></div>
                  <div className="dpad-down"></div>
                  <div className="dpad-left"></div>
                  <div className="dpad-right"></div>
                </div>
              </div>
            </div>

            {/* Right Side - Action Buttons */}
            <div className="action-section">
              <div className="action-buttons">
                <div className="button-b">
                  <div className="button-face">B</div>
                </div>
                <div className="button-a">
                  <div className="button-face">A</div>
                </div>
              </div>
            </div>
          </div>

          {/* Start/Select Section */}
          <div className="start-select-section">
            <div className="small-button select-button">
              <div className="small-button-face"></div>
              <div className="button-label">SELECT</div>
            </div>
            <div className="small-button start-button">
              <div className="small-button-face"></div>
              <div className="button-label">START</div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="gameboy-bottom">
            <div className="speaker-grille">
              <div className="speaker-holes">
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="speaker-hole"></div>
                ))}
              </div>
            </div>
            
            {/* File Upload (Hidden in body) */}
            {!gameData && (
              <div className="rom-loader">
                <label className="rom-upload-label">
                  <Upload size={16} />
                  Load ROM (.gb/.gbc)
                  <input
                    type="file"
                    accept=".gb,.gbc"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Volume Slider and Headphone Jack */}
          <div className="gameboy-side-details">
            <div className="volume-slider"></div>
            <div className="headphone-jack"></div>
          </div>

        </div>
      </div>
    );
  }
);

GameBoyEmulator.displayName = 'GameBoyEmulator';
export default GameBoyEmulator; 