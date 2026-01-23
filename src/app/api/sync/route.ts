import { NextResponse } from 'next/server';

// Memoria temporal (Volátil)
// En un entorno serverless puro esto se resetea, pero para demos suele aguantar
// lo suficiente entre la orden de voz y la consulta del navegador.
let lastCommand: any = null;
let lastUpdate = 0;

export async function GET() {
    // El frontend llama aquí para ver si hay órdenes
    return NextResponse.json({
        command: lastCommand,
        timestamp: lastUpdate
    });
}

export async function POST(request: Request) {
    // El agente de voz llama aquí para dejar una orden
    try {
        const body = await request.json();
        const { action, section, item, quantity } = body;

        lastCommand = {
            action, // 'navigate', 'add-to-cart'
            section, // 'bocadillos', 'entrantes', etc.
            item,
            quantity,
            id: Date.now() // ID único para no repetir la orden
        };
        lastUpdate = Date.now();

        console.log('⚡ COMANDO RECIBIDO EN SERVIDOR:', lastCommand);

        return NextResponse.json({ success: true, command: lastCommand });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Invalid Format' }, { status: 400 });
    }
}
