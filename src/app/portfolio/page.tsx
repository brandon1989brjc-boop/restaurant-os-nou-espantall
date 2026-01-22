'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const PROJECTS = [
    {
        id: 'restaurant-os',
        name: 'Restaurant OS',
        status: 'Development - Immersive Phase',
        date: '2026-01-20',
        description: 'Ecosistema de gestión gastronómica con menú 3D inmersivo y KDS en tiempo real.',
        links: [
            { label: 'Ver Menú Cliente', href: '/' },
            { label: 'Panel Cocina (KDS)', href: '/kds' }
        ],
        color: 'from-accent/20 to-transparent'
    },
    {
        id: 'munay',
        name: 'Munay E-commerce',
        status: 'Lanzado - Periodo de Prueba',
        date: '2026-01-20',
        description: 'Protocolo Cero Datos aplicado a moda infantil premium. Infraestructura BitTraffic.',
        links: [
            { label: 'Ecosystem Report', href: '#' }
        ],
        color: 'from-blue-500/10 to-transparent'
    }
];

export default function PortfolioHub() {
    return (
        <main className="min-h-screen bg-[#050505] text-white font-outfit p-12 md:p-24 overflow-hidden relative">
            {/* Background Decor */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent blur-[150px] rounded-full opacity-10" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500 blur-[150px] rounded-full opacity-5" />
            </div>

            <header className="relative z-10 mb-20 flex justify-between items-start">
                <div>
                    <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter mb-4 leading-none">
                        DEVELOPMENT <br /><span className="text-accent not-italic">PORTFOLIO</span>
                    </h1>
                    <p className="text-white/40 uppercase tracking-[0.5em] text-xs font-black">BitTraffic Infrastructure | Case Studies</p>
                </div>
                <div className="hidden md:block text-right">
                    <span className="text-[10px] text-white/20 font-black uppercase tracking-widest block mb-2">Última Actualización</span>
                    <span className="text-xl font-black italic tracking-tight">20.01.2026</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                {PROJECTS.map((project, idx) => (
                    <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.2 }}
                        className={cn(
                            "group relative bg-white/5 border border-white/10 rounded-[40px] p-10 glass overflow-hidden flex flex-col justify-between h-[500px] hover:border-white/20 transition-all shadow-2xl",
                            "before:absolute before:inset-0 before:bg-gradient-to-br before:" + project.color + " before:opacity-0 group-hover:before:opacity-100 before:transition-opacity"
                        )}
                    >
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-10">
                                <span className="text-[10px] font-black tracking-[0.3em] text-accent uppercase">{project.status}</span>
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black italic border border-white/10">{idx + 1}</div>
                            </div>
                            <h2 className="text-5xl font-black italic tracking-tighter mb-6">{project.name}</h2>
                            <p className="text-white/50 text-lg leading-relaxed max-w-[90%] font-medium">
                                {project.description}
                            </p>
                        </div>

                        <div className="relative z-10 flex flex-wrap gap-4 mt-auto">
                            {project.links.map(link => (
                                <Link
                                    key={link.label}
                                    href={link.href}
                                    className="px-8 py-5 bg-white text-background rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-accent transition-all active:scale-95 shadow-xl"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                ))}

                {/* Diagnostic Sherlock Action */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:col-span-2 bg-gradient-to-r from-[#ADFF2F] to-[#00FFFF] p-16 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-10 group cursor-pointer shadow-[0_40px_100px_-20px_rgba(173,255,47,0.3)]"
                >
                    <div className="text-background">
                        <h3 className="text-5xl font-black italic tracking-tighter mb-4">¿LISTO PARA TU DIAGNÓSTICO?</h3>
                        <p className="text-background/60 font-black uppercase tracking-widest text-sm">Inicia Sherlock AI para auditar tu infraestructura digital</p>
                    </div>
                    <button className="bg-background text-[#ADFF2F] h-20 px-12 rounded-2xl font-black text-xl flex items-center gap-4 hover:scale-105 transition-transform group">
                        INICIAR DIAGNÓSTICO SHERLOCK
                        <svg className="w-6 h-6 transform group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    </button>
                </motion.div>
            </div>

            <div className="mt-20 flex justify-center pb-20">
                <Link href="/" className="text-white/20 hover:text-white transition-colors text-[10px] font-black tracking-[0.5em] uppercase border-b border-transparent hover:border-white pb-1">
                    VOLVER AL ECOSISTEMA PRINCIPAL
                </Link>
            </div>
        </main>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
