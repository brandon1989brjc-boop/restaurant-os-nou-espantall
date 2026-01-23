'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '@/hooks/useSound';

interface UseNativeVoiceProps {
    onNavigate: (section: string) => void;
    onItemFound: (item: any) => void;
}

interface Log {
    timestamp: string;
    source: 'MIC' | 'BRAIN' | 'SYSTEM' | 'ERROR';
    message: string;
    data?: any;
}

import { LocalIntentMatcher } from '@/lib/voice/LocalIntentMatcher';
import menuData from '@/lib/menu.json';

export function useNativeVoice({ onNavigate, onItemFound }: UseNativeVoiceProps) {
    const [isListening, setIsListening] = useState(false);
    const [shouldKeepListening, setShouldKeepListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [logs, setLogs] = useState<Log[]>([]);
    const [apiStatus, setApiStatus] = useState<'ok' | 'error' | 'checking' | 'unknown'>('ok');

    const recognitionRef = useRef<any>(null);
    const playSound = useSound();

    // Web Audio API para visualización (Reporte 5.1)
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);

    const addLog = (source: Log['source'], message: string, data?: any) => {
        const newLog = {
            timestamp: new Date().toLocaleTimeString(),
            source,
            message,
            data
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50));
    };

    // 1. Preparar el Cerebro Local Permanente
    const localMatcher = useRef<LocalIntentMatcher | null>(null);
    useEffect(() => {
        const data: any = menuData;
        const simpleMenu = data.categories.flatMap((cat: any) =>
            cat.items.map((item: any) => ({
                id: item.id,
                name: item.name.es,
                category: cat.name.es,
                keywords: item.keywords || []
            }))
        ).concat(data.featuredDish ? [{
            id: data.featuredDish.id,
            name: data.featuredDish.name.es,
            category: 'Especialidad',
            keywords: data.featuredDish.keywords || []
        }] : []);

        localMatcher.current = new LocalIntentMatcher(simpleMenu);
    }, []);

    // 2. Configurar Speech Recognition Robusta
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.lang = 'es';
                recognition.interimResults = true;
                recognition.maxAlternatives = 1;

                recognition.onstart = () => {
                    setIsListening(true);
                    setTranscript("Escuchando...");
                    initAudioContext(); // Desbloquear audio (Reporte 5.3)
                };

                recognition.onend = () => {
                    setIsListening(false);
                    if (shouldKeepListening && !isProcessing && !isSpeaking) {
                        setTimeout(() => {
                            try { recognition.start(); } catch (e) { }
                        }, 100);
                    }
                };

                recognition.onresult = async (event: any) => {
                    let interimTranscript = '';
                    let finalTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }

                    if (interimTranscript) setTranscript(interimTranscript);

                    if (finalTranscript) {
                        setTranscript(finalTranscript);
                        addLog('MIC', `Escuchado: "${finalTranscript}"`);
                        processCommandLocally(finalTranscript);
                    }
                };

                recognition.onerror = (event: any) => {
                    addLog('ERROR', 'Error de reconocimiento', event.error);
                };

                recognitionRef.current = recognition;
            }
        }
    }, [shouldKeepListening, isProcessing, isSpeaking]);

    const initAudioContext = async () => {
        if (typeof window === 'undefined') return;

        try {
            if (!audioContextRef.current) {
                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                audioContextRef.current = new AudioContext();
            }

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            if (!analyserRef.current) {
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.fftSize = 256;

                // Capturar Micro para visualización (Reporte 5.1)
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(analyserRef.current);
                addLog('SYSTEM', 'Visualizador de audio conectado');
            }
        } catch (e) {
            addLog('ERROR', 'Fallo al iniciar visualización de audio', e);
        }
    };

    const speak = (text: string) => {
        if (typeof window === 'undefined') return;
        setIsSpeaking(true);
        addLog('SYSTEM', `${text}`);

        const wasListening = shouldKeepListening;
        if (recognitionRef.current) recognitionRef.current.stop();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';

        utterance.onend = () => {
            setIsSpeaking(false);
            if (wasListening) {
                setTimeout(() => { try { recognitionRef.current?.start(); } catch (e) { } }, 100);
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    const processCommandLocally = async (text: string) => {
        if (!localMatcher.current) return;

        setIsProcessing(true);
        addLog('BRAIN', 'Analizando nativamente...', { text });

        const command = localMatcher.current.match(text);
        addLog('BRAIN', 'Intención detectada localmente', command);

        if (command && command.action !== 'unknown') {
            if (command.action === 'navigate') {
                addLog('SYSTEM', `Navegando a ${command.section}`);
                speak(`Yendo a ${command.section}`);
                onNavigate(command.section || 'home');
            }
            else if (command.action === 'add_to_cart') {
                addLog('SYSTEM', `Añadiendo producto ${command.item_id}`);
                speak(`¡Marchando!`);
                onItemFound({
                    id: command.item_id,
                    quantity: command.quantity || 1,
                    modifications: command.modifications
                });
            }
        } else {
            // Si el motor local no está seguro, podríamos silenciarlo o pedir aclaración.
            // Siguiendo el reporte de autonomía, evitaremos ruidos innecesarios.
            addLog('SYSTEM', '❓ Intención no clara, ignorando para evitar falsos positivos');
        }

        setIsProcessing(false);
    };

    const toggleListening = useCallback(() => {
        if (isListening || shouldKeepListening) {
            setShouldKeepListening(false);
            recognitionRef.current?.stop();
            addLog('SYSTEM', 'Escucha detenida manualmente');
            playSound(); // Sonido de apagado
        } else {
            setShouldKeepListening(true);
            recognitionRef.current?.start();
            addLog('SYSTEM', 'Escucha iniciada (Modo Continuo)');
            playSound(); // Sonido de encendido
        }
    }, [isListening, shouldKeepListening]);

    const forceReconnect = () => {
        recognitionRef.current?.stop();
        setTimeout(() => recognitionRef.current?.start(), 500);
    };

    const clearLogs = () => setLogs([]);

    return {
        isListening,
        isProcessing,
        isSpeaking,
        transcript,
        toggleListening,
        hasSupport: !!recognitionRef.current,
        // Debug props
        logs,
        apiStatus,
        clearLogs,
        forceReconnect,
        shouldKeepListening,
        analyser: analyserRef.current
    };
}
