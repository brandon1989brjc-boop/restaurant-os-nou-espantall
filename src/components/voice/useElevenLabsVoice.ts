'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState } from 'react';
import { useOrderStore } from '@/stores/useOrderStore';

interface ElevenLabsVoiceProps {
    agentId: string;
    onNavigate: (section: string) => void;
}

export function useElevenLabsVoice({ agentId, onNavigate }: ElevenLabsVoiceProps) {
    const addItem = useOrderStore(state => state.addItem);
    const [isConnecting, setIsConnecting] = useState(false);

    const conversation = useConversation({
        onConnect: () => {
            console.log('✅ Connected to ElevenLabs');
            setIsConnecting(false);
        },
        onDisconnect: () => {
            console.log('👋 Disconnected from ElevenLabs');
            setIsConnecting(false);
        },
        onMessage: (message: any) => {
            console.log('🤖 ElevenLabs Message:', message);
            // Handle conversation tools/logic here if needed
        },
        onError: (error: any) => {
            console.error('❌ ElevenLabs Error:', error);
            setIsConnecting(false);
        }
    });

    const toggleSession = useCallback(async () => {
        if (conversation.status === 'connected') {
            await conversation.endSession();
        } else {
            setIsConnecting(true);
            try {
                // Ensure AudioContext is active for mobile browsers
                if (typeof window !== 'undefined') {
                    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                    if (AudioContextClass) {
                        const ctx = new AudioContextClass();
                        if (ctx.state === 'suspended') {
                            await ctx.resume();
                        }
                    }
                }

                await (conversation as any).startSession({
                    agentId: agentId,
                    connectionType: 'websocket'
                });
            } catch (error) {
                console.error('Failed to start voice session:', error);
                setIsConnecting(false);
            }
        }
    }, [conversation, agentId]);

    return {
        status: conversation.status,
        isConnecting,
        toggleSession,
        audioLevel: (conversation as any).audioLevel,
        isSpeaking: (conversation as any).isSpeaking
    };
}
