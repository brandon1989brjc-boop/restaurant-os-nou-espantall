'use client';

import { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
    analyser: AnalyserNode | null;
    isListening: boolean;
    isProcessing?: boolean;
    isSpeaking?: boolean;
}

export default function VoiceVisualizer({ analyser, isListening, isProcessing, isSpeaking }: VoiceVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        if (!canvasRef.current || !analyser) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Estilos dinámicos basados en el estado (Reporte 5.2)
            let strokeColor = '#22c55e'; // Verde (Listening)
            if (isProcessing) strokeColor = '#a855f7'; // Púrpura (Processing)
            if (isSpeaking) strokeColor = '#3b82f6'; // Azul (Speaking)

            ctx.lineWidth = 2;
            ctx.strokeStyle = strokeColor;
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();

            // Añadir un brillo sutil
            ctx.shadowBlur = 10;
            ctx.shadowColor = strokeColor;
        };

        if (isListening || isSpeaking || isProcessing) {
            draw();
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Dibujar línea base
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#444';
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        }

        return () => {
            cancelAnimationFrame(animationRef.current);
        };
    }, [analyser, isListening, isProcessing, isSpeaking]);

    return (
        <canvas
            ref={canvasRef}
            width={200}
            height={40}
            className="w-full h-full opacity-80"
        />
    );
}
