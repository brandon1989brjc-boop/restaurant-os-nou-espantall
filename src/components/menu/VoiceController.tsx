'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { IVoiceClient } from '@/lib/voice/IVoiceClient';
import { MockVoiceClientService } from '@/lib/voice/MockVoiceClientService';
import { LevelLabsVoiceClient } from '@/lib/voice/LevelLabsVoiceClient';
import { VoiceEvent } from '@/lib/voice/types';

interface VoiceControllerProps {
    onEvent: (event: VoiceEvent) => void;
}

export default function VoiceController({ onEvent }: VoiceControllerProps) {
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
    const [error, setError] = useState<string | null>(null);
    const serviceRef = useRef<IVoiceClient | null>(null);

    const stopAgent = useCallback(() => {
        if (serviceRef.current) {
            console.log('Stopping agent service...');
            serviceRef.current.stop();
        }
        setStatus('idle');
    }, []);

    const startAgent = useCallback(() => {
        if (serviceRef.current) {
            console.log('Starting agent service...');
            setError(null);
            setStatus('listening');
            serviceRef.current.start().catch(err => {
                console.error('Start error:', err);
                setError("Error al conectar con el servicio de voz");
                setStatus('idle');
            });
        }
    }, []);

    // Use a ref for the current onEvent to keep it stable inside the event listener
    const onEventRef = useRef(onEvent);
    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    useEffect(() => {
        // Determinar qué cliente usar basado en variables de entorno
        const voiceClientType = process.env.NEXT_PUBLIC_VOICE_CLIENT || 'mock';
        const wsUrl = process.env.NEXT_PUBLIC_LEVELLABS_WS_URL;
        const useMock = voiceClientType === 'mock' || !wsUrl;

        console.log(`🎤 Initializing voice client: ${useMock ? 'MOCK' : 'LEVELLABS'}`);

        if (useMock) {
            serviceRef.current = new MockVoiceClientService({
                onEvent: (event) => {
                    if (event.type === 'agent_status') {
                        setStatus(event.payload.status);
                    } else {
                        onEventRef.current(event);
                    }
                }
            });
        } else {
            serviceRef.current = new LevelLabsVoiceClient({
                wsUrl: wsUrl!,
                apiKey: process.env.NEXT_PUBLIC_LEVELLABS_API_KEY,
                restaurantId: process.env.NEXT_PUBLIC_RESTAURANT_ID || 'nou-espantall',
                debug: process.env.NEXT_PUBLIC_VOICE_DEBUG === 'true',
                onEvent: (event) => {
                    if (event.type === 'agent_status') {
                        setStatus(event.payload.status);
                    } else {
                        onEventRef.current(event);
                    }
                }
            });
        }

        const handleExternalToggle = (e: MouseEvent) => {
            console.log('External toggle triggered');

            setStatus(current => {
                if (current === 'idle') {
                    setTimeout(startAgent, 10);
                    return 'listening';
                } else {
                    setTimeout(stopAgent, 10);
                    return 'idle';
                }
            });
        };

        const micButton = document.getElementById('mic-trigger');
        micButton?.addEventListener('click', handleExternalToggle);

        return () => {
            micButton?.removeEventListener('click', handleExternalToggle);
            if (serviceRef.current) serviceRef.current.stop();
        };
    }, [startAgent, stopAgent]);

    const toggleAgent = () => {
        if (status === 'idle') {
            startAgent();
        } else {
            stopAgent();
        }
    };

    return (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4 pointer-events-none">
            <div className={`pointer-events-auto transition-all duration-700 ease-out ${status !== 'idle' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95'}`}>
                {status !== 'idle' && (
                    <div className="bg-gray-900/90 backdrop-blur-xl px-8 py-5 rounded-[2rem] shadow-2xl border border-white/10 flex items-center gap-6">
                        <div className="relative">
                            <button
                                onClick={toggleAgent}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${status === 'listening' || status === 'speaking' ? 'bg-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.6)]' : 'bg-gray-700'}`}
                            >
                                {status === 'speaking' ? (
                                    <div className="flex gap-1 items-center h-4">
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite] h-full"></div>
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite_0.1s] h-2/3"></div>
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite_0.2s] h-full"></div>
                                    </div>
                                ) : (
                                    <div className={`w-4 h-4 rounded-full bg-white ${status === 'listening' ? 'animate-pulse' : ''}`}></div>
                                )}
                            </button>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Agente Nou Espantall (MOCK)</span>
                                <div className="h-[1px] flex-1 bg-white/10"></div>
                            </div>
                            <p className="text-white font-bold text-lg leading-tight min-h-[1.5rem]">
                                {status === 'listening' && "Escuchando (Modo Prueba)..."}
                                {status === 'speaking' && "Respondiendo..."}
                                {status === 'processing' && "Pensando..."}
                            </p>
                        </div>
                    </div>
                )}
            </div>
            {error && (
                <div className="mt-4 pointer-events-auto bg-red-500/90 backdrop-blur-xl px-6 py-3 rounded-2xl text-white text-sm font-bold shadow-xl">
                    {error}
                </div>
            )}
        </div>
    );
}
