import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import axios from 'axios';
import { AIConfig, GameState, LogEntry } from '../store/gameStore';
import { GameBoyEmulatorRef } from './GameBoyEmulator'; // Import GameBoyEmulatorRef
import { useButtonMemoryStore } from '../store/buttonMemoryStore';
import { useActionMemoryStore } from '../store/actionMemoryStore';
import { makeAIRequest, type AIMessage } from '../utils/aiProviders';

interface AIControllerProps {
  config: AIConfig;
  gameState: GameState;
  onStatusChange: (status: GameState['aiStatus']) => void;
  onLog: (type: LogEntry['type'], message: string) => void;
  onTokenUsage?: (promptTokens: number, completionTokens: number, model: string) => void;
  emulatorRef: React.RefObject<GameBoyEmulatorRef>;
}

export interface AIControllerRef {
  startPlaying: () => void;
  stopPlaying: () => void;
  testSequence: () => Promise<void>;
}

const AIController = forwardRef<AIControllerRef, AIControllerProps>(
  ({ config, gameState, onStatusChange, onLog, onTokenUsage, emulatorRef }, ref) => {
    const intervalRef = useRef<number | null>(null);
    const isPlayingRef = useRef(false);
    // const lastScreenDataRef = useRef<ImageData | null>(null);
    const lastDecisionRef = useRef<string | null>(null);
    const decisionCountRef = useRef<{ [key: string]: number }>({});
    const recordButtonSuccess = useButtonMemoryStore(state => state.recordSuccess);
    const {
      addAction: addActionRecord,
      loadActions: loadActionHistory,
    } = useActionMemoryStore();
    
    // Rate limiting state
    const lastRequestTimeRef = useRef<number>(Date.now() - 5000); // Initialize to 5 seconds ago
    const requestDelayRef = useRef<number>(3000); // Start with 3 second delay for vision models
    const consecutiveErrorsRef = useRef<number>(0);
    const maxRetries = 3;
    const visionFailureCount = useRef<number>(0);
    const maxVisionFailures = 2; // After 2 vision failures, temporarily use text mode
  
    const gameStateRef = React.useRef(gameState);
    const configRef = React.useRef(config);
    React.useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
    React.useEffect(() => { configRef.current = config; }, [config]);

    useImperativeHandle(ref, () => ({
      startPlaying: () => {
        // console.log('AIController: startPlaying called');
        // console.log('Config:', { hasApiKey: !!config.apiKey, model: config.model });
        // console.log('GameState:', { currentGame: gameState.currentGame, isPlaying: gameState.isPlaying, aiEnabled: gameState.aiEnabled });
        
        const provider = configRef.current.provider || 'openrouter';
        if (provider === 'openrouter' && !configRef.current.apiKey) {
          onLog('error', 'OpenRouter API key is required');
          return;
        }
        
        if (!gameStateRef.current.currentGame) {
          onLog('error', 'No game loaded');
          return;
        }

        // Ensure the persistent knowledge base for this ROM is loaded
        if (gameStateRef.current.currentRomId) {
          loadActionHistory(gameStateRef.current.currentRomId);
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
        while (isPlayingRef.current && gameStateRef.current.aiEnabled && gameStateRef.current.isPlaying) {
          // console.log('AIController: AI loop tick');
          
          if (!isPlayingRef.current) {
            // console.log('AIController: Stopping - AI loop not active');
            break;
          }
          
          if (!gameStateRef.current.aiEnabled) {
            // console.log('AIController: Stopping - AI not enabled in game state');
            break;
          }
          
          if (!gameStateRef.current.isPlaying) {
            // console.log('AIController: Stopping - Game not playing');
            break;
          }
          
          const provider = configRef.current.provider || 'openrouter';
          if (provider === 'openrouter' && !configRef.current.apiKey) {
            // console.log('AIController: Stopping - No API key');
            break;
          }
          
          if (!gameStateRef.current.currentGame) {
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
          
          // Use dynamic delay based on rate limiting
          const currentDelay = requestDelayRef.current;
          onLog('ai', `⏱️ Waiting ${currentDelay}ms before next decision...`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
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
        // Check rate limiting
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTimeRef.current;
        const currentDelay = requestDelayRef.current;
        
        console.log('AIController: Rate limit check:', { 
          timeSinceLastRequest, 
          currentDelay, 
          shouldWait: timeSinceLastRequest < currentDelay 
        });
        
        if (timeSinceLastRequest < currentDelay) {
          const waitTime = currentDelay - timeSinceLastRequest;
          onLog('ai', `🚦 Rate limiting: waiting ${waitTime}ms...`);
          console.log('AIController: Waiting for rate limit:', waitTime);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
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
        
        const decisionOutcome = await getAIDecisionWithVision(base64Image);
        const { button: decision, observation, reasoning, fullResponse } = decisionOutcome;
        console.log('AIController: AI decision result:', decision);
        
        // Update last request time after successful decision
        lastRequestTimeRef.current = Date.now();
        
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

            let success = false;
            if (screenBefore && screenAfter) {
              let pixelsDifferent = 0;
              for (let i = 0; i < Math.min(screenBefore.data.length, screenAfter.data.length); i++) {
                if (screenBefore.data[i] !== screenAfter.data[i]) pixelsDifferent++;
              }
              success = pixelsDifferent > 0;
              if (success) {
                onLog('ai', `✅ Button ${decision} caused screen change (${pixelsDifferent} pixels)`);
                recordButtonSuccess(decision);
              } else {
                onLog('ai', `⚠️ Button ${decision} did not change screen`);
              }

              // Persist action record in knowledge base
              try {
                const beforeBase64 = await convertScreenDataToBase64(screenBefore);
                const afterBase64 = await convertScreenDataToBase64(screenAfter);
                await addActionRecord({
                  romId: gameStateRef.current.currentRomId ?? 'unknown',
                  timestamp: Date.now(),
                  button: decision,
                  beforeImage: beforeBase64,
                  afterImage: afterBase64,
                  pixelDiff: pixelsDifferent,
                  success,
                  observation,
                  reasoning,
                  fullResponse,
                });
              } catch (err) {
                console.error('Failed to save action record:', err);
              }
            } else {
              onLog('ai', `⚠️ Unable to evaluate ${decision} effect`);
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
        
        if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
          // For rate limit errors, don't stop the AI - just wait longer
          onLog('info', `Rate limit hit - will wait longer before next request`);
          onStatusChange('thinking'); // Keep AI running but in thinking state
        } else {
          onLog('error', `AI error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          // For non-rate-limit errors, only stop AI after multiple consecutive failures
          if (!(error instanceof Error && error.message?.includes('Rate limit exceeded'))) {
            consecutiveErrorsRef.current += 1;
            if (consecutiveErrorsRef.current >= 5) {
              onLog('error', `🛑 Multiple API failures (${consecutiveErrorsRef.current}). Stopping AI to prevent spam.`);
              stopAILoop();
              return;
            }
          } else {
            // Rate limit error - don't stop AI, just wait longer
            onLog('ai', `⏳ Rate limit hit - AI will continue with longer delays...`);
            onStatusChange('thinking'); // Reset status to show AI is still thinking
          }
        }
      }
    };

    /*
     * Helper that converts the persisted Knowledge-Base into a concise string
     * like: "A 3/5, B 1/4, START 4/4" where each value is successes / attempts.
     * The LLM can then reason about which buttons are historically effective.
     */
    const summarizeActionStats = (): string => {
      const { actions } = useActionMemoryStore.getState();
      if (!actions || actions.length === 0) return 'No data yet';

      const stats: Record<string, { success: number; total: number }> = {};
      actions.forEach(a => {
        if (!stats[a.button]) {
          stats[a.button] = { success: 0, total: 0 };
        }
        stats[a.button].total += 1;
        if (a.success) stats[a.button].success += 1;
      });

      return Object.entries(stats)
        .map(([btn, { success, total }]) => `${btn}: ${success}/${total}`)
        .join(', ');
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
        
        // Convert to base64 with compression for vision models (JPEG with reduced quality)
        const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]; // 70% quality for smaller payload
        resolve(base64);
      });
    };

    const makeAPIRequestWithRetry = async (messages: AIMessage[], retryCount = 0): Promise<any> => {
      try {
        console.log(`AIController: Making API request (attempt ${retryCount + 1}/${maxRetries + 1})`);
        console.log(`AIController: Using provider: ${configRef.current.provider || 'openrouter'}`);
        
        const response = await makeAIRequest(configRef.current, messages);
        
        // Successful request - reset error count and gradually reduce delay
        consecutiveErrorsRef.current = 0;
        visionFailureCount.current = 0; // Reset vision failure count on success
        onStatusChange('thinking'); // Reset status after successful request
        if (requestDelayRef.current > 3000) {
          requestDelayRef.current = Math.max(3000, requestDelayRef.current * 0.9); // Gradually reduce delay
          onLog('ai', `✅ Request successful, reduced delay to ${requestDelayRef.current}ms`);
        }
        
        return {
          data: {
            choices: [{ message: { content: response.content } }],
            usage: response.usage
          }
        };
        
      } catch (error) {
        const isRateLimit = (axios.isAxiosError(error) && error.response?.status === 429) ||
                           (error instanceof Error && error.message.includes('rate limit'));
        
        if (isRateLimit) {
          consecutiveErrorsRef.current += 1;
          
          // Track vision model failures specifically
          const provider = configRef.current.provider || 'openrouter';
          if (provider === 'openrouter' && (configRef.current.model.includes('claude') || configRef.current.model.includes('gpt-4') || configRef.current.model.includes('gemini') || configRef.current.model.includes('vision'))) {
            visionFailureCount.current += 1;
            onLog('ai', `📊 Vision model rate limit count: ${visionFailureCount.current}/${maxVisionFailures}`);
          }
          
          if (retryCount < maxRetries) {
            // Calculate exponential backoff delay
            const baseDelay = 5000; // 5 seconds base
            const exponentialDelay = baseDelay * Math.pow(2, retryCount); // 5s, 10s, 20s
            const jitter = Math.random() * 1000; // Add jitter to avoid thundering herd
            const retryDelay = exponentialDelay + jitter;
            
            onLog('ai', `🚦 Rate limit hit (attempt ${retryCount + 1}). Retrying in ${Math.round(retryDelay/1000)}s...`);
            console.log(`AIController: Rate limit - waiting ${retryDelay}ms before retry ${retryCount + 1}`);
            
            // Set status to indicate we're waiting for rate limit
            onStatusChange('error'); // Temporarily show error status during retry wait
            
            // Also increase the global request delay for future requests
            const oldDelay = requestDelayRef.current;
            const newDelay = Math.min(oldDelay * 1.5, 15000); // Cap at 15 seconds
            requestDelayRef.current = newDelay;
            
            if (newDelay > oldDelay) {
              onLog('ai', `⏳ Increased global delay to ${newDelay}ms to prevent future rate limits`);
            }
            
            // Wait with exponential backoff, then retry
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return makeAPIRequestWithRetry(messages, retryCount + 1);
          } else {
            // Max retries reached
            const finalDelay = Math.min(requestDelayRef.current * 3, 60000); // More aggressive delay increase, cap at 1 minute
            requestDelayRef.current = finalDelay;
            onLog('error', `🚫 Max retries (${maxRetries}) reached. Increasing delay to ${Math.round(finalDelay/1000)}s before next decision.`);
            onLog('ai', `💤 Entering longer cooldown period due to persistent rate limits...`);
            throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
          }
        } else if (axios.isAxiosError(error) && error.response?.status === 401) {
          throw new Error('Invalid API key');
        } else {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`API error: ${errorMsg}`);
        }
      }
    };

    const getAIDecisionWithVision = async (base64ImageArg?: string): Promise<{ button: string | null; observation?: string; reasoning?: string; fullResponse?: string }> => { // Returns detailed info
      try {
        const gameTitle = gameStateRef.current.currentGame || 'Unknown Game';
        
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

        const isVisionModel = configRef.current.model.includes('claude') || 
                             configRef.current.model.includes('gpt-4') || 
                             configRef.current.model.includes('gemini') ||
                             configRef.current.model.includes('vision');

        // Temporarily disable vision if we've had too many vision-related rate limit failures
        const useVision = isVisionModel && visionFailureCount.current < maxVisionFailures;
        
        if (isVisionModel && !useVision) {
          onLog('ai', `🔄 Temporarily using text-only analysis due to vision model rate limits...`);
        }

        let messages: AIMessage[];
        let observation: string | undefined;
        let reasoning: string | undefined;
        
        if (useVision && base64ImageArg) { // Ensure base64ImageArg is present for vision
          // console.log('AIController: Using vision-based AI analysis');
          // if (base64ImageArg) { console.log('AIController: Image size:', base64ImageArg.length, 'characters'); }
          onLog('ai', `AI is analyzing the game screen visually with ${configRef.current.model}...`);
          
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
- Decision history: ${JSON.stringify(recentDecisionCounts)}${configRef.current.goal ? `\n- AI Goal: ${configRef.current.goal}` : ''}${avoidanceText}

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

PATTERN AVOIDANCE:
- If you've been pressing the same button repeatedly without progress, try a different approach
- Avoid alternating between just two buttons - this usually indicates you're stuck
- If stuck on a menu, try all navigation options: UP, DOWN, LEFT, RIGHT, A, B, START, SELECT
- Remember that some menus require specific button combinations or sequences

RESPONSE FORMAT:
OBSERVATION: [Describe exactly what you see - text, graphics, menus, etc.]
REASONING: [Explain why you're choosing this button${configRef.current.goal ? ` to achieve the goal: ${configRef.current.goal}` : ' for game progression'}]
DECISION: [Button name - focus on START or A for menus]

${configRef.current.goal ? `PRIORITY OBJECTIVE: Your primary focus is to achieve the goal: "${configRef.current.goal}". Every decision should be evaluated based on how it helps achieve this specific objective.

` : ''}Look at the game screen and determine what button will ${configRef.current.goal ? 'help achieve your goal' : 'advance past the current screen'}.`
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
          messages.unshift({
            role: 'system',
            content: `Historical button efficacy (success/attempts): ${summarizeActionStats()}`
          });
        } else {
          // Fallback to text-based analysis for non-vision models (or if base64ImageArg is missing)
          // console.log('AIController: Using text-based analysis');
          onLog('ai', `AI is analyzing the game screen (text-based) with ${configRef.current.model}...`);
          
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
- Last decision: ${lastDecision || 'None'}${configRef.current.goal ? `\n- AI Goal: ${configRef.current.goal}` : ''}

[Same decision rules as above...]

${configRef.current.goal ? `PRIORITY OBJECTIVE: Your primary focus is to achieve the goal: "${configRef.current.goal}". Every decision should be evaluated based on how it helps achieve this specific objective.

` : ''}PLEASE DESCRIBE YOUR REASONING:
Format your response like this:
REASONING: [Explain why you're choosing this button${configRef.current.goal ? ` to achieve the goal: ${configRef.current.goal}` : ' based on the game state'}]
DECISION: [Button name]

Respond with your reasoning and decision.`
            }
          ];
          messages.unshift({
            role: 'system',
            content: `Historical button efficacy (success/attempts): ${summarizeActionStats()}`
          });
        }

        console.log('AIController: Sending request to OpenRouter API...');
        console.log('AIController: Using model:', configRef.current.model);
        console.log('AIController: API Key present:', !!configRef.current.apiKey);
        console.log('AIController: Is vision model:', isVisionModel);
        
        const response = await makeAPIRequestWithRetry(messages);

        const fullResponse = response.data.choices[0]?.message?.content?.trim();
        console.log('AIController: Full AI response:', fullResponse);
        console.log('AIController: Response data:', response.data);
        
        // Track real-time token usage and costs
        const usage = response.data.usage;
        if (usage) {
          console.log('AIController: Token usage:', usage);
          const promptTokens = usage.prompt_tokens || 0;
          const completionTokens = usage.completion_tokens || 0;
          const totalTokens = usage.total_tokens || 0;
          
          onLog('ai', `📊 Tokens: ${promptTokens} prompt + ${completionTokens} completion = ${totalTokens} total`);
          
          // Send token usage data to parent component for cost calculation
          if (onTokenUsage) {
            onTokenUsage(promptTokens, completionTokens, configRef.current.model);
          }
          
          // Log the usage for immediate visibility
          onLog('ai', `💰 Request completed - Prompt: ${promptTokens} tokens, Completion: ${completionTokens} tokens`);
        }
        
        let decision = fullResponse; // Default to full response
        
        if (fullResponse) {
          // Extract observation and reasoning if present
          const observationMatch = fullResponse.match(/OBSERVATION:\s*(.*?)(?=REASONING:|DECISION:|$)/s);
          const reasoningMatch = fullResponse.match(/REASONING:\s*(.*?)(?=DECISION:|$)/s);
          const decisionMatch = fullResponse.match(/DECISION:\s*(\w+)/);
          
          if (observationMatch) {
            observation = observationMatch[1].trim();
            // console.log('AIController: AI Observation:', observation);
            onLog('ai', `👁️ AI sees: ${observation}`);
          }
          
          if (reasoningMatch) {
            reasoning = reasoningMatch[1].trim();
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
          return { button: buttonDecision, observation, reasoning, fullResponse };
        } else {
          // console.warn(`AIController: Invalid button decision: ${buttonDecision}`);
          onLog('error', `Invalid button: ${String(buttonDecision)}`);
          return { button: null, observation, reasoning, fullResponse };
        }
        
      } catch (error) {
        console.error('OpenRouter API error:', error);
        // Error details are already logged in makeAPIRequestWithRetry
        onLog('error', `OpenRouter API error: ${error instanceof Error ? error.message : "Unknown error"}`);
        throw error;
      }
      
      return { button: null, observation: undefined, reasoning: undefined, fullResponse: undefined }; // Add explicit return for when no decision is made
    };

    const analyzeScreenForTextModel = (/* base64Image: string */): string => { // base64Image is unused
      // For non-vision models, provide a basic text description
      // This is a fallback when vision models aren't available
      const gameTitle = gameStateRef.current.currentGame?.toLowerCase() || '';
      
      let analysis = `Game Boy screen captured (160x144 pixels)\n`;
      analysis += `Game: ${gameStateRef.current.currentGame}\n`;
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

    React.useEffect(() => {
      return () => {
        stopAILoop();
      };
    }, []);

    // (Re)load knowledge-base history whenever the active ROM changes
    React.useEffect(() => {
      if (gameState.currentRomId) {
        loadActionHistory(gameState.currentRomId);
      }
    }, [gameState.currentRomId, loadActionHistory]);

    // Stop AI when game stops or AI is disabled
    React.useEffect(() => {
      // console.log('AIController: useEffect triggered for AI start/stop logic', { /* gameState details */ });
      
      if (!gameStateRef.current.isPlaying || !gameStateRef.current.aiEnabled) {
        // console.log('AIController: Conditions not met for AI to run, ensuring stopped.');
        stopAILoop();
      } else if (gameStateRef.current.isPlaying && gameStateRef.current.aiEnabled && gameStateRef.current.currentGame && ((configRef.current.provider || 'openrouter') !== 'openrouter' || configRef.current.apiKey)) {
        // console.log('AIController: Conditions met for AI to run, ensuring started.');
        if (!isPlayingRef.current) { // Only start if not already running
          startAILoop();
        }
      }
    }, [gameStateRef.current.isPlaying, gameStateRef.current.aiEnabled, gameStateRef.current.currentGame, configRef.current.apiKey]);

    return null; // This component doesn't render anything
  }
);

AIController.displayName = 'AIController';

export default AIController; 
