'use client';

import { useCallback } from 'react';

export const useSound = (soundUrl: string = '/sounds/bell.mp3') => {
    const play = useCallback(() => {
        try {
            // Use a simple oscillator beep if no file for demo/robustness
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
                osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5); // Drop to A4

                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

                osc.start();
                osc.stop(ctx.currentTime + 0.5);
            } else {
                // Fallback to HTML5 Audio if file exists
                const audio = new Audio(soundUrl);
                audio.play().catch(e => console.error('Error playing sound:', e));
            }
        } catch (e) {
            console.error('Audio context error:', e);
        }
    }, [soundUrl]);

    return play;
};
