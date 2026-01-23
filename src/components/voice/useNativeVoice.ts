'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSound } from '@/hooks/useSound';
import { useMachine } from '@xstate/react';
import { voiceMachine } from '@/lib/voice/voiceStateMachine';
import { LocalIntentMatcher } from '@/lib/voice/LocalIntentMatcher';
import { MenuFuzzyMatcher } from '@/lib/voice/MenuFuzzyMatcher';
import menuData from '@/lib/menu.json';

interface UseNativeVoiceProps {
    onNavigate: (section: string) => void;
    onItemFound: (item: any) => void;
    onClarify?: (options: any[], message?: string) => void;
}

interface Log {
    timestamp: string;
    source: 'MIC' | 'BRAIN' | 'SYSTEM' | 'ERROR';
    message: string;
    data?: any;
}

export function useNativeVoice({ onNavigate, onItemFound, onClarify }: UseNativeVoiceProps) {
    const [state, send] = useMachine(voiceMachine);
    const [shouldKeepListening, setShouldKeepListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [logs, setLogs] = useState<Log[]>([]);
    const [apiStatus, setApiStatus] = useState<'ok' | 'error' | 'checking' | 'unknown'>('ok');

    const isListening = state.matches('listening');
    const isProcessing = state.matches('processing');
    const isSpeaking = state.matches('speaking');

    const recognitionRef = useRef<any>(null);
    const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const localMatcher = useRef<LocalIntentMatcher | null>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const playSound = useSound();

    // Cargar voces de forma robusta
    useEffect(() => {
        const loadVoices = () => {
            const v = window.speechSynthesis.getVoices();
            if (v.length > 0) voicesRef.current = v;
        };
        loadVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const addLog = (source: Log['source'], message: string, data?: any) => {
        const newLog = {
            timestamp: new Date().toLocaleTimeString(),
            source,
            message,
            data
        };
        setLogs(prev => [newLog, ...prev].slice(0, 50));
    };

    const [history, setHistory] = useState<any[]>([]);
    const fuzzyMatcher = useRef<MenuFuzzyMatcher | null>(null);

    // 1. Preparar el Cerebro Local Permanente (Fallback)
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
        fuzzyMatcher.current = new MenuFuzzyMatcher(simpleMenu);
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
                    send({ type: 'START_LISTENING' });
                    setTranscript("Escuchando...");
                    initAudioContext();
                };

                recognition.onend = () => {
                    send({ type: 'STOP_LISTENING' });
                    if (shouldKeepListening && !isProcessing && !isSpeaking) {
                        setTimeout(() => {
                            try { recognition.start(); } catch (e) { }
                        }, 250);
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

                    if (interimTranscript) {
                        setTranscript(interimTranscript);
                        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                        silenceTimerRef.current = setTimeout(() => {
                            if (interimTranscript && !isProcessing && !isSpeaking) {
                                addLog('BRAIN', 'VAD: Procesando silencio...');
                                processCommandSemantically(interimTranscript);
                            }
                        }, 1800);
                    }

                    if (finalTranscript) {
                        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
                        setTranscript(finalTranscript);
                        addLog('MIC', `Final: "${finalTranscript}"`);
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

                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(analyserRef.current);
            }
        } catch (e) {
            addLog('ERROR', 'Fallo Visualizador', e);
        }
    };

    const speak = (text: string) => {
        if (typeof window === 'undefined' || !text) return;

        window.speechSynthesis.cancel();
        send({ type: 'SPEAK' });
        addLog('SYSTEM', `🔈 Hablando: ${text}`);

        const wasListening = shouldKeepListening;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';

            // Re-obtener voces si es necesario
            const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.includes('es') && (v.name.includes('Google') || v.name.includes('Helena')))
                || voices.find(v => v.lang.includes('es'))
                || voices[0];

            if (preferredVoice) utterance.voice = preferredVoice;

            const safetyTimeout = setTimeout(() => {
                if (isSpeaking) {
                    send({ type: 'FINISH' });
                    addLog('SYSTEM', '🔈 Timeout de habla detectado');
                    if (wasListening) try { recognitionRef.current?.start(); } catch (e) { }
                }
            }, 10000);

            utterance.onend = () => {
                clearTimeout(safetyTimeout);
                send({ type: 'FINISH' });
                addLog('SYSTEM', '🔈 Fin de habla');
                if (wasListening) {
                    setTimeout(() => {
                        try { recognitionRef.current?.start(); } catch (e) { }
                    }, 300);
                }
            };

            utterance.onerror = (e) => {
                clearTimeout(safetyTimeout);
                addLog('ERROR', 'Error TTS', e);
                send({ type: 'ERROR' });
                if (wasListening) try { recognitionRef.current?.start(); } catch (e) { }
            };

            window.speechSynthesis.speak(utterance);
        }, 200);
    };

    const processCommandSemantically = async (text: string) => {
        if (isProcessing) return;
        send({ type: 'PROCESS' });
        addLog('BRAIN', 'Enviando a Cerebro...', { text });

        try {
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, history })
            });

            if (!response.ok) throw new Error('API Error');

            const result = await response.json();
            addLog('BRAIN', 'Respuesta recibida', result);

            // Actualizar historial (max 3 turnos)
            setHistory(prev => [...prev.slice(-2),
            { role: 'user', content: text },
            { role: 'assistant', content: result.response_text || '' }
            ]);

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
            else if (result.action === 'clarify' && onClarify) {
                // Si el backend envía ítems potables, los pasamos
                onClarify(result.items || [], result.response_text);
                speak(result.response_text || 'Tengo varias opciones. ¿Puedes confirmarme cuál prefieres?');
            }
            else if (result.action === 'unknown') {
                speak(result.response_text || '¿Puedes repetir?');
            }

        } catch (error: any) {
            addLog('ERROR', 'Fallo Cerebro', error.message);

            // Fallback 1: Local Regex
            const localFallback = localMatcher.current?.match(text);

            // Fallback 2: Fuzzy Match (Directo a item)
            const fuzzyMatch = fuzzyMatcher.current?.findBestMatch(text);

            if (localFallback && localFallback.action !== 'unknown') {
                addLog('SYSTEM', '⚠️ Modo Emergencia Local (Regex)');
                if (localFallback.action === 'navigate') onNavigate(localFallback.section!);
                if (localFallback.action === 'add_to_cart') {
                    onItemFound({
                        id: localFallback.item_id,
                        quantity: localFallback.quantity,
                        modifications: localFallback.modifications
                    });
                }
            } else if (fuzzyMatch) {
                addLog('SYSTEM', '⚠️ Modo Emergencia Local (Fuzzy)');
                onItemFound({ id: fuzzyMatch.id, quantity: 1 });
                speak(`¿Te refieres a ${fuzzyMatch.name}? Te lo añado.`);
            }
        } finally {
            send({ type: 'FINISH' });
        }
    };

    const toggleListening = useCallback(() => {
        if (isListening || shouldKeepListening) {
            setShouldKeepListening(false);
            recognitionRef.current?.stop();
            addLog('SYSTEM', 'Escucha OFF');
            playSound();
        } else {
            setShouldKeepListening(true);
            recognitionRef.current?.start();
            addLog('SYSTEM', 'Escucha ON');
            playSound();
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
        logs,
        apiStatus,
        clearLogs,
        forceReconnect,
        shouldKeepListening,
        analyser: analyserRef.current
    };
}
