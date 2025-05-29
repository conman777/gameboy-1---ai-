declare module 'wasmboy' {
  export interface WasmBoyConfig {
    headless?: boolean;
    useGbcWhenOptional?: boolean;
    isAudioEnabled?: boolean;
    frameSkip?: number;
    audioBatchProcessing?: boolean;
    timersBatchProcessing?: boolean;
    audioAccumulateSamples?: boolean;
    graphicsBatchProcessing?: boolean;
    graphicsDisableScanlineRendering?: boolean;
    tileRendering?: boolean;
    tileCaching?: boolean;
    gameboyFPSCap?: boolean;
    updateGraphicsCallback?: boolean;
    updateAudioCallback?: boolean;
    saveStateCallback?: boolean;
  }

  export interface CartridgeInfo {
    title?: string;
    cartridgeType?: string;
    romSize?: number;
    ramSize?: number;
    destinationCode?: number;
    oldLicenseeCode?: number;
    maskRomVersionNumber?: number;
    headerChecksum?: number;
    globalChecksum?: number;
  }

  export interface JoypadState {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    a: boolean;
    b: boolean;
    start: boolean;
    select: boolean;
  }

  export class WasmBoy {
    static config(config: WasmBoyConfig): Promise<void>;
    static setCanvas(canvas: HTMLCanvasElement): void;
    static getCanvas(): HTMLCanvasElement | null;
    static loadROM(romData: Uint8Array): Promise<void>;
    static play(): Promise<void>;
    static pause(): Promise<void>;
    static reset(): Promise<void>;
    static setJoypadState(state: JoypadState): void;
    static isPlaying(): boolean;
    static isPaused(): boolean;
    static isReady(): boolean;
    static isLoadedAndStarted(): boolean;
    static getVersion(): string;
    static saveState(): Promise<Uint8Array>;
    static loadState(saveState: Uint8Array): Promise<void>;
    static _getCartridgeInfo(): CartridgeInfo;
  }
} 