import { VoiceEvent } from './types';

export interface IVoiceClient {
    start(): Promise<void>;
    stop(): void;
    isActive(): boolean;
}

export interface VoiceClientConfig {
    onEvent: (event: VoiceEvent) => void;
    onAudioStream?: (stream: MediaStream) => void;
}
