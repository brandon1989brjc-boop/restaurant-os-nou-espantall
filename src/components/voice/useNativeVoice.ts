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

export function useNativeVoice({ onNavigate, onItemFound }: UseNativeVoiceProps) {
    const [isListening, setIsListening] = useState(false);
    const [shouldKeepListening, setShouldKeepListening] = useState(false); // Nuevo flag para "Always On"
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [logs, setLogs] = useState<Log[]>([]);
    const [apiStatus, setApiStatus] = useState<'ok' | 'error' | 'checking' | 'unknown'>('checking');

    const recognitionRef = useRef<any>(null);
    const playSound = useSound();

    const addLog = (source: Log['source'], message: string, data?: any) => {
        const newLog = {
            timestamp: new Date().toLocaleTimeString(),
            source,
            message,
            data
        };
        // Log en consola también para debug
        console.log(`[${newLog.source}] ${message}`, data || '');
        setLogs(prev => [newLog, ...prev].slice(0, 50)); // Guardar últimos 50
    };

    // 1. Health Check Inicial
    useEffect(() => {
        const checkAPI = async () => {
            try {
                // Hacemos una petición "dummy" para ver si la API responde
                const res = await fetch('/api/voice/brain', {
                    method: 'POST',
                    body: JSON.stringify({ text: 'ping checks' })
                });
                if (res.ok) setApiStatus('ok');
                else setApiStatus('error');
            } catch (e) {
                setApiStatus('error');
            }
        };
        checkAPI();
    }, []);

    // 2. Configurar Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false; // "false" es más estable, lo simulamos reiniciando manual
                recognition.lang = 'es-ES';
                recognition.interimResults = false;
                recognition.maxAlternatives = 1;

                recognition.onstart = () => {
                    setIsListening(true);
                    setTranscript("Escuchando...");
                };

                recognition.onend = () => {
                    setIsListening(false);
                    // Lógica "Always On": Si el usuario no lo apagó manualmente, volvemos a arrancar
                    if (shouldKeepListening && !isProcessing) { // No reiniciar si estamos procesando
                        // Pequeño delay para no saturar
                        setTimeout(() => {
                            try {
                                // verify again inside timeout if we should restart
                                if (!recognitionRef.current) return;
                                // Only restart if intended
                                recognition.start();
                            } catch (e) { console.error("Error reiniciando micro:", e); }
                        }, 200);
                    }
                };

                recognition.onresult = async (event: any) => {
                    const text = event.results[0][0].transcript;
                    setTranscript(text);
                    addLog('MIC', `Escuchado: "${text}"`);

                    setIsProcessing(true);

                    // Detenemos temporalmente el reinicio automático mientras pensamos
                    // Para que no se solapen voces con escuchas
                    const wasListening = shouldKeepListening;
                    // setShouldKeepListening(false); 

                    await processCommandWithAI(text);

                    setIsProcessing(false);
                    // Si estaba en modo continuo, reactivamos para que onend lo reinicie
                    // setShouldKeepListening(wasListening); 
                };

                recognition.onerror = (event: any) => {
                    addLog('ERROR', 'Error de reconocimiento', event.error);
                    if (event.error === 'not-allowed') {
                        setShouldKeepListening(false); // Si deniegan permiso, parar todo
                    }
                };

                recognitionRef.current = recognition;
            } else {
                addLog('ERROR', "Navegador no soporta Speech Recognition");
            }
        }
    }, [shouldKeepListening, isProcessing]);

    const speak = (text: string) => {
        if (typeof window === 'undefined') return;
        setIsSpeaking(true);
        addLog('SYSTEM', `Hablando: "${text}"`);

        // Pausar reconocimiento mientras habla para evitar eco
        const wasListening = shouldKeepListening;
        if (isListening || shouldKeepListening) recognitionRef.current?.stop();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        const voices = window.speechSynthesis.getVoices();
        const googleVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('es'));
        if (googleVoice) utterance.voice = googleVoice;
        utterance.rate = 1.0;

        utterance.onend = () => {
            setIsSpeaking(false);
            // Si estaba en modo continuo, reactivar al terminar
            if (wasListening) {
                setTimeout(() => {
                    try { recognitionRef.current?.start(); } catch (e) { }
                }, 100);
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    const processCommandWithAI = async (text: string) => {
        try {
            addLog('BRAIN', 'Enviando a Brain Local...', { text });

            const response = await fetch('/api/voice/brain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            const command = await response.json();
            addLog('BRAIN', 'Respuesta recibida', command);

            // VALIDACIÓN Y EJECUCIÓN EXPLÍCITA
            if (!command || !command.action) {
                addLog('ERROR', 'Comando inválido o vacío', command);
                speak("No entendí bien.");
                return;
            }

            // EJECUTAR ACCIÓN CON LOGS DETALLADOS
            if (command.action === 'navigate') {
                if (!command.section) {
                    addLog('ERROR', 'Navigate sin sección especificada', command);
                    speak("No sé a dónde ir.");
                    return;
                }

                addLog('SYSTEM', `🔄 Ejecutando navegación a: ${command.section}`);
                speak(`Marchando a ${command.section}`);
                onNavigate(command.section);
                addLog('SYSTEM', `✅ Navegación ejecutada`);
            }
            else if (command.action === 'add_to_cart') {
                if (!command.item_id) {
                    addLog('ERROR', 'Add to cart sin item_id', command);
                    speak("No encontré ese producto.");
                    return;
                }

                addLog('SYSTEM', `🛒 Ejecutando añadir item: ${command.item_id} x${command.quantity || 1}`);
                speak(`Añadido!`);
                onItemFound({ id: command.item_id, quantity: command.quantity || 1 });
                addLog('SYSTEM', `✅ Item añadido`);
            }
            else if (command.action === 'unknown') {
                addLog('SYSTEM', '❓ Comando desconocido');
                speak("¿Cómo?");
            }
            else if (command.action === 'error') {
                addLog('ERROR', 'Error del servidor', command.error);
                speak("Hubo un problema.");
            }
            else {
                addLog('ERROR', `Acción no reconocida: ${command.action}`, command);
                speak("No sé qué hacer con eso.");
            }

        } catch (error: any) {
            addLog('ERROR', 'Fallo en proceso completo', error.message);
            speak("Error de conexión.");
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
        shouldKeepListening
    };
}
