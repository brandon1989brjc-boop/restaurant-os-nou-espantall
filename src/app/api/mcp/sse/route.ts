import { NextRequest } from 'next/server';

// Token de autenticación (debe coincidir con el configurado en ElevenLabs)
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN || 'secret_nouespantall_2026_xY9zK';

// Store de sesiones en memoria
const sessions = new Map<string, any>();

// Definición de herramientas MCP
const tools = [
    {
        name: 'navigate_to_section',
        description: 'Navega a una sección del menú',
        inputSchema: {
            type: 'object',
            properties: {
                section: {
                    type: 'string',
                    enum: ['bocadillos', 'entrantes', 'tablas', 'ensaladas', 'platos', 'combinados', 'postres', 'bebidas', 'cart'],
                    description: 'Sección del menú'
                }
            },
            required: ['section']
        }
    },
    {
        name: 'add_to_cart',
        description: 'Añade un plato al carrito',
        inputSchema: {
            type: 'object',
            properties: {
                dish_name: { type: 'string', description: 'Nombre del plato' },
                quantity: { type: 'number', default: 1 },
                modifications: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['remove', 'add', 'preference'] },
                            ingredient: { type: 'string' },
                            instruction: { type: 'string' }
                        }
                    }
                },
                assigned_to: { type: 'string' }
            },
            required: ['dish_name']
        }
    },
    {
        name: 'view_cart',
        description: 'Muestra el carrito actual',
        inputSchema: { type: 'object', properties: {} }
    },
    {
        name: 'confirm_order',
        description: 'Confirma el pedido',
        inputSchema: { type: 'object', properties: {} }
    }
];

export async function GET(request: NextRequest) {
    // Validar autenticación
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Configurar SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            // Enviar lista de herramientas disponibles
            const message = {
                jsonrpc: '2.0',
                method: 'tools/list',
                result: { tools }
            };

            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
            );

            // Keep-alive cada 30 segundos
            const interval = setInterval(() => {
                controller.enqueue(encoder.encode(': keepalive\n\n'));
            }, 30000);

            // Cleanup
            request.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

export async function POST(request: NextRequest) {
    // Validar autenticación
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const body = await request.json();
        const { method, params } = body;

        console.log('[MCP] Received request:', method, params);

        if (method === 'tools/call') {
            const { name, arguments: args } = params;
            const sessionId = request.headers.get('x-session-id') || 'default';

            // Ejecutar la herramienta (pasamos request para obtener el host)
            const result = await executeTool(name, args, sessionId, request);

            return Response.json({
                jsonrpc: '2.0',
                id: body.id,
                result
            });
        }

        if (method === 'tools/list') {
            return Response.json({
                jsonrpc: '2.0',
                id: body.id,
                result: { tools }
            });
        }

        return Response.json({
            jsonrpc: '2.0',
            id: body.id,
            error: { code: -32601, message: 'Method not found' }
        });

    } catch (error: any) {
        console.error('[MCP] Error:', error);
        return Response.json({
            jsonrpc: '2.0',
            error: { code: -32603, message: error.message }
        }, { status: 500 });
    }
}

async function executeTool(name: string, args: any, sessionId: string, request?: NextRequest) {
    // 1. BROADCAST A SYNC API (Para que el frontend reaccione)
    if (request) {
        try {
            const protocol = request.headers.get('x-forwarded-proto') || 'http';
            const host = request.headers.get('host') || 'localhost:3000';
            const syncUrl = `${protocol}://${host}/api/sync`;

            console.log(`📮 Broadcasting tool ${name} to: ${syncUrl}`);

            let payload: any = null;

            if (name === 'navigate_to_section') {
                payload = {
                    action: 'navigate',
                    section: args.section
                };
            } else if (name === 'add_to_cart') {
                payload = {
                    action: 'add-to-cart',
                    item: args.dish_name,
                    quantity: args.quantity
                };
            }

            if (payload) {
                // Fuego y olvido (sin await) para velocidad
                fetch(syncUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).catch(err => console.error("❌ Sync Error:", err));
            }
        } catch (e) {
            console.error('Broadcast error:', e);
        }
    }

    // 2. Lógica Standard (Respuesta al Agente)
    // Obtener o crear sesión
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { actions: [] });
    }

    const session = sessions.get(sessionId)!;

    switch (name) {
        case 'navigate_to_section':
            session.actions.push({
                type: 'navigate',
                section: args.section,
                timestamp: new Date()
            });
            return {
                content: [{
                    type: 'text',
                    text: `✅ Navegando a ${args.section}`
                }]
            };

        case 'add_to_cart':
            session.actions.push({
                type: 'add_to_cart',
                dish_name: args.dish_name,
                quantity: args.quantity || 1,
                modifications: args.modifications || [],
                assigned_to: args.assigned_to,
                timestamp: new Date()
            });

            let response = `✅ Añadido: ${args.quantity || 1}x ${args.dish_name}`;
            if (args.modifications?.length > 0) {
                const mods = args.modifications.map((m: any) =>
                    m.type === 'remove' ? `sin ${m.ingredient}` : m.instruction
                ).join(', ');
                response += ` (${mods})`;
            }

            return {
                content: [{
                    type: 'text',
                    text: response
                }]
            };

        case 'view_cart':
            const items = session.actions.filter((a: any) => a.type === 'add_to_cart');
            if (items.length === 0) {
                return {
                    content: [{
                        type: 'text',
                        text: 'El carrito está vacío'
                    }]
                };
            }

            const cartSummary = items.map((item: any) =>
                `${item.quantity}x ${item.dish_name}`
            ).join('\n');

            return {
                content: [{
                    type: 'text',
                    text: `🛒 Carrito:\n${cartSummary}`
                }]
            };

        case 'confirm_order':
            session.actions.push({
                type: 'confirm_order',
                timestamp: new Date()
            });

            return {
                content: [{
                    type: 'text',
                    text: '✅ Pedido confirmado'
                }]
            };

        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
