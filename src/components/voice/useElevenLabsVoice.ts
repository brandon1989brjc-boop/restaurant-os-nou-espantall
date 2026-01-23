'use client';

// @ts-ignore
import { useConversation } from '@11labs/react';
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
            console.log('✅ Conectado a ElevenLabs');
            setIsConnecting(false);
        },
        onDisconnect: () => {
            console.log('👋 Desconectado de ElevenLabs');
            setIsConnecting(false);
        },
        onMessage: (message: any) => {
            console.log('🤖 Mensaje de ElevenLabs:', message);
            handleAgentMessage(message);
        },
        onError: (error: any) => {
            console.error('❌ Error de ElevenLabs:', error);
            setIsConnecting(false);
        }
    });

    const handleAgentMessage = (message: any) => {
        console.log('🤖 Respuesta del agente:', message);
    };

    const toggleSession = useCallback(async () => {
        if (conversation.status === 'connected') {
            await conversation.endSession();
        } else {
            setIsConnecting(true);
            try {
                if (typeof window !== 'undefined') {
                    const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                    if (AudioContextClass) {
                        const ctx = new AudioContextClass();
                        await ctx.resume();
                    }
                }

                await (conversation as any).startSession({
                    agentId: agentId,
                    connectionType: 'websocket'
                });
            } catch (error) {
                console.error('Fallo al iniciar sesión de voz:', error);
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
