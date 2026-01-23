'use client';

import { useEffect, useRef } from 'react';

interface ElevenLabsWidgetProps {
    agentId: string;
}

export default function ElevenLabsWidget({ agentId }: ElevenLabsWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Cargar script del widget de ElevenLabs
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
        script.async = true;
        script.type = 'text/javascript';

        script.onload = () => {
            console.log('✅ ElevenLabs widget cargado correctamente');

            // Crear el elemento del widget después de cargar el script
            if (containerRef.current) {
                const widget = document.createElement('elevenlabs-convai');
                widget.setAttribute('agent-id', agentId);
                containerRef.current.appendChild(widget);
            }
        };

        script.onerror = () => {
            console.error('❌ Error al cargar widget de ElevenLabs');
        };

        document.body.appendChild(script);

        return () => {
            // Cleanup: remover script cuando el componente se desmonte
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            // Limpiar widget
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [agentId]);

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
