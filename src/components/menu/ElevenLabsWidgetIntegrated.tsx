'use client';

import { useEffect, useRef } from 'react';

interface ElevenLabsWidgetIntegratedProps {
    agentId: string;
    onNavigate?: (section: string) => void;
    onAddToCart?: (item: any) => void;
    onAction?: (action: string, data: any) => void;
}

export default function ElevenLabsWidgetIntegrated({
    agentId,
    onNavigate,
    onAddToCart,
    onAction
}: ElevenLabsWidgetIntegratedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);

    useEffect(() => {
        // 1. Cargar script del widget
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
        script.async = true;
        script.type = 'text/javascript';

        script.onload = () => {
            console.log('✅ ElevenLabs widget cargado');
            initializeWidget();
        };

        script.onerror = () => {
            console.error('❌ Error cargando widget de ElevenLabs');
        };

        document.body.appendChild(script);

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [agentId]);

    const initializeWidget = () => {
        if (!containerRef.current) return;

        // Crear elemento del widget
        const widget = document.createElement('elevenlabs-convai');
        widget.setAttribute('agent-id', agentId);

        // Escuchar eventos del widget (si ElevenLabs los soporta)
        widget.addEventListener('message', handleWidgetMessage);
        widget.addEventListener('transcription', handleTranscription);
        widget.addEventListener('response', handleResponse);

        containerRef.current.appendChild(widget);
        widgetRef.current = widget;

        // Polling para detectar texto del widget y parsearlo
        startMessagePolling();
    };

    const handleWidgetMessage = (event: any) => {
        console.log('📨 Widget message:', event.detail);
        parseAgentResponse(event.detail);
    };

    const handleTranscription = (event: any) => {
        console.log('🎤 Transcription:', event.detail);
    };

    const handleResponse = (event: any) => {
        console.log('🤖 Agent response:', event.detail);
        parseAgentResponse(event.detail);
    };

    const parseAgentResponse = (response: any) => {
        // Intentar parsear JSON del texto del agente
        const text = typeof response === 'string' ? response : response?.text || '';

        try {
            // El agente debería devolver JSON
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                console.log('📊 Parsed action:', data);
                executeAction(data);
            }
        } catch (error) {
            // Si no es JSON, intentar detectar comandos por palabras clave
            detectCommandFromText(text);
        }
    };

    const executeAction = (data: any) => {
        switch (data.type) {
            case 'navigate_to_section':
                console.log('🧭 Navegando a:', data.payload.section_name);
                onNavigate?.(data.payload.section_name);
                onAction?.('navigate', data.payload);
                break;

            case 'update_order_cart':
                console.log('🛒 Añadiendo al carrito:', data.payload.items);
                data.payload.items.forEach((item: any) => {
                    onAddToCart?.(item);
                });
                onAction?.('addToCart', data.payload);
                break;

            case 'confirm_order':
                console.log('✅ Confirmando pedido');
                onAction?.('confirmOrder', {});
                break;

            case 'split_payment':
                console.log('💳 Pago dividido:', data.payload.splits);
                onAction?.('splitPayment', data.payload);
                break;

            default:
                console.log('❓ Acción desconocida:', data.type);
        }
    };

    const detectCommandFromText = (text: string) => {
        const lowerText = text.toLowerCase();

        // Navegación
        if (lowerText.includes('bocadillos')) {
            onNavigate?.('bocadillos');
        } else if (lowerText.includes('entrantes')) {
            onNavigate?.('entrantes');
        } else if (lowerText.includes('postres')) {
            onNavigate?.('postres');
        } else if (lowerText.includes('bebidas')) {
            onNavigate?.('bebidas');
        } else if (lowerText.includes('carrito') || lowerText.includes('ticket')) {
            onNavigate?.('cart');
        }

        // Añadir al carrito (simple)
        if (lowerText.includes('ensalada')) {
            onAddToCart?.({ item_name: 'ensalada de cabra', quantity: 1 });
        } else if (lowerText.includes('croquetas')) {
            onAddToCart?.({ item_name: 'croquetas', quantity: 1 });
        }

        // Confirmar
        if (lowerText.includes('confirmar') || lowerText.includes('enviar pedido')) {
            onAction?.('confirmOrder', {});
        }
    };

    const startMessagePolling = () => {
        // Observar cambios en el DOM del widget para detectar mensajes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node: any) => {
                    if (node.textContent) {
                        parseAgentResponse(node.textContent);
                    }
                });
            });
        });

        if (containerRef.current) {
            observer.observe(containerRef.current, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                bottom: '100px',
                right: '20px',
                zIndex: 9999
            }}
        />
    );
}
