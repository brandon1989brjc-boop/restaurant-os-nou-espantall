'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';

interface UseVapiProps {
    onNavigate: (section: string) => void;
    onItemFound: (item: any) => void;
    onCartClear?: () => void;
}

export function useVapi({ onNavigate, onItemFound, onCartClear }: UseVapiProps) {
    const [vapi, setVapi] = useState<Vapi | null>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [volume, setVolume] = useState(0);

    // Inicializar Vapi una sola vez
    useEffect(() => {
        const vapiInstance = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '');
        setVapi(vapiInstance);

        return () => {
            vapiInstance.stop();
        };
    }, []);

    useEffect(() => {
        if (!vapi) return;

        vapi.on('call-start', () => {
            setIsCalling(true);
            console.log('Vapi Call Started');
        });

        vapi.on('call-end', () => {
            setIsCalling(false);
            setIsSpeaking(false);
            console.log('Vapi Call Ended');
        });

        vapi.on('speech-start', () => {
            setIsSpeaking(true);
        });

        vapi.on('speech-end', () => {
            setIsSpeaking(false);
        });

        vapi.on('message', (message) => {
            if (message.type === 'transcript' && message.transcriptType === 'partial') {
                setTranscript(message.transcript);
            }

            // Manejar llamadas a herramientas (Tool Calls) desde vAPI
            if (message.type === 'tool-calls') {
                const toolCalls = message.toolCalls;

                toolCalls.forEach((toolCall: any) => {
                    const { name, args } = toolCall;

                    if (name === 'agregar_item') {
                        onItemFound({
                            id: args.item_id,
                            quantity: args.quantity || 1,
                            modifications: args.modifications?.map((m: any) =>
                                `${m.type === 'remove' ? 'Sin' : 'Con'} ${m.content}`
                            )
                        });
                    }
                    else if (name === 'navegar') {
                        onNavigate(args.section);
                    }
                    else if (name === 'limpiar_carrito' && onCartClear) {
                        onCartClear();
                    }
                });
            }
        });

        vapi.on('volume-level', (level) => {
            setVolume(level);
        });

        vapi.on('error', (error) => {
            console.error('Vapi Error:', error);
            setIsCalling(false);
        });
    }, [vapi, onNavigate, onItemFound, onCartClear]);

    const toggleCall = useCallback(async () => {
        if (!vapi) return;

        if (isCalling) {
            vapi.stop();
        } else {
            const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
            if (assistantId) {
                await vapi.start(assistantId);
            } else {
                console.error('VAPI Assistant ID missing');
            }
        }
    }, [vapi, isCalling]);

    return {
        isCalling,
        isSpeaking,
        transcript,
        volume,
        toggleCall,
        vapi
    };
}
