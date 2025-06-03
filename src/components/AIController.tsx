import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import axios from 'axios';
import { AIConfig, GameState, LogEntry } from '../App';
import { GameBoyEmulatorRef } from './GameBoyEmulator'; // Import GameBoyEmulatorRef

interface AIControllerProps {
  config: AIConfig;
  gameState: GameState;
  onStatusChange: (status: GameState['aiStatus']) => void;
  onLog: (type: LogEntry['type'], message: string) => void;
  emulatorRef: React.RefObject<GameBoyEmulatorRef>;
}

export interface AIControllerRef {
  startPlaying: () => void;
  stopPlaying: () => void;
  testSequence: () => Promise<void>;
}

const AIController = forwardRef<AIControllerRef, AIControllerProps>(
  ({ config, gameState, onStatusChange, onLog, emulatorRef }, ref) => {
    const intervalRef = useRef<number | null>(null);
    const isPlayingRef = useRef(false);
    // const lastScreenDataRef = useRef<ImageData | null>(null);
    const lastDecisionRef = useRef<string | null>(null);
    const decisionCountRef = useRef<{ [key: string]: number }>({});

    useImperativeHandle(ref, () => ({
      startPlaying: () => {
        // console.log('AIController: startPlaying called');
        // console.log('Config:', { hasApiKey: !!config.apiKey, model: config.model });
        // console.log('GameState:', { currentGame: gameState.currentGame, isPlaying: gameState.isPlaying, aiEnabled: gameState.aiEnabled });
        
        if (!config.apiKey) {
          onLog('error', 'OpenRouter API key is required');
          return;
        }
        
        if (!gameState.currentGame) {
          onLog('error', 'No game loaded');
          return;
        }

        startAILoop();
      },
      stopPlaying: () => {
        // console.log('AIController: stopPlaying called');
        stopAILoop();
      },
      testSequence: async () => {
        if (!emulatorRef.current?.isReady?.()) {
          // console.log('AIController: Emulator not ready for test sequence');
          onLog('error', 'Emulator not ready for test sequence');
          return;
        }

        // console.log('AIController: Starting hardcoded test sequence for Tetris');
        onLog('ai', '🧪 Testing hardcoded sequence: START → wait → A');
        
        try {
          // Press START
          // console.log('AIController: Test sequence - pressing START');
          emulatorRef.current.pressButton('START');
          await new Promise(resolve => setTimeout(resolve, 200));
          emulatorRef.current.releaseButton('START');
          
          // Wait 1 second
          // console.log('AIController: Test sequence - waiting 1 second');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Press A
          // console.log('AIController: Test sequence - pressing A');
          emulatorRef.current.pressButton('A');
          await new Promise(resolve => setTimeout(resolve, 200));
          emulatorRef.current.releaseButton('A');
          
          // console.log('AIController: Test sequence completed');
          onLog('ai', '✅ Test sequence completed: START → A');
          
        } catch (error) {
          // console.error('AIController: Test sequence failed:', error);
          onLog('error', `Test sequence failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }));

    const startAILoop = () => {
      if (isPlayingRef.current) {
        // console.log('AIController: AI loop already running');
        return;
      }
      
      // console.log('AIController: Starting AI loop');
      isPlayingRef.current = true;
      onStatusChange('thinking');
      onLog('ai', 'AI started playing');

      // Start the AI decision loop with async function
      const aiLoop = async () => {
        while (isPlayingRef.current && gameState.aiEnabled && gameState.isPlaying) {
          const currentConditions = {
            isPlayingRef: isPlayingRef.current,
            aiEnabled: gameState.aiEnabled, 
            gameIsPlaying: gameState.isPlaying,
            hasApiKey: !!config.apiKey,
            hasGame: !!gameState.currentGame,
            emulatorReady: emulatorRef.current?.isReady?.() || false
          };
          
          // console.log('AIController: AI loop tick', currentConditions);
          
          if (!isPlayingRef.current) {
            // console.log('AIController: Stopping - AI loop not active');
            break;
          }
          
          if (!gameState.aiEnabled) {
            // console.log('AIController: Stopping - AI not enabled in game state');
            break;
          }
          
          if (!gameState.isPlaying) {
            // console.log('AIController: Stopping - Game not playing');
            break;
          }
          
          if (!config.apiKey) {
            // console.log('AIController: Stopping - No API key');
            break;
          }
          
          if (!gameState.currentGame) {
            // console.log('AIController: Stopping - No game loaded');
            break;
          }

          // Check if emulator is ready
          if (!emulatorRef.current?.isReady?.()) {
            // console.log('AIController: Waiting for WasmBoy to be ready...');
            onLog('ai', 'Waiting for emulator to be ready...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          // console.log('AIController: All conditions met, making AI decision...');
          await makeAIDecision();
          
          // Wait 500ms between AI decisions
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // console.log('AIController: AI loop ended');
        stopAILoop();
      };

      aiLoop().catch(error => {
        // console.error('AIController: AI loop error:', error);
        onLog('error', `AI loop encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`);
        stopAILoop();
      });
    };

    const stopAILoop = () => {
      isPlayingRef.current = false;
      
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      onStatusChange('idle');
      onLog('ai', 'AI stopped playing');
    };

    const makeAIDecision = async () => {
      try {
        // console.log('AIController: Making AI decision...');
        onStatusChange('thinking');
        
        if (!emulatorRef.current?.isReady?.()) {
          // console.log('AIController: Emulator not ready, skipping decision');
          onLog('error', 'Emulator not ready for input');
          return;
        }
        
        const screenData = emulatorRef.current?.getScreenData();
        if (!screenData) {
          // console.log('AIController: No screen data available');
          onLog('error', 'Could not get screen data');
          return;
        }
        console.log('AIController: Got screen data', { width: screenData.width, height: screenData.height, dataLength: screenData.data.length });

        // Convert screen data to base64 for vision models
        const base64Image = await convertScreenDataToBase64(screenData);
        console.log('AIController: Converted to base64, length:', base64Image.length);
        
        const decision = await getAIDecisionWithVision(base64Image);
        console.log('AIController: AI decision result:', decision);
        
        if (decision && emulatorRef.current) {
          onStatusChange('playing');
          // console.log(`AIController: Executing button decision: ${decision}`);
          onLog('ai', `🎮 Pressing ${decision}`);
          
          try {
            const screenBefore = emulatorRef.current?.getScreenData();
            emulatorRef.current.pressButton(decision);
            await new Promise(resolve => setTimeout(resolve, 500)); // Hold duration
            emulatorRef.current.releaseButton(decision);
            await new Promise(resolve => setTimeout(resolve, 300)); // Wait for screen to update
            const screenAfter = emulatorRef.current?.getScreenData();
            
            if (screenBefore && screenAfter) {
              let pixelsDifferent = 0;
              for (let i = 0; i < Math.min(screenBefore.data.length, screenAfter.data.length); i++) {
                if (screenBefore.data[i] !== screenAfter.data[i]) pixelsDifferent++;
              }
              if (pixelsDifferent > 0) {
                onLog('ai', `✅ Button ${decision} caused screen change (${pixelsDifferent} pixels)`);
              } else {
                onLog('ai', `⚠️ Button ${decision} did not change screen`);
              }
            }
            lastDecisionRef.current = decision;
            decisionCountRef.current[decision] = (decisionCountRef.current[decision] || 0) + 1;
          } catch (error) {
            // console.error('AIController: Error executing button press:', error);
            onLog('error', `Failed to press ${decision}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          // console.log('AIController: No valid decision or emulator ref', { decision, hasEmulatorRef: !!emulatorRef.current });
        }
      } catch (error) {
        // console.error('AIController: AI decision error:', error);
        onStatusChange('error');
        onLog('error', `AI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    const convertScreenDataToBase64 = async (screenData: ImageData): Promise<string> => {
      return new Promise((resolve) => {
        // Create a canvas to convert ImageData to base64
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = screenData.width;
        canvas.height = screenData.height;
        
        // Put the image data on the canvas
        ctx.putImageData(screenData, 0, 0);
        
        // Convert to base64 (remove the data:image/png;base64, prefix)
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        resolve(base64);
      });
    };

    const getAIDecisionWithVision = async (base64ImageArg?: string): Promise<string | null> => { // Renamed to avoid conflict
      try {
        const gameTitle = gameState.currentGame || 'Unknown Game';
        
        // Track decision frequency to avoid repetition
        const lastDecision = lastDecisionRef.current;
        const recentDecisionCounts = decisionCountRef.current;
        
        // Log current decision state
        // console.log('AIController: Decision tracking state:', { lastDecision, recentDecisionCounts });
        
        const maxSameDecision = 2;
        const shouldAvoidLastDecision = lastDecision && (recentDecisionCounts[lastDecision] || 0) >= maxSameDecision;
        
        const topTwoButtons = Object.entries(recentDecisionCounts).sort(([,a], [,b]) => b - a).slice(0, 2);
        const isAlternatingPattern = topTwoButtons.length === 2 && 
          topTwoButtons.every(([,count]) => count >= 2) &&
          Object.keys(recentDecisionCounts).length <= 2;
        
        // console.log('AIController: Pattern analysis:', { shouldAvoidLastDecision, isAlternatingPattern });
        
        if (Object.values(recentDecisionCounts).some(count => count > 8)) {
          // console.log('AIController: Resetting decision counters to prevent loops');
          decisionCountRef.current = {};
        }

        const isVisionModel = config.model.includes('claude') || 
                             config.model.includes('gpt-4') || 
                             config.model.includes('gemini') ||
                             config.model.includes('vision');

        let messages;
        
        if (isVisionModel && base64ImageArg) { // Ensure base64ImageArg is present for vision
          // console.log('AIController: Using vision-based AI analysis');
          // if (base64ImageArg) { console.log('AIController: Image size:', base64ImageArg.length, 'characters'); }
          onLog('ai', `AI is analyzing the game screen visually with ${config.model}...`);
          
          let avoidanceText = '';
          if (shouldAvoidLastDecision) {
            avoidanceText = `\n\nIMPORTANT: You just pressed "${lastDecision}" ${recentDecisionCounts[lastDecision]} times in a row. You MUST choose a different button this time to avoid getting stuck. Try different buttons like UP, DOWN, B, or SELECT.`;
          } else if (isAlternatingPattern) {
            avoidanceText = `\n\nWARNING: You're stuck in a pattern alternating between ${topTwoButtons.map(([btn]) => btn).join(' and ')}. Try something completely different like UP, DOWN, B, or SELECT to break out of this loop.`;
          }
          
          messages = [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are an AI playing "${gameTitle}" on a Game Boy emulator. You can see the current game screen in the image below.

Available buttons: UP, DOWN, LEFT, RIGHT, A, B, START, SELECT

Game Context:
- Game: ${gameTitle}
- Last decision: ${lastDecision || 'None'}
- Decision history: ${JSON.stringify(recentDecisionCounts)}${avoidanceText}

CRITICAL TETRIS NAVIGATION RULES:

TITLE SCREEN NAVIGATION:
- If you see the Tetris title screen with "1PLAYER" or menu options, press START to begin
- If START doesn't work after 1-2 tries, try A button instead
- If you see copyright text or Nintendo logo, try START or A to advance
- If you see any menu with options, use UP/DOWN to navigate and A to select
- If you're stuck on any screen, try pressing A - it often advances menus

MENU PROGRESSION:
1. Title screen → Press START or A
2. Game type selection → Use UP/DOWN to choose, A to confirm
3. Level selection → Use UP/DOWN to choose, A to confirm
4. Game starts → Use game controls

TETRIS GAMEPLAY (once game starts):
- A button: Rotate piece clockwise
- B button: Rotate piece counterclockwise  
- LEFT/RIGHT: Move piece horizontally
- DOWN: Drop piece faster (use sparingly!)

DEBUGGING FOCUS:
- We're currently debugging why the AI can't get past the title screen
- Focus on START and A buttons for menu navigation
- Don't worry about complex strategies - just get past menus first
- If you see any text or menu, try A to advance
- If A doesn't work, try START
- Pattern avoidance is currently DISABLED for debugging

RESPONSE FORMAT:
OBSERVATION: [Describe exactly what you see - text, graphics, menus, etc.]
REASONING: [Explain why you're choosing this button for Tetris menu navigation]
DECISION: [Button name - focus on START or A for menus]

Look at the game screen and determine what button will advance past the current screen.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/png;base64,${base64ImageArg}` // Use renamed variable
                  }
                }
              ]
            }
          ];
        } else {
          // Fallback to text-based analysis for non-vision models (or if base64ImageArg is missing)
          // console.log('AIController: Using text-based analysis');
          onLog('ai', `AI is analyzing the game screen (text-based) with ${config.model}...`);
          
          const screenAnalysis = analyzeScreenForTextModel();
          
          messages = [
            {
              role: 'user',
              content: `You are an AI playing "${gameTitle}" on a Game Boy emulator. Based on the screen analysis below, decide which button to press next.

Available buttons: UP, DOWN, LEFT, RIGHT, A, B, START, SELECT

Current Screen Analysis:
${screenAnalysis}

Game Context:
- Game: ${gameTitle}
- Last decision: ${lastDecision || 'None'}

[Same decision rules as above...]

PLEASE DESCRIBE YOUR REASONING:
Format your response like this:
REASONING: [Explain why you're choosing this button based on the game state]
DECISION: [Button name]

Respond with your reasoning and decision.`
            }
          ];
        }

        console.log('AIController: Sending request to OpenRouter API...');
        console.log('AIController: Using model:', config.model);
        console.log('AIController: API Key present:', !!config.apiKey);
        console.log('AIController: Is vision model:', isVisionModel);
        
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model: config.model,
            messages: messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens
          },
          {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'GameBoy AI Player'
            }
          }
        );

        const fullResponse = response.data.choices[0]?.message?.content?.trim();
        console.log('AIController: Full AI response:', fullResponse);
        console.log('AIController: Response data:', response.data);
        
        let decision = fullResponse; // Default to full response
        
        if (fullResponse) {
          // Extract observation and reasoning if present
          const observationMatch = fullResponse.match(/OBSERVATION:\s*(.*?)(?=REASONING:|DECISION:|$)/s);
          const reasoningMatch = fullResponse.match(/REASONING:\s*(.*?)(?=DECISION:|$)/s);
          const decisionMatch = fullResponse.match(/DECISION:\s*(\w+)/);
          
          if (observationMatch) {
            const observation = observationMatch[1].trim();
            // console.log('AIController: AI Observation:', observation);
            onLog('ai', `👁️ AI sees: ${observation}`);
          }
          
          if (reasoningMatch) {
            const reasoning = reasoningMatch[1].trim();
            // console.log('AIController: AI Reasoning:', reasoning);
            onLog('ai', `🧠 AI thinks: ${reasoning}`);
          }
          
          if (decisionMatch) {
            decision = decisionMatch[1];
            // console.log('AIController: Extracted decision from DECISION field:', decision);
          } else {
            const validButtons = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];
            const foundButton = validButtons.find(button => fullResponse.toUpperCase().includes(button));
            if (foundButton) {
              decision = foundButton;
              // console.log('AIController: Extracted decision from text search:', decision);
            } else {
              // console.log('AIController: No valid button found, using full response:', decision);
            }
          }
        }
        
        // Validate the decision
        const validButtons = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'A', 'B', 'START', 'SELECT'];
        let buttonDecision = decision?.toUpperCase();
        
        // Try to extract button name from response if it's not a direct match
        if (!validButtons.includes(buttonDecision)) {
          const foundButton = validButtons.find(button => 
            decision?.toUpperCase().includes(button)
          );
          buttonDecision = foundButton;
        }
        
        if (validButtons.includes(buttonDecision)) {
          // console.log(`AIController: Valid button decision: ${buttonDecision}`);
          return buttonDecision;
        } else {
          // console.warn(`AIController: Invalid button decision: ${buttonDecision}`);
          onLog('error', `Invalid button: ${String(buttonDecision)}`);
          return null;
        }
        
      } catch (error) {
        console.error('OpenRouter API error:', error);
        if (axios.isAxiosError(error)) {
          console.error('API Response:', error.response?.data);
          console.error('API Status:', error.response?.status);
        }
        onLog('error', `OpenRouter API error: ${error instanceof Error ? error.message : "Unknown error"}`);
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            throw new Error('Invalid API key');
          } else if (error.response?.status === 429) {
            throw new Error('Rate limit exceeded');
          } else {
            throw new Error(`API error: ${error.response?.status || 'Unknown'}`);
          }
        }
        
        throw error;
      }
      
      return null; // Add explicit return for when no decision is made
    };

    const analyzeScreenForTextModel = (/* base64Image: string */): string => { // base64Image is unused
      // For non-vision models, provide a basic text description
      // This is a fallback when vision models aren't available
      const gameTitle = gameState.currentGame?.toLowerCase() || '';
      
      let analysis = `Game Boy screen captured (160x144 pixels)\n`;
      analysis += `Game: ${gameState.currentGame}\n`;
      analysis += `Image data available but model does not support vision.\n`;
      
      if (gameTitle.includes('tetris')) {
        analysis += `This is Tetris - look for falling pieces and try to complete lines.\n`;
        analysis += `Use A/B to rotate, LEFT/RIGHT to move, DOWN to drop faster.\n`;
      } else if (gameTitle.includes('mario') || gameTitle.includes('land')) {
        analysis += `This is a platformer - use LEFT/RIGHT to move, A/B to jump.\n`;
      } else if (gameTitle.includes('pokemon') || gameTitle.includes('zelda')) {
        analysis += `This is an RPG - use arrows to move, A to interact, START for menu.\n`;
      }
      
      return analysis;
    };

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        stopAILoop();
      };
    }, []);

    // Stop AI when game stops or AI is disabled
    React.useEffect(() => {
      // console.log('AIController: useEffect triggered for AI start/stop logic', { /* gameState details */ });
      
      if (!gameState.isPlaying || !gameState.aiEnabled) {
        // console.log('AIController: Conditions not met for AI to run, ensuring stopped.');
        stopAILoop();
      } else if (gameState.isPlaying && gameState.aiEnabled && gameState.currentGame && config.apiKey) {
        // console.log('AIController: Conditions met for AI to run, ensuring started.');
        if (!isPlayingRef.current) { // Only start if not already running
          startAILoop();
        }
      }
    }, [gameState.isPlaying, gameState.aiEnabled, gameState.currentGame, config.apiKey]);

    return null; // This component doesn't render anything
  }
);

AIController.displayName = 'AIController';

export default AIController; 