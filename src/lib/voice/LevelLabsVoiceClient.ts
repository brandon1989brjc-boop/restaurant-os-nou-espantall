import { IVoiceClient } from './IVoiceClient';
import { VoiceEvent, DishModification } from './types';

interface LevelLabsConfig {
    wsUrl: string;                // URL del WebSocket (ej: ws://localhost:8080 o wss://api.levellabs.com/voice)
    apiKey?: string;              // Token de autenticación
    restaurantId?: string;        // ID del restaurante para contexto
    onEvent: (event: VoiceEvent) => void;
    debug?: boolean;              // Habilitar logs detallados
}

interface LevelLabsMessage {
    type: 'auth' | 'audio' | 'transcription' | 'intent' | 'audio_response' | 'complete' | 'error';
    data?: any;
    intent?: string;
    entities?: any;
    text?: string;
    audioUrl?: string;
    error?: string;
}

export class LevelLabsVoiceClient implements IVoiceClient {
    private ws: WebSocket | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private audioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private config: LevelLabsConfig;
    private isRecording = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: NodeJS.Timeout | null = null

    constructor(config: LevelLabsConfig) {
        this.config = config;
        this.log('LevelLabsVoiceClient initialized', config);
    }

    private log(...args: any[]) {
        if (this.config.debug) {
            console.log('[LevelLabs]', ...args);
        }
    }

    async start(): Promise<void> {
        try {
            this.log('Starting voice client...');

            // 1. Conectar WebSocket
            await this.connectWebSocket();

            // 2. Iniciar captura de audio
            await this.startAudioCapture();

            this.config.onEvent({
                type: 'agent_status',
                payload: { status: 'listening' }
            });

        } catch (error) {
            this.log('Error starting client:', error);
            this.config.onEvent({
                type: 'agent_status',
                payload: { status: 'idle' }
            });
            throw error;
        }
    }

    private async connectWebSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.log('Connecting to WebSocket:', this.config.wsUrl);
                this.ws = new WebSocket(this.config.wsUrl);

                this.ws.onopen = () => {
                    this.log('✅ WebSocket connected');
                    this.reconnectAttempts = 0;

                    // Enviar autenticación si existe
                    if (this.config.apiKey) {
                        this.sendMessage({
                            type: 'auth',
                            data: {
                                apiKey: this.config.apiKey,
                                restaurantId: this.config.restaurantId,
                                clientType: 'web_menu',
                                timestamp: new Date().toISOString()
                            }
                        });
                    }

                    resolve();
                };

                this.ws.onmessage = (event) => {
                    this.handleServerMessage(event.data);
                };

                this.ws.onerror = (error) => {
                    this.log('❌ WebSocket error:', error);
                    reject(new Error('WebSocket connection failed'));
                };

                this.ws.onclose = () => {
                    this.log('WebSocket closed');
                    this.handleDisconnection();
                };

