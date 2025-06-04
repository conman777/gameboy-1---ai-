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
    const [isRomLoaded, setIsRomLoaded] = useState(false);
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
            console.log('🎮 Initializing WasmBoy...');
            
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

            console.log('🔧 Configuring WasmBoy with config:', config);
            await WasmBoy.config(config);
            
            console.log('🖼️ Setting canvas for WasmBoy rendering...');
            WasmBoy.setCanvas(canvasRef.current);
            
            console.log('🎮 Disabling default joypad for custom input control...');
            await (WasmBoy as any).disableDefaultJoypad();
            
            console.log('✅ WasmBoy initialized successfully');
            console.log('WasmBoy state after init:');
            console.log('  isReady:', WasmBoy.isReady());
            console.log('  isPlaying:', WasmBoy.isPlaying());
            console.log('  isPaused:', WasmBoy.isPaused());
            
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
        setIsRomLoaded(false);
        console.log('🎮 Loading ROM...');
        WasmBoy.loadROM(gameData)
          .then(() => {
            console.log('✅ ROM loaded successfully');
            console.log('WasmBoy state after ROM load:');
            console.log('  isReady:', WasmBoy.isReady());
            console.log('  isPlaying:', WasmBoy.isPlaying());
            setIsRomLoaded(true);
          })
          .catch((error) => {
            console.error('❌ Failed to load ROM:', error);
            onGameLoadError(error);
          });
      } else {
        setIsRomLoaded(false);
      }
    }, [gameData, isInitialized]);

    // Handle play/pause
    useEffect(() => {
      const handlePlayPause = async () => {
        if (wasmBoyInitialized.current && gameData && isRomLoaded) {
          try {
            console.log('=== PLAY/PAUSE HANDLING START ===');
            console.log('isPlaying:', isPlaying);
            
            if (isPlaying) {
              console.log('Starting WasmBoy...');
              await WasmBoy.play();
              console.log('WasmBoy.play() completed');
              console.log('WasmBoy state after play:');
              console.log('  isReady:', WasmBoy.isReady());
              console.log('  isPlaying:', WasmBoy.isPlaying());
            } else {
              console.log('Pausing WasmBoy...');
              await WasmBoy.pause();
              console.log('WasmBoy.pause() completed');
            }
            
          } catch (error) {
            console.error('Failed to handle play/pause:', error);
          }
        }
      };

      handlePlayPause();
    }, [isPlaying, gameData, isInitialized, isRomLoaded]);

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
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
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
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '1400px',
          margin: '0 auto'
        }}
      >
        {!gameData ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              border: '2px dashed rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '40px',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎮</div>
            <h2 style={{ color: 'white', margin: '0 0 16px 0', textAlign: 'center' }}>
              Load a Game Boy ROM
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', marginBottom: '24px' }}>
              Drag and drop a .gb or .gbc file, or click below to browse
            </p>
            <label style={{
              display: 'inline-block',
              padding: '16px 32px',
              background: 'linear-gradient(145deg, #3b82f6, #1d4ed8)',
              color: 'white',
              borderRadius: '12px',
              cursor: 'pointer',
              border: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
            }}>
              <Upload size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Choose ROM File
              <input
                type="file"
                accept=".gb,.gbc"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              width: '100%',
              maxWidth: '1200px'
            }}
          >
            <canvas
              ref={canvasRef}
              width={160}
              height={144}
              style={{
                width: '100%',
                height: 'auto',
                imageRendering: 'pixelated',
                background: '#0f380f',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                display: 'block'
              }}
            />
            
            {/* Game Info Overlay */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              <div>
                <strong>Controls:</strong> Arrow Keys = D-Pad • Z = A • X = B • Enter = Start • Space = Select
              </div>
              <div>
                Game Boy Emulator
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

GameBoyEmulator.displayName = 'GameBoyEmulator';
export default GameBoyEmulator; 