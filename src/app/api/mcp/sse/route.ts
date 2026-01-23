import { NextRequest, NextResponse } from 'next/server';
import menuData from '@/lib/menu.json';

// Definición de Herramientas MCP para ElevenLabs
const TOOLS = [
    {
        name: "navigate_to_section",
        description: "Navega a una sección específica del menú (entrantes, bocadillos, bebidas, postres, carrito, cuenta, inicio).",
        inputSchema: {
            type: "object",
            properties: {
                section: {
                    type: "string",
                    enum: ["entrantes", "bocadillos", "para_compartir", "tablas", "torradas", "combinados", "montaditos", "postres", "bebidas", "cart", "home", "cuenta"],
                    description: "El ID de la sección a la que navegar."
                }
            },
            required: ["section"]
        }
    },
    {
        name: "add_to_cart",
        description: "Añade platos al carrito de compra. Extrae el nombre del plato, la cantidad y modificadores (sin cebolla, poco hecho, etc.).",
        inputSchema: {
            type: "object",
            properties: {
                items: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            item_name: { type: "string" },
                            quantity: { type: "number", default: 1 },
                            modifications: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string", enum: ["add", "remove", "preference"] },
                                        content: { type: "string" }
                                    }
                                }
                            }
                        },
                        required: ["item_name"]
                    }
                }
            },
            required: ["items"]
        }
    }
];

export async function GET(req: NextRequest) {
    // El protocolo SSE de MCP requiere una conexión abierta
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    // Enviar mensaje de inicialización de MCP
    const initMessage = `event: endpoint\ndata: ${req.nextUrl.origin}/api/mcp/sse\n\n`;
    writer.write(encoder.encode(initMessage));

    // Mantener la conexión abierta (simulado para Next.js Edge/Serverless)
    // Nota: ElevenLabs lee las herramientas de este endpoint
    return new Response(responseStream.readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { method, params } = body;

        // Listado de herramientas
        if (method === "tools/list") {
            return NextResponse.json({
                tools: TOOLS
            });
        }

        // Ejecución de herramientas
        if (method === "tools/call") {
            const { name, arguments: args } = params;

            // Log para debug en consola de Vercel
            console.log(`[MCP CALL] Tool: ${name}`, args);

            // En este flujo SSE, ElevenLabs llama a la herramienta. 
            // Para que la UI reaccione, necesitamos un mecanismo de notificación.
            // Usaremos un Evento Global o un Store que el cliente escuche.
            // Pero como esto es Server-to-Server (ElevenLabs a Vercel), la forma más rápida
            // es devolver una respuesta exitosa y dejar que el cliente escuche via Pusher o similar.

            // SIN EMBARGO, para una solución "pragmática" (BitTraffic):
            // ElevenLabs ya envía el texto de vuelta al widget. 
            // Podemos capturar el JSON del habla directamente en el widget si lo configuramos bien.

            return NextResponse.json({
                content: [{
                    type: "text",
                    text: `Acción ${name} ejecutada con éxito.`
                }]
            });
        }

        return NextResponse.json({ error: "Method not found" }, { status: 404 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
