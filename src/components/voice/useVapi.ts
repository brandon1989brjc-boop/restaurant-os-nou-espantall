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
                const toolCallList = message.toolCallList || [];

                toolCallList.forEach((toolCall: any) => {
                    const name = toolCall.function.name;
                    let args = toolCall.function.arguments;

                    if (typeof args === 'string') {
                        try { args = JSON.parse(args); } catch (e) { args = {}; }
                    }

                    console.log(`🔧 Ejecutando herramienta (Client): ${name}`, args);
                    let result: any = { ok: true };

                    if (name === 'agregar_item') {
                        onItemFound({
                            id: args.item_id,
                            quantity: args.quantity || 1,
                            comensal: args.comensal || 'General',
                            modifications: args.modifications?.map((m: any) =>
                                `${m.type === 'remove' ? 'Sin' : 'Con'} ${m.content}`
                            )
                        });
                        result = { ok: true, status: "Agregado al carrito localmente", item: args.item_id, comensal: args.comensal };
                    }
                    else if (name === 'navegar') {
                        const sectionMap: Record<string, string> = {
                            'carrito': 'cart',
                            'inicio': 'home',
                            'compartir': 'compartir'
                        };
                        onNavigate(sectionMap[args.section] || args.section);
                        result = { ok: true, navigatedTo: args.section };
                    }
                    else if (name === 'limpiar_carrito' && onCartClear) {
                        onCartClear();
                        result = { ok: true, status: "Carrito vaciado" };
                    }
                    else if (name === 'obtener_total') {
                        // En local calculamos el total del store
                        const state = (window as any).useOrderStore?.getState?.();
                        if (state) {
                            const total = state.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
                            result = { ok: true, total: total.toFixed(2), unit: 'EUR' };
                        } else {
                            result = { ok: true, info: "Consultando base de datos..." };
                        }
                    }

                    // ⭐ ENVIAR RESULTADO DE VUELTA A VAPI MANUALMENTE (Híbrido)
                    (vapi as any)?.send({
                        type: 'add-message',
                        message: {
                            role: 'tool',
                            toolCallId: toolCall.id,
                            content: JSON.stringify(result)
                        }
                    });
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
