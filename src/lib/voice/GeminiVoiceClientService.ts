import { SYSTEM_INSTRUCTION, TOOLS_SCHEMA } from './schemas';
import { VoiceEvent } from './types';
import { IVoiceClient, VoiceClientConfig } from './IVoiceClient';

export class GeminiVoiceClientService implements IVoiceClient {
    private socket: WebSocket | null = null;
    private config: VoiceClientConfig;
    private _isActive = false;
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private processor: ScriptProcessorNode | null = null;

    constructor(config: VoiceClientConfig) {
        this.config = config;
    }

    isActive() { return this._isActive; }

    async start() {
        if (this._isActive) return;

        try {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_AI_STUDIO_API_KEY || '';
            if (!apiKey) throw new Error("API Key Missing");

            this._isActive = true;
            const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BiDiGenerateContent?key=${apiKey}`;

            console.log('Connecting to Gemini Live...');
            this.socket = new WebSocket(url);

            this.socket.onopen = () => {
                console.log('Gemini Live Connected');
                this.sendSetup();
                this.startAudioCapture();
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleServerMessage(data);
                } catch (e) {
                    console.error('Error parsing Gemini message:', e);
                }
            };

            this.socket.onerror = (error) => {
                console.error('Gemini Socket Error:', error);
                this.config.onEvent({ type: 'agent_status', payload: { status: 'idle' } });
            };

            this.socket.onclose = (e) => {
                console.log('Gemini Live Closed:', e.code, e.reason);
                this.stop();
            };
        } catch (err) {
            console.error('Failed to start Gemini:', err);
            this._isActive = false;
            throw err;
        }
    }

    private sendSetup() {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        // Simplify tools for Gemini
        const geminiTools = [{
            function_declarations: TOOLS_SCHEMA.map(t => ({
                name: t.name,
                description: t.description,
                parameters: {
                    type: "OBJECT", // Gemini uses uppercase
                    properties: t.parameters.properties,
                    required: t.parameters.required
                }
            }))
        }];

        const setup = {
            setup: {
                model: "models/gemini-2.0-flash-exp",
                generation_config: {
                    response_modalities: ["AUDIO"]
                },
                tools: geminiTools
            }
        };

        console.log('Sending Setup:', setup);
        this.socket.send(JSON.stringify(setup));

        // Also send system instruction as a separate message if needed, but setup usually carries it
        // However, standard Gemini Live v1alpha setup has 'system_instruction'
        (setup.setup as any).system_instruction = {
            parts: [{ text: SYSTEM_INSTRUCTION }]
        };

        this.config.onEvent({ type: 'agent_status', payload: { status: 'listening' } });
    }

    private async startAudioCapture() {
        try {
            this.audioContext = new AudioContext({ sampleRate: 16000 });
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.processor.onaudioprocess = (e) => {
                if (this.socket?.readyState === WebSocket.OPEN) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const pcmData = this.floatTo16BitPCM(inputData);
                    const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));

                    this.socket.send(JSON.stringify({
                        realtime_input: {
                            media_chunks: [{
                                data: base64Data,
                                mime_type: "audio/pcm"
                            }]
                        }
                    }));
                }
            };
        } catch (err) {
            console.error('Audio capture error:', err);
        }
    }

    private floatTo16BitPCM(input: Float32Array) {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    }

    private handleServerMessage(message: any) {
        if (message.server_content?.model_turn?.parts) {
            for (const part of message.server_content.model_turn.parts) {
                if (part.inline_data) {
                    this.playAudioChunk(part.inline_data.data);
                }
            }
        }
        if (message.tool_call) {
            this.handleToolCalls(message.tool_call.function_calls);
        }
    }

    private audioQueue: string[] = [];
    private isPlaying = false;

    private playAudioChunk(base64: string) {
        this.audioQueue.push(base64);
        if (!this.isPlaying) {
            this.processAudioQueue();
        }
    }

    private async processAudioQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }

        this.isPlaying = true;
        this.config.onEvent({ type: 'agent_status', payload: { status: 'speaking' } });

        try {
            const base64 = this.audioQueue.shift()!;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

            const pcm = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(pcm.length);
            for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768;

            const buffer = this.audioContext!.createBuffer(1, float32.length, 16000);
            buffer.getChannelData(0).set(float32);

            const source = this.audioContext!.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext!.destination);
            source.onended = () => this.processAudioQueue();
            source.start();
        } catch (e) {
            console.error('Audio play error:', e);
            this.processAudioQueue();
        }
    }

    private handleToolCalls(calls: any[]) {
        for (const call of calls) {
            const { name, args } = call;
            console.log('Gemini Tool Call:', name, args);

            if (name === 'navigate_to_section') {
                this.config.onEvent({ type: 'navigate_to_section', payload: args });
            } else if (name === 'update_order_cart') {
                this.config.onEvent({ type: 'update_order_cart', payload: args });
            } else if (name === 'confirm_order') {
                this.config.onEvent({ type: 'confirm_order', payload: {} });
            }
        }

        // Gemini expects tool response
        this.socket?.send(JSON.stringify({
            tool_response: {
                function_responses: calls.map(c => ({
                    name: c.name,
                    response: { output: { success: true } }
                }))
            }
        }));
    }

    stop() {
        this._isActive = false;
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.mediaStream?.getTracks().forEach(t => t.stop());
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.config.onEvent({ type: 'agent_status', payload: { status: 'idle' } });
    }
}
