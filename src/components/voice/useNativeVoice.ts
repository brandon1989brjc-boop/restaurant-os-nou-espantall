'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
// import { NativeBrain, NativeIntent } from '@/lib/voice/NativeBrain';
import { useMenu } from '@/hooks/useMenu';
import { useOrderStore } from '@/stores/useOrderStore';
import { useSound } from '@/hooks/useSound';

interface UseNativeVoiceProps {
    onNavigate: (section: string) => void;
    onItemFound: (item: any) => void;
}

export function useNativeVoice({ onNavigate, onItemFound }: UseNativeVoiceProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');

    // Necesitamos el menú actualizado para el cerebro
    // const { allDishes } = useMenu(); // Ya no necesitamos allDishes localmente para el cerebro, solo para referencias si quisiéramos
    const { addItem } = useOrderStore();
    // const brainRef = useRef<NativeBrain | null>(null);
    const recognitionRef = useRef<any>(null);
    const playSound = useSound(); // Feedback auditivo

    // Configurar Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false; // Queremos comandos cortos, no dictado largo
                recognition.lang = 'es-ES';
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;

                recognition.onstart = () => {
                    setIsListening(true);
                    setTranscript("Escuchando...");
                    playSound();
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onresult = async (event: any) => {
                    const text = event.results[0][0].transcript;
                    setTranscript(text);
                    console.log("🎤 Escuchado:", text);
                    setIsProcessing(true);

                    await processCommandWithAI(text);

                    setIsProcessing(false);
                };

                recognitionRef.current = recognition;
            } else {
                console.error("Este navegador no soporta Web Speech API");
            }
        }
    }, []); // Dependencia vacía, ya no dependemos de allDishes para inicializar brain

    const speak = (text: string) => {
        if (typeof window === 'undefined') return;
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        // Seleccionar una voz más natural si es posible de Google
        const voices = window.speechSynthesis.getVoices();
        const googleVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('es'));
        if (googleVoice) utterance.voice = googleVoice;
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const processCommandWithAI = async (text: string) => {
        try {
            // Llamada al Nuevo Cerebro IA
            const response = await fetch('/api/voice/brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            const command = await response.json();
            console.log("🤖 IA Responde:", command);

            if (command.action === 'navigate') {
                speak(`Yendo a ${command.section}`);
                onNavigate(command.section);
            }
            else if (command.action === 'add_to_cart') {
                speak(`Añadiendo producto`);
                // Enviamos el ID y la cantidad, Page.tsx lo resolverá con "allDishes"
                onItemFound({ id: command.item_id, quantity: command.quantity || 1 });
            }
            else {
                speak("No he entendido bien, ¿puedes repetir?");
            }

        } catch (error) {
            console.error("Error procesando comando:", error);
            speak("Error de conexión con el cerebro.");
        }
    };

    const toggleListening = useCallback(() => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
        }
    }, [isListening]);

    return {
        isListening,
        isProcessing,
        isSpeaking,
        transcript,
        toggleListening,
        hasSupport: !!recognitionRef.current
    };
}
