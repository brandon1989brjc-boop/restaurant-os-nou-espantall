'use client';

import { useState, useEffect } from 'react';

interface Log {
    timestamp: string;
    source: 'MIC' | 'BRAIN' | 'SYSTEM' | 'ERROR';
    message: string;
    data?: any;
}

interface VoiceDebugPanelProps {
    logs: Log[];
    apiStatus: 'ok' | 'error' | 'checking' | 'unknown';
    isListening: boolean;
    onClearLogs: () => void;
    onForceReconnect: () => void;
}

export default function VoiceDebugPanel({ logs, apiStatus, isListening, onClearLogs, onForceReconnect }: VoiceDebugPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`fixed top-0 right-0 z-[100] transition-all duration-300 ${isOpen ? 'w-96' : 'w-12'} h-screen bg-gray-900/95 text-green-400 font-mono text-xs border-l border-green-900/50 shadow-2xl`}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute left-0 top-4 -translate-x-full bg-gray-900 text-green-400 p-2 rounded-l-lg border-y border-l border-green-900/50"
            >
                {isOpen ? 'Close' : 'Debug'} 🐛
            </button>

            {isOpen && (
                <div className="flex flex-col h-full p-4 overflow-hidden">
                    <h2 className="text-lg font-bold mb-4 border-b border-green-800 pb-2 flex justify-between items-center">
                        SYSTEM DIAGNOSTICS
                        <span className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} title="Mic Status"></span>
                    </h2>

                    {/* Status Monitor */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-black/50 p-2 rounded border border-green-900">
                            <span className="text-gray-500 block">Native Edge Engine</span>
                            <span className={`font-bold ${apiStatus === 'ok' ? 'text-green-500' : 'text-red-500'}`}>
                                {apiStatus.toUpperCase()}
                            </span>
                        </div>
                        <div className="bg-black/50 p-2 rounded border border-green-900">
                            <span className="text-gray-500 block">Listening Mode</span>
                            <span className={`font-bold ${isListening ? 'text-red-400' : 'text-gray-400'}`}>
                                {isListening ? 'ACTIVE' : 'IDLE'}
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2 mb-4">
                        <button onClick={onForceReconnect} className="flex-1 bg-green-900/30 hover:bg-green-900/50 border border-green-800 py-1 rounded transition-colors">
                            Reiniciar Voz
                        </button>
                        <button onClick={onClearLogs} className="bg-red-900/30 hover:bg-red-900/50 border border-red-800 px-3 rounded transition-colors">
                            Cls
                        </button>
                    </div>

                    {/* Logs Console */}
                    <div className="flex-1 overflow-y-auto bg-black/80 rounded p-2 font-mono scrollbar-thin scrollbar-thumb-green-900">
                        {logs.length === 0 && <span className="text-gray-600 italic">Esperando eventos...</span>}
                        {logs.map((log, i) => (
                            <div key={i} className="mb-2 border-b border-green-900/30 pb-1 last:border-0 animate-in slide-in-from-left-2 fade-in duration-200">
                                <span className="text-gray-600">[{log.timestamp}]</span>
                                <span className={`font-bold ml-2 ${log.source === 'MIC' ? 'text-blue-400' :
                                    log.source === 'BRAIN' ? 'text-purple-400' :
                                        log.source === 'ERROR' ? 'text-red-500' : 'text-yellow-400'
                                    }`}>{log.source}:</span>
                                <p className="ml-4 text-white/90 break-words">{log.message}</p>
                                {log.data && (
                                    <pre className="ml-4 mt-1 text-[10px] bg-gray-800 p-1 rounded overflow-x-auto text-gray-300">
                                        {JSON.stringify(log.data, null, 2)}
                                    </pre>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
