'use client';

import { useEffect, useState } from 'react';
import { DishModification } from '@/lib/voice/types';

interface ModificationConfirmationProps {
    dishName: string;
    modifications: DishModification[];
    onClose: () => void;
}

export default function ModificationConfirmation({
    dishName,
    modifications,
    onClose
}: ModificationConfirmationProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
        }, 4000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const getModificationText = (mod: DishModification): string => {
        if (mod.type === 'remove' && mod.ingredient) {
            return `Sin ${mod.ingredient}`;
        }
        if (mod.type === 'add' && mod.ingredient) {
            return `Con ${mod.ingredient} extra`;
        }
        if (mod.type === 'substitute' && mod.ingredient && mod.substitute_with) {
            return `${mod.ingredient} → ${mod.substitute_with}`;
        }
        if (mod.type === 'preference' && mod.instruction) {
            return mod.instruction;
        }
        return '';
    };

    return (
        <div
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-lg px-4 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
                }`}
        >
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-[2rem] shadow-2xl border-2 border-blue-400">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div className="flex-1">
                        <h3 className="text-lg font-black mb-2 leading-tight">
                            ✓ Modificaciones Registradas
                        </h3>
                        <p className="text-sm font-bold text-blue-100 mb-3">
                            {dishName}
                        </p>

                        <div className="space-y-1.5">
                            {modifications.map((mod, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white/15 backdrop-blur-sm px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                                >
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    {getModificationText(mod)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
