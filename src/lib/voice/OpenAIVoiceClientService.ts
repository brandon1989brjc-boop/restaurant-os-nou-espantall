import { TOOLS_SCHEMA, SYSTEM_INSTRUCTION } from './schemas';
import { VoiceEvent } from './types';
import { IVoiceClient, VoiceClientConfig } from './IVoiceClient';

export class OpenAIVoiceClientService implements IVoiceClient {
    private peerConnection: RTCPeerConnection | null = null;
    private dataChannel: RTCDataChannel | null = null;
    private localStream: MediaStream | null = null;
    private config: VoiceClientConfig;
    private _isActive = false;

    constructor(config: VoiceClientConfig) {
        this.config = config;
    }

    isActive() { return this._isActive; }

    async start() {
        if (this._isActive) return;
        this._isActive = true;

        try {
            // 1. Get Ephemeral Token
            const tokenResponse = await fetch('/api/voice/session', { method: 'POST' });
            const data = await tokenResponse.json();

            if (!data.client_secret?.value) {
                throw new Error('Failed to get ephemeral token');
            }
            const EPHEMERAL_KEY = data.client_secret.value;

            // 2. Initialize WebRTC
            this.peerConnection = new RTCPeerConnection();

            // Setup Audio Output (Remote Stream)
            this.peerConnection.ontrack = (e) => {
                const remoteStream = e.streams[0];
                const audio = new Audio();
                audio.srcObject = remoteStream;
                audio.autoplay = true;
                // Optional: Expose stream if UI wants to visualize it
                if (this.config.onAudioStream) {
                    this.config.onAudioStream(remoteStream);
                }
            };

            // Setup Microphone (Local Stream)
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.localStream.getTracks().forEach(track => {
                this.peerConnection?.addTrack(track, this.localStream!);
            });

            // Setup Data Channel
            this.dataChannel = this.peerConnection.createDataChannel("oai-events");
            this.setupDataChannel();

            // 3. Create Offer & Handshake
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            const baseUrl = 'https://api.openai.com/v1/realtime';
            const model = 'gpt-4o-realtime-preview-2024-12-17';

            const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
                method: 'POST',
                body: offer.sdp,
                headers: {
                    'Authorization': `Bearer ${EPHEMERAL_KEY}`,
                    'Content-Type': 'application/sdp',
                },
            });

            const answerSdp = await sdpResponse.text();
            const answer = { type: 'answer' as RTCSdpType, sdp: answerSdp };
            await this.peerConnection.setRemoteDescription(answer);

            this.config.onEvent({ type: 'agent_status', payload: { status: 'listening' } });

        } catch (error) {
            console.error('Failed to start voice session:', error);
            this.stop();
        }
    }

    private setupDataChannel() {
        if (!this.dataChannel) return;

        this.dataChannel.onopen = () => {
            console.log('Voice Data Channel Open');
            this.configureSession();
        };

        this.dataChannel.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                this.handleServerEvent(msg);
            } catch (err) {
                console.error('Error parsing voice event:', err);
            }
        };
    }

    private configureSession() {
        const event = {
            type: 'session.update',
            session: {
                instructions: SYSTEM_INSTRUCTION,
                tools: TOOLS_SCHEMA,
                tool_choice: 'auto',
            },
        };
        this.send(event);
    }

    private handleServerEvent(event: any) {
        if (event.type === 'response.function_call_arguments.done') {
            const { name, arguments: argsStr } = event;
            try {
                const args = JSON.parse(argsStr);
                console.log(`Tool Call: ${name}`, args);

                // Dispatch specific events based on tool name
                if (name === 'navigate_to_section') {
                    this.config.onEvent({ type: 'navigate_to_section', payload: args });
                } else if (name === 'update_order_cart') {
                    this.config.onEvent({ type: 'update_order_cart', payload: args });
                } else if (name === 'confirm_order') {
                    this.config.onEvent({ type: 'confirm_order', payload: {} });
                }

                // Technically we should send 'conversation.item.create' with tool output
                // to complete the loop, but for "Fire and Forget" UI commands, 
                // we might not need to if the agent just says "Done".
                // However, standard pattern is to send output.
                this.sendToolOutput(event.call_id, { status: 'success' }); // Mock output

            } catch (err) {
                console.error('Error parsing tool args:', err);
            }
        } else if (event.type === 'response.text.done') {
            // Only if text modality is enabled, usually audio is primary.
        }
    }

    private sendToolOutput(callId: string, output: any) {
        const event = {
            type: 'conversation.item.create',
            item: {
                type: 'function_call_output',
                call_id: callId,
                output: JSON.stringify(output),
            },
        };
        this.send(event);
        this.send({ type: 'response.create' }); // Trigger agent reaction to output
    }

    private send(event: any) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(event));
        }
    }

    stop() {
        this._isActive = false;
        this.localStream?.getTracks().forEach(t => t.stop());
        this.peerConnection?.close();
        this.peerConnection = null;
        this.config.onEvent({ type: 'agent_status', payload: { status: 'idle' } });
    }
}