                // Timeout de conexión
                setTimeout(() => {
                    if (this.ws?.readyState !== WebSocket.OPEN) {
                        reject(new Error('WebSocket connection timeout'));
                    }
                }, 10000);

            } catch (error) {
                this.log('Error creating WebSocket:', error);
                reject(error);
            }
        });
    }

    private handleDisconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts && this.isRecording) {
            this.reconnectAttempts++;
            this.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

            this.reconnectTimeout = setTimeout(() => {
                this.connectWebSocket().catch(() => {
                    this.log('Reconnection failed');
                });
            }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000));
        } else {
            this.config.onEvent({
                type: 'agent_status',
                payload: { status: 'idle' }
            });
        }
    }

    private async startAudioCapture(): Promise<void> {
        try {
            this.log('Requesting microphone access...');

            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this.log('Microphone access granted');

            // Configurar MediaRecorder
            const mimeType = this.getSupportedMimeType();
            this.log('Using MIME type:', mimeType);

            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType,
                audioBitsPerSecond: 16000
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && this.ws?.readyState === WebSocket.OPEN) {
                    // Enviar audio chunk
                    this.sendAudioChunk(event.data);
                }
            };

            this.mediaRecorder.onerror = (error) => {
                this.log('MediaRecorder error:', error);
            };

            this.mediaRecorder.start(100); // Enviar chunks cada 100ms
            this.isRecording = true;
            this.log('Audio recording started');

        } catch (error) {
            this.log('Error starting audio capture:', error);
            throw new Error('Microphone access denied or not available');
        }
    }

    private getSupportedMimeType(): string {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return '';
    }

    private sendAudioChunk(audioBlob: Blob) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            // Convertir Blob a ArrayBuffer y enviarlo
            audioBlob.arrayBuffer().then(buffer => {
                this.ws?.send(buffer);
            });
        }
    }

    private sendMessage(message: LevelLabsMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            this.log('Sent message:', message.type);
        }
    }

    private handleServerMessage(data: string | Blob) {
        // Si es un Blob, es audio de respuesta
        if (data instanceof Blob) {
            this.log('Received audio response');
            this.playAudioResponse(data);
            return;
        }

        try {
            const message: LevelLabsMessage = JSON.parse(data);
            this.log('Received message:', message.type);

            switch (message.type) {
                case 'transcription':
                    // Transcripción parcial o final
                    this.log('Transcription:', message.text);
                    this.config.onEvent({
                        type: 'agent_response',
                        payload: {
                            text: message.text || '',
                            isFinal: false
                        }
                    });
                    break;

                case 'intent':
                    // El servidor identificó la intención del usuario
                    this.log('Intent detected:', message.intent, message.entities);
                    this.config.onEvent({
                        type: 'agent_status',
                        payload: { status: 'processing' }
                    });
                    this.processIntent(message);
                    break;

                case 'audio_response':
                    // El servidor envió URL de audio TTS
                    this.config.onEvent({
                        type: 'agent_status',
                        payload: { status: 'speaking' }
                    });
                    if (message.audioUrl) {
                        this.playAudioFromUrl(message.audioUrl);
                    }
                    break;

                case 'complete':
                    // Interacción completada
                    this.log('Interaction complete');
                    this.config.onEvent({
                        type: 'agent_status',
                        payload: { status: 'listening' }
                    });
                    break;

                case 'error':
                    this.log('Server error:', message.error);
                    this.config.onEvent({
                        type: 'agent_status',
                        payload: { status: 'idle' }
                    });
                    break;

                default:
                    this.log('Unknown message type:', message.type);
            }
        } catch (error) {
            this.log('Error parsing server message:', error);
        }
    }

    private processIntent(message: LevelLabsMessage) {
        const { intent, entities } = message;

        if (!intent) return;

        this.log('Processing intent:', intent, entities);

        // Mapear intenciones del servidor a VoiceEvents
        switch (intent) {
            case 'navigate_menu':
            case 'navigate_to_section':
                this.config.onEvent({
                    type: 'navigate_to_section',
                    payload: {
                        section_name: entities?.category || entities?.section_name || 'comidas',
                        context_data: entities?.context || ''
                    }
                });
                break;

            case 'add_to_cart':
            case 'update_order_cart':
                this.config.onEvent({
                    type: 'update_order_cart',
                    payload: {
                        action: 'add',
                        items: (entities?.items || []).map((item: any) => ({
                            item_name: item.name || item.item_name,
                            quantity: item.quantity || 1,
                            notes: item.notes || '',
                            assigned_to: item.assigned_to,
                            modifications: item.modifications || []
                        }))
                    }
                });
                break;

            case 'split_payment':
                this.config.onEvent({
                    type: 'split_payment',
                    payload: {
                        splits: entities?.splits || []
                    }
                });
                break;

            case 'manage_billing':
                this.config.onEvent({
                    type: 'manage_billing',
                    payload: {
                        method: entities?.method || 'full_table',
                        payer: entities?.payer,
                        payment_type: entities?.payment_type
                    }
                });
                break;

            case 'confirm_order':
                this.config.onEvent({
                    type: 'confirm_order',
                    payload: {}
                });
                break;

            case 'modification_confirmation':
                this.config.onEvent({
                    type: 'modification_confirmation',
                    payload: {
                        dish_name: entities?.dish_name || '',
                        modifications: entities?.modifications || [],
                        message: entities?.message || ''
                    }
                });
                break;

            default:
                this.log('Unhandled intent:', intent);
        }
    }

    private playAudioResponse(audioBlob: Blob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        this.playAudioFromUrl(audioUrl);
    }

    private playAudioFromUrl(url: string) {
        const audio = new Audio(url);
        audio.play().catch(error => {
            this.log('Error playing audio:', error);
        });

        audio.onended = () => {
            this.log('Audio playback finished');
            this.config.onEvent({
                type: 'agent_status',
                payload: { status: 'listening' }
            });
        };
    }

    isActive(): boolean {
        return this.isRecording && this.ws?.readyState === WebSocket.OPEN;
    }

    stop(): void {
        this.log('Stopping voice client...');
        this.isRecording = false;

        // Detener grabación
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;

        // Cerrar stream de audio
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Cerrar AudioContext
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Cerrar WebSocket
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        // Cancelar reconexión pendiente
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.log('Voice client stopped');

        this.config.onEvent({
            type: 'agent_status',
            payload: { status: 'idle' }
        });
    }
}
