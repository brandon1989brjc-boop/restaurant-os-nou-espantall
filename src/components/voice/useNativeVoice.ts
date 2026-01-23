'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { NativeBrain, NativeIntent } from '@/lib/voice/NativeBrain';
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
    const { allDishes } = useMenu();
    const { addItem } = useOrderStore();
    const brainRef = useRef<NativeBrain | null>(null);
    const recognitionRef = useRef<any>(null);
    const playSound = useSound(); // Feedback auditivo

    // Inicializar el cerebro cuando carga el menú
    useEffect(() => {
        if (allDishes.length > 0) {
            brainRef.current = new NativeBrain(allDishes);
            console.log("🧠 Native Brain Cargado con", allDishes.length, "platos");
        }
    }, [allDishes]);

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
                    playSound(); // Beep de inicio
                };

                recognition.onend = () => {
                    setIsListening(false);
                };

                recognition.onresult = async (event: any) => {
                    const text = event.results[0][0].transcript;
                    setTranscript(text);
                    console.log("🎤 Escuchado:", text);
                    setIsProcessing(true);

                    await processCommand(text);

                    setIsProcessing(false);
                };

                recognitionRef.current = recognition;
            } else {
                console.error("Este navegador no soporta Web Speech API");
            }
        }
    }, [allDishes]); // Dependencia de items para regenerar el proceso si cambia, aunque el brainRef lo maneja interno

    const speak = (text: string) => {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    const processCommand = async (text: string) => {
        if (!brainRef.current) return;

        const intent = brainRef.current.process(text);
        console.log("🤖 Intención detectada:", intent);

        switch (intent.type) {
            case 'NAVIGATE':
                speak(`Yendo a ${intent.section}`);
                onNavigate(intent.section);
                break;

            case 'ADD_TO_CART':
                // Aquí la magia: Si el usuario dice "quiero hamburguesa", y hay modificadores,
                // la UI debería abrir el modal. NativeBrain nos da el ITEM completo.
                speak(`Añadiendo ${intent.item.name}`);

                // Opción A: Añadir directo (si no tiene modificadores)
                // Opción B: Abrir modal (si tiene)
                // Para simplificar esta demo nativa, delegamos a la UI que decida
                onItemFound(intent.item);
                break;

            case 'BILL':
                speak("Marchando la cuenta");
                onNavigate('cuenta');
                break;

            case 'UNKNOWN':
                speak("No he entendido bien, ¿puedes repetir?");
                break;
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
