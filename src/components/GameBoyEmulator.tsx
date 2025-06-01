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
  up: boolean;
  right: boolean;
  down: boolean;
  left: boolean;
  a: boolean;
  b: boolean;
  select: boolean;
  start: boolean;
}

const GameBoyEmulator = forwardRef<GameBoyEmulatorRef, GameBoyEmulatorProps>(
  ({ gameData, isPlaying, isMuted = false, onScreenUpdate, onGameLoad }, ref) => { // Removed onButtonPress
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wasmBoyInitialized = useRef(false);
    const [testButtonPressed, setTestButtonPressed] = useState<string | null>(null);
    const [, setCurrentJoypadState] = useState<JoypadState>({ // currentJoypadState is unused
      up: false,
      right: false,
      down: false,
      left: false,
      a: false,
      b: false,
      select: false,
      start: false
    });

    // Map button names to joypad state keys
    const buttonMap: { [key: string]: keyof JoypadState } = {
      'UP': 'up',
      'DOWN': 'down',
      'LEFT': 'left',
      'RIGHT': 'right',
      'A': 'a',
      'B': 'b',
      'START': 'start',
      'SELECT': 'select'
    };

    // Initialize WasmBoy
    useEffect(() => {
      const initWasmBoy = async () => {
        if (!wasmBoyInitialized.current && canvasRef.current) {
          try {
            // console.log('🎮 Initializing WasmBoy...');
            
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
            WasmBoy.setCanvas(canvasRef.current);
            
            // console.log('🎮 Disabling default joypad for custom input control...');
            await (WasmBoy as any).disableDefaultJoypad();
            
            // console.log('✅ WasmBoy initialized successfully');
            // console.log('WasmBoy state after init:');
            // console.log('  isReady:', WasmBoy.isReady());
            // console.log('  isPlaying:', WasmBoy.isPlaying());
            // console.log('  isPaused:', WasmBoy.isPaused());
            
            wasmBoyInitialized.current = true;
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
      const loadGame = async () => {
        if (gameData && wasmBoyInitialized.current) {
          try {
            // console.log('=== GAME LOADING START ===');
            // console.log('Loading ROM data, size:', gameData.length, 'bytes');
            
            await WasmBoy.loadROM(gameData);
            // console.log('ROM loaded successfully');
            
          } catch (error) {
            // console.error('Failed to load ROM:', error);
            onGameLoadError(new Error(`Failed to load ROM: ${error instanceof Error ? error.message : String(error)}`));
          }
        }
      };

      loadGame();
    }, [gameData]);

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
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (error) {
        // console.error('Failed to get screen data:', error);
        return null;
      }
    };

    // Manual test button handler (can be removed or wrapped in dev check)
    const handleTestButton = async (button: string) => {
      if (process.env.NODE_ENV === 'development') {
        setTestButtonPressed(button);
        // console.log(`Manual test: Pressing ${button}`);
        if (ref && 'current' in ref && ref.current) {
          await ref.current.pressButton(button);
        }
        setTimeout(() => {
          setTestButtonPressed(null);
        }, 300);
      }
    };

    // Debug function for testing WasmBoy directly (can be removed or wrapped in dev check)
    const testWasmBoyDirectly = () => {
      if (process.env.NODE_ENV === 'development') {
        // console.log('=== DIRECT WASMBOY TEST ===');
        // ... (rest of the function)
      }
    };

    // Enhanced debug function for comprehensive testing (can be removed or wrapped in dev check)
    const testWasmBoyComprehensive = async () => {
      if (process.env.NODE_ENV === 'development') {
        // console.log('=== COMPREHENSIVE WASMBOY TEST ===');
        // ... (rest of the function)
      }
    };

    // Expose testWasmBoyDirectly globally for debugging (REMOVE FOR PRODUCTION)
    useEffect(() => {
      if (process.env.NODE_ENV === 'development') {
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
        (window as any).testAllInputMethods = async (button = 'START') => { /* ... */ };
        // console.log('✅ Debug functions available in development mode.');
        return () => {
          // console.log('Cleaning up debug functions');
          delete (window as any).testWasmBoyDirectly;
          delete (window as any).testWasmBoyComprehensive;
          delete (window as any).testButtonInput;
          delete (window as any).debugCanvas;
          delete (window as any).testAllInputMethods;
        };
      }
      return () => {}; // Ensure a cleanup function is always returned
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
      // This function can be passed to onGameLoad or a similar prop
      // in App.tsx to allow GameBoyEmulator to report errors upwards.
      // For now, it's a local helper, but ideally, App.tsx would provide this.
      console.error("GameBoyEmulator onGameLoadError:", error);
      // Example: props.onGameError(error.message);
    };

    return (
      <div className="emulator-wrapper-styles"> {/* Assume styles are defined in CSS */}
        <div className="canvas-wrapper-styles">
          <canvas
            ref={canvasRef}
            width={160}
            height={144}
            className="canvas-styles"
          />
        </div>
        {!gameData && (
          <div className="upload-prompt-styles">
            <label className="upload-label-styles">
              <Upload size={16} /> Load ROM (.gb/.gbc)
              <input type="file" accept=".gb,.gbc" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
        )}
        {gameData && (
          <div className="keyboard-info-styles">
            <strong>Keyboard:</strong> Arrow Keys = D-Pad • Z = A • X = B • Enter = Start • Space = Select
          </div>
        )}
        {gameData && wasmBoyInitialized.current && process.env.NODE_ENV === 'development' && (
          <div className="manual-test-styles">
            <div>🧪 Manual Input Tests</div>
            <div>
              {['START', 'SELECT', 'A', 'B'].map(button => (
                <button key={button} onClick={() => handleTestButton(button)}>{button}</button>
              ))}
            </div>
            <div>
              {['UP', 'DOWN', 'LEFT', 'RIGHT'].map(button => (
                <button key={button} onClick={() => handleTestButton(button)}>{button}</button>
              ))}
            </div>
            <div>Test buttons to verify input works • Check browser console for debug info</div>
          </div>
        )}
      </div>
    );
  }
);

GameBoyEmulator.displayName = 'GameBoyEmulator';
export default GameBoyEmulator;
      }
      
      // Visual feedback
      setTimeout(() => {
        setTestButtonPressed(null);
      }, 300);
    };

    // Debug function for testing WasmBoy directly
    const testWasmBoyDirectly = () => {
      console.log('=== DIRECT WASMBOY TEST ===');
      console.log('WasmBoy object:', WasmBoy);
      console.log('WasmBoy methods:', Object.getOwnPropertyNames(WasmBoy));
      console.log('WasmBoy.isReady():', WasmBoy.isReady());
      console.log('WasmBoy.isPlaying():', WasmBoy.isPlaying());
      console.log('WasmBoy.isPaused():', WasmBoy.isPaused());
      console.log('WasmBoy.isLoadedAndStarted():', WasmBoy.isLoadedAndStarted());
      
      // Test joypad state directly
      const testState = {
        up: false,
        right: false,
        down: false,
        left: false,
        a: true, // Press A
        b: false,
        select: false,
        start: false
      };
      
      console.log('Testing direct joypad state:', testState);
      WasmBoy.setJoypadState(testState);
      
      setTimeout(() => {
        const releaseState = {
          up: false,
          right: false,
          down: false,
          left: false,
          a: false, // Release A
          b: false,
          select: false,
          start: false
        };
        console.log('Releasing all buttons:', releaseState);
        WasmBoy.setJoypadState(releaseState);
      }, 200);
    };

    // Enhanced debug function for comprehensive testing
    const testWasmBoyComprehensive = async () => {
      console.log('=== COMPREHENSIVE WASMBOY TEST ===');
      
      // 1. Check WasmBoy state
      console.log('1. WasmBoy State Check:');
      console.log('  isReady:', WasmBoy.isReady());
      console.log('  isPlaying:', WasmBoy.isPlaying());
      console.log('  isPaused:', WasmBoy.isPaused());
      console.log('  isLoadedAndStarted:', WasmBoy.isLoadedAndStarted());
      
      // 2. Check canvas state
      console.log('2. Canvas State Check:');
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          const hasContent = Array.from(imageData.data).some(pixel => pixel !== 0);
          console.log('  Canvas has content:', hasContent);
          console.log('  Canvas size:', canvasRef.current.width, 'x', canvasRef.current.height);
          console.log('  First 16 pixels:', Array.from(imageData.data.slice(0, 16)));
        }
      }
      
      // 3. Test direct WasmBoy input with visual feedback
      console.log('3. Testing Direct WasmBoy Input:');
      
      // Take a screenshot before input
      const beforeImage = getScreenData();
      console.log('  Screenshot before input taken');
      
      // Press START button
      const startState = {
        up: false, right: false, down: false, left: false,
        a: false, b: false, select: false, start: true
      };
      console.log('  Pressing START button...');
      WasmBoy.setJoypadState(startState);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Release START button
      const releaseState = {
        up: false, right: false, down: false, left: false,
        a: false, b: false, select: false, start: false
      };
      console.log('  Releasing START button...');
      WasmBoy.setJoypadState(releaseState);
      
      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Take a screenshot after input
      const afterImage = getScreenData();
      console.log('  Screenshot after input taken');
      
      // Compare images
      if (beforeImage && afterImage) {
        let pixelsDifferent = 0;
        for (let i = 0; i < beforeImage.data.length; i++) {
          if (beforeImage.data[i] !== afterImage.data[i]) {
            pixelsDifferent++;
          }
        }
        console.log('  Pixels different:', pixelsDifferent);
        console.log('  Screen changed:', pixelsDifferent > 0 ? 'YES' : 'NO');
      } else {
        console.log('  Could not compare images - one or both are null');
      }
      
      // 4. Test if WasmBoy has alternative input methods
      console.log('4. Checking WasmBoy Input Methods:');
      const wasmBoyMethods = Object.getOwnPropertyNames(WasmBoy);
      const inputMethods = wasmBoyMethods.filter(method => 
        method.toLowerCase().includes('input') || 
        method.toLowerCase().includes('key') || 
        method.toLowerCase().includes('button') ||
        method.toLowerCase().includes('joypad')
      );
      console.log('  Input-related methods:', inputMethods);
      
      // 5. Check if WasmBoy has internal state we can inspect
      console.log('5. WasmBoy Internal State:');
      try {
        // Try to access internal properties
        console.log('  WasmBoy keys:', Object.keys(WasmBoy));
        console.log('  WasmBoy prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(WasmBoy)));
      } catch (error) {
        console.log('  Could not access WasmBoy internals:', error);
      }
      
      console.log('=== COMPREHENSIVE TEST COMPLETED ===');
    };

    // Expose testWasmBoyDirectly globally for debugging (REMOVE FOR PRODUCTION)
    // useEffect(() => {
    //   if (process.env.NODE_ENV === 'development') {
    //     // console.log('=== SETTING UP DEBUG FUNCTIONS ===');
    //     (window as any).testWasmBoyDirectly = testWasmBoyDirectly;
    //     (window as any).testWasmBoyComprehensive = testWasmBoyComprehensive;
    //     (window as any).testButtonInput = (button: string) => {
    //       if (ref && 'current' in ref && ref.current) {
    //         ref.current.pressButton(button);
    //         setTimeout(() => {
    //           if (ref && 'current' in ref && ref.current) ref.current.releaseButton(button);
    //         }, 200);
    //       }
    //     };
    //     (window as any).debugCanvas = () => { /* ... */ };
    //     (window as any).testAllInputMethods = async (button = 'START') => { /* ... */ };
    //     // console.log('✅ Debug functions available in development mode.');
    //     return () => {
    //       // console.log('Cleaning up debug functions');
    //       delete (window as any).testWasmBoyDirectly;
    //       delete (window as any).testWasmBoyComprehensive;
    //       delete (window as any).testButtonInput;
    //       delete (window as any).debugCanvas;
    //       delete (window as any).testAllInputMethods;
    //     };
    //   }
    //   return () => {}; // Ensure a cleanup function is always returned
    // }, [ref]);

    const pressButton = async (button: string) => {
      if (!wasmBoyInitialized.current) {
        // console.warn('⚠️ WasmBoy not initialized, cannot press button');
        return;
      }
      // console.log(`🎮 PRESSING BUTTON: ${button}`);

      try {
        const joypadKey = buttonMap[button.toUpperCase()];
        if (!joypadKey) {
          console.warn('Unknown button:', button);
          return;
        }

        // Update state AND directly call WasmBoy synchronously
        setCurrentJoypadState(prevState => {
          const newState = { ...prevState, [joypadKey]: true };
          console.log('New joypad state (press):', newState);
          
          // CRITICAL FIX: Call WasmBoy immediately with the new state
          try {
            WasmBoy.setJoypadState(newState);
            console.log('✅ WasmBoy.setJoypadState called immediately for press');
          } catch (error) {
            console.error('❌ Error calling WasmBoy.setJoypadState for press:', error);
          }
          
          return newState;
        });
        
        console.log(`✅ Button ${button} pressed`);
      } catch (error) {
        console.error(`❌ Error pressing button ${button}:`, error);
      }
    };

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (wasmBoyInitialized.current) {
          WasmBoy.reset();
        }
      },
      
      pressButton,
      
      releaseButton: async (button: string) => {
        if (!wasmBoyInitialized.current) {
          console.warn('⚠️ WasmBoy not initialized, cannot release button');
          return;
        }

        console.log(`🎮 RELEASING BUTTON: ${button}`);

        try {
          const joypadKey = buttonMap[button.toUpperCase()];
          if (!joypadKey) {
            console.warn('Unknown button:', button);
            return;
          }
          
          // Update state AND directly call WasmBoy synchronously
          setCurrentJoypadState(prevState => {
            const newState = { ...prevState, [joypadKey]: false };
            console.log('New joypad state (release):', newState);
            
            // CRITICAL FIX: Call WasmBoy immediately with the new state
            try {
              WasmBoy.setJoypadState(newState);
              console.log('✅ WasmBoy.setJoypadState called immediately for release');
            } catch (error) {
              console.error('❌ Error calling WasmBoy.setJoypadState for release:', error);
            }
            
            return newState;
          });
          
          console.log(`✅ Button ${button} released`);
        } catch (error) {
          console.error(`❌ Error releasing button ${button}:`, error);
        }
      },
      
      getScreenData: () => {
        return getScreenData();
      },
      
      isReady: () => {
        return wasmBoyInitialized.current && WasmBoy.isReady();
      }
    }));

    // Handle file upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const gameData = new Uint8Array(arrayBuffer);
          onGameLoad(gameData, file.name);
        };
        reader.readAsArrayBuffer(file);
      }
    };

    // Handle keyboard input
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
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

    return (
      <div style={{
        background: 'linear-gradient(145deg, #9bb563, #8faa5a)',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        border: '3px solid #7a9147',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        <div style={{
          background: '#1e2124',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '2px solid #36393f'
        }}>
          <canvas
            ref={canvasRef}
            width={160}
            height={144}
            style={{
              width: '100%',
              height: 'auto',
              imageRendering: 'pixelated',
              background: '#0f380f',
              border: '2px solid #306230'
            }}
          />
        </div>

        {!gameData && (
          <div style={{
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            <label style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'linear-gradient(145deg, #4a5568, #2d3748)',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '2px solid #1a202c',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              <Upload size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
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

        {gameData && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: 'rgba(30, 33, 36, 0.3)',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#1e2124',
            textAlign: 'center'
          }}>
            <strong>Keyboard:</strong> Arrow Keys = D-Pad • Z = A • X = B • Enter = Start • Space = Select
          </div>
        )}

        {gameData && wasmBoyInitialized.current && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: 'rgba(155, 181, 99, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(155, 181, 99, 0.3)'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '8px',
              color: '#1e2124'
            }}>
              🧪 Manual Input Tests
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px',
              marginBottom: '8px'
            }}>
              {['START', 'SELECT', 'A', 'B'].map(button => (
                <button
                  key={button}
                  onClick={() => handleTestButton(button)}
                  style={{
                    padding: '6px 8px',
                    fontSize: '10px',
                    background: testButtonPressed === button 
                      ? 'linear-gradient(145deg, #ef4444, #dc2626)' 
                      : 'linear-gradient(145deg, #6b7280, #4b5563)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {button}
                </button>
              ))}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '4px'
            }}>
              {['UP', 'DOWN', 'LEFT', 'RIGHT'].map(button => (
                <button
                  key={button}
                  onClick={() => handleTestButton(button)}
                  style={{
                    padding: '6px 8px',
                    fontSize: '10px',
                    background: testButtonPressed === button 
                      ? 'linear-gradient(145deg, #ef4444, #dc2626)' 
                      : 'linear-gradient(145deg, #6b7280, #4b5563)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  {button}
                </button>
              ))}
            </div>
            <div style={{
              marginTop: '8px',
              fontSize: '10px',
              color: '#4b5563',
              textAlign: 'center'
            }}>
              Test buttons to verify input works • Check browser console for debug info
            </div>
          </div>
        )}
      </div>
    );
  }
);

GameBoyEmulator.displayName = 'GameBoyEmulator';

export default GameBoyEmulator; 