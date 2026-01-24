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
                        // 1. Validar cantidad (entre 1 y 20)
                        let quantity = parseInt(args.quantity) || 1;
                        if (quantity < 1) quantity = 1;
                        if (quantity > 20) quantity = 1; // Si es absurdo, por defecto 1

                        // 2. Buscar el ítem real en el menú expuesto globalmente (Búsqueda Flexible)
                        const allDishes = (window as any).allDishes || [];
                        const searchTerm = args.item_id.toLowerCase().trim();

                        const matchedDish = allDishes.find((d: any) =>
                            d.id.toLowerCase() === searchTerm ||
                            d.name.es?.toLowerCase().includes(searchTerm) ||
                            d.name.en?.toLowerCase().includes(searchTerm) ||
                            (d.keywords && d.keywords.some((k: string) => k.toLowerCase().includes(searchTerm)))
                        );

                        if (!matchedDish) {
                            result = { ok: false, mensaje: `Lo siento, no he podido encontrar el plato "${args.item_id}" en la carta.` };
                        } else {
                            onItemFound({
                                ...matchedDish,
                                quantity,
                                comensal: args.comensal || 'General',
                                modifications: args.modifications?.map((m: any) =>
                                    `${m.type === 'remove' ? 'Sin' : 'Con'} ${m.content}`
                                )
                            });

                            result = {
                                ok: true,
                                mensaje: `Añadido ${quantity} ${matchedDish.name.es || matchedDish.name} para ${args.comensal || 'General'}`,
                                plato: matchedDish.name.es,
                                precio: (matchedDish.price * quantity).toFixed(2),
                                moneda: 'EUR'
                            };
                        }
                    }
                    else if (name === 'navegar') {
                        const allDishes = (window as any).allDishes || [];
                        const sectionMap: Record<string, string> = {
                            'carrito': 'cart',
                            'inicio': 'home',
                            'compartir': 'para_compartir',
                            'para compartir': 'para_compartir',
                            'cuenta': 'cuenta',
                            'bocadillos': 'bocadillos',
                            'entrantes': 'entrantes',
                            'postres': 'postres'
                        };
                        const target = sectionMap[args.section.toLowerCase()] || args.section.toLowerCase();
                        onNavigate(target);

                        // Encontrar platos de esa sección para que el asistente pueda describirlos
                        const sectionDishes = allDishes.filter((d: any) =>
                            d.category?.toLowerCase() === args.section.toLowerCase()
                        ).slice(0, 3);

                        const platosNombres = sectionDishes.map((d: any) => d.name.es || d.name).join(", ");

                        result = {
                            ok: true,
                            mensaje: `¡Aquí tienes! Ya estamos en la sección de ${args.section}.`,
                            productos_disponibles: platosNombres || "Varios platos disponibles"
                        };
                    }
                    else if (name === 'limpiar_carrito' && onCartClear) {
                        onCartClear();
                        result = { ok: true, mensaje: "He vaciado el carrito por completo." };
                    }
                    else if (name === 'obtener_total') {
                        const state = (window as any).useOrderStore?.getState?.();
                        if (state) {
                            const total = state.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
                            result = {
                                ok: true,
                                total: total.toFixed(2),
                                mensaje: `El total de la mesa es de ${total.toFixed(2)} euros.`,
                                moneda: 'EUR'
                            };
                        } else {
                            result = { ok: false, mensaje: "No puedo acceder a la cuenta en este momento." };
                        }
                    }

                    // ⭐ RESPUESTA AL ASISTENTE
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
