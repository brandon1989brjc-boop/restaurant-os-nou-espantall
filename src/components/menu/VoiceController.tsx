'use client';

import { useState, useEffect } from 'react';
import { useNativeVoice } from '@/components/voice/useNativeVoice';
import { useOrderStore } from '@/stores/useOrderStore';

interface VoiceControllerProps {
    onEvent: (event: any) => void;
}

export default function VoiceController({ onEvent }: VoiceControllerProps) {
    const { addItem } = useOrderStore(); // Para añadir directo si queremos, o pasar evento

    // ➤ CEREBRO NATIVO (Adiós ElevenLabs)
    const {
        isListening,
        isProcessing,
        isSpeaking,
        transcript,
        toggleListening,
        hasSupport
    } = useNativeVoice({
        onNavigate: (section) => {
            onEvent({ type: 'navigate_to_section', payload: { section_name: section } });
        },
        onItemFound: (item) => {
            // Enviamos un evento especial para que Page.tsx maneje el click (y abra modal si es necesario)
            // Simulamos un click en el item
            onEvent({ type: 'native_item_found', payload: { item } });
        }
    });

    const isActive = isListening || isProcessing || isSpeaking;

    return (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xl px-4 pointer-events-none">
            {/* ESTADO DEL CEREBRO NATIVO */}
            <div className={`pointer-events-auto transition-all duration-700 ease-out ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-95'}`}>
                {isActive && (
                    <div className="bg-gray-900/90 backdrop-blur-xl px-8 py-5 rounded-[2rem] shadow-2xl border border-white/10 flex items-center gap-6">
                        <div className="relative">
                            <button
                                onClick={toggleListening}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isSpeaking ? 'bg-green-500' : isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`}
                            >
                                {isSpeaking ? (
                                    <div className="flex gap-1 items-center h-4">
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite] h-full"></div>
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite_0.1s] h-2/3"></div>
                                        <div className="w-1 bg-white animate-[music-bar_0.5s_ease-in-out_infinite_0.2s] h-full"></div>
                                    </div>
                                ) : (
                                    <div className="w-4 h-4 rounded-sm bg-white"></div>
                                )}
                            </button>
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Cerebro Local v1.0</span>
                                <div className="h-[1px] flex-1 bg-white/10"></div>
                            </div>
                            <p className="text-white font-bold text-lg leading-tight min-h-[1.5rem]">
                                {isSpeaking ? "Hablando..." : isProcessing ? "Pensando..." : transcript || "Te escucho..."}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ERROR DE SOPORTE */}
            {!hasSupport && (
                <div className="mt-4 pointer-events-auto bg-yellow-600 px-6 py-3 rounded-full text-white font-bold text-center shadow-lg">
                    Tu navegador no soporta Voz Nativa (Usa Chrome/Edge)
                </div>
            )}

            {/* BOTÓN MICROFONO PRINCIPAL */}
            {!isActive && hasSupport && (
                <div className="fixed bottom-8 right-8 pointer-events-auto z-50">
                    <button
                        id="mic-trigger"
                        onClick={toggleListening}
                        className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform animate-bounce-slow"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
