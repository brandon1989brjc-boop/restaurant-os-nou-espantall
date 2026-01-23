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
                        processCommandSemantically(finalTranscript);
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
        if (typeof window === 'undefined' || !text) return;

        // Detener cualquier habla previa
        window.speechSynthesis.cancel();

        setIsSpeaking(true);
        addLog('SYSTEM', `🔈 Hablando: ${text}`);

        const wasListening = shouldKeepListening;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        // Pequeño delay para que el hardware del micro se libere
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';

            // Buscar la mejor voz disponible
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.includes('es') && v.name.includes('Google'))
                || voices.find(v => v.lang.includes('es'))
                || voices[0];

            if (preferredVoice) utterance.voice = preferredVoice;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            utterance.onend = () => {
                setIsSpeaking(false);
                addLog('SYSTEM', '🔈 Fin de habla');
                if (wasListening) {
                    setTimeout(() => {
                        try { recognitionRef.current?.start(); } catch (e) { }
                    }, 200);
                }
            };

            utterance.onerror = (e) => {
                addLog('ERROR', 'Error en síntesis de voz', e);
                setIsSpeaking(false);
            };

            window.speechSynthesis.speak(utterance);
        }, 150);
    };

    const processCommandSemantically = async (text: string) => {
        setIsProcessing(true);
        addLog('BRAIN', 'Enviando a Cerebro Semántico (LLM)...', { text });

        try {
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error('Error en API de procesamiento');

            const result = await response.json();
            addLog('BRAIN', 'Entendimiento SEMÁNTICO recibido', result);

            if (result.action === 'navigate') {
                speak(result.response_text || `Yendo a ${result.section}`);
                onNavigate(result.section);
            }
            else if (result.action === 'add_to_cart' && result.items) {
                speak(result.response_text || '¡Marchando!');
                result.items.forEach((item: any) => {
                    onItemFound({
                        id: item.item_id,
                        quantity: item.quantity || 1,
                        modifications: item.modifications?.map((m: any) =>
                            `${m.type === 'remove' ? 'Sin' : 'Con'} ${m.content}`
                        )
                    });
                });
            }
            else if (result.action === 'unknown') {
                speak(result.response_text || 'No te he entendido del todo, ¿puedes repetir?');
            }

        } catch (error: any) {
            addLog('ERROR', 'Fallo en Cerebro Semántico', error.message);
            // Fallback al matcher local si el servidor falla (Regla 80/20)
            const localFallback = localMatcher.current?.match(text);
            if (localFallback && localFallback.action !== 'unknown') {
                addLog('SYSTEM', '⚠️ Usando Matcher Local de Emergencia');
                if (localFallback.action === 'navigate') onNavigate(localFallback.section!);
                if (localFallback.action === 'add_to_cart') {
                    onItemFound({
                        id: localFallback.item_id,
                        quantity: localFallback.quantity,
                        modifications: localFallback.modifications
                    });
                }
            }
        } finally {
            setIsProcessing(false);
        }
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
