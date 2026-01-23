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
            console.log('✅ Conectado a ElevenLabs');
            setIsConnecting(false);
        },
        onDisconnect: () => {
            console.log('👋 Desconectado de ElevenLabs');
            setIsConnecting(false);
        },
        onMessage: (message) => {
            console.log('🤖 Mensaje de ElevenLabs:', message);
            // Si ElevenLabs envía una acción estructurada (via MCP o JSON en habla)
            handleAgentMessage(message);
        },
        onError: (error) => {
            console.error('❌ Error de ElevenLabs:', error);
            setIsConnecting(false);
        }
    });

    const handleAgentMessage = (message: any) => {
        // En ElevenLabs ConvAI, las herramientas ejecutan acciones via MCP
        // Este hook escucha si el agente habla sobre una acción realizada
        console.log('🤖 Escuchando respuesta del agente:', message);
    };

    const toggleSession = useCallback(async () => {
        if (conversation.status === 'connected') {
            await conversation.endSession();
        } else {
            setIsConnecting(true);
            try {
                // Pre-warm de audio (Evita bloqueos de navegador en Windows)
                if (typeof window !== 'undefined') {
                    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    await ctx.resume();
                }

                await conversation.startSession({
                    agentId: agentId
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
        audioLevel: conversation.audioLevel,
        isSpeaking: conversation.isSpeaking
    };
}
