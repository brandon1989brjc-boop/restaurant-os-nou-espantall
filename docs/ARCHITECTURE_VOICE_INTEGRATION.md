# 🏗️ ARQUITECTURA PROFESIONAL - INTEGRACIÓN ELEVENLABS

## 🎯 OBJETIVO
Conectar el agente conversacional de ElevenLabs con la carta inteligente para que los comandos de voz ejecuten acciones reales (añadir al carrito, navegar, confirmar pedido, etc.).

---

## 🔍 ANÁLISIS DEL PROBLEMA

### ✅ Lo que FUNCIONA
- ✅ Agente de ElevenLabs: Entiende comandos en español
- ✅ Conversación fluida: Responde correctamente
- ✅ Transcripción: Captura lo que dice el cliente

### ❌ Lo que NO funciona
- ❌ Las respuestas del agente no se traducen en acciones en la carta
- ❌ No hay comunicación bidireccional widget ↔ app
- ❌ El widget es una "caja negra" aislada

---

## 🏗️ SOLUCIÓN: ARQUITECTURA DE 3 CAPAS

```
┌─────────────────────────────────────────────────────────────┐
│                   CAPA 1: FRONTEND (Carta Web)              │
│  - Next.js                                                   │
│  - Widget ElevenLabs (solo UI)                              │
│  - Event Listener (polling para actualizaciones)            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/SSE
                       ↓
┌─────────────────────────────────────────────────────────────┐
│           CAPA 2: BACKEND (Servidor Intermedio)              │
│  - Node.js/Express o Next.js API Routes                     │
│  - Endpoints:                                                │
│    POST /api/voice/add-to-cart                              │
│    POST /api/voice/navigate                                 │
│    POST /api/voice/confirm-order                            │
│  - Session Store (en memoria, Redis, o Supabase)            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS (Webhooks)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              CAPA 3: ELEVENLABS CONVAI                       │
│  - Agente configurado con Tools/Functions                   │
│  - Cuando detecta comando → llama a tu API                  │
│  - Ejemplo: "añadir ensalada" → POST /api/voice/add-to-cart│
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 COMPONENTES NECESARIOS

### 1️⃣ **CONFIGURACIÓN EN ELEVENLABS**

#### A. Tools/Functions (Herramientas)
En el dashboard de ElevenLabs, configurar estas funciones:

**Función: addToCart**
```json
{
  "name": "addToCart",
  "description": "Añade un plato al carrito del cliente",
  "parameters": {
    "type": "object",
    "properties": {
      "dish_name": {
        "type": "string",
        "description": "Nombre del plato (ej: ensalada de cabra)"
      },
      "quantity": {
        "type": "number",
        "description": "Cantidad"
      },
      "modifications": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "type": {"type": "string"},
            "ingredient": {"type": "string"}
          }
        }
      }
    },
    "required": ["dish_name", "quantity"]
  },
  "endpoint": "https://tu-dominio.com/api/voice/add-to-cart"
}
```

**Función: navigateMenu**
```json
{
  "name": "navigateMenu",
  "description": "Navega a una sección del menú",
  "parameters": {
    "type": "object",
    "properties": {
      "section": {
        "type": "string",
        "enum": ["bocadillos", "entrantes", "postres", "bebidas", "cart"]
      }
    },
    "required": ["section"]
  },
  "endpoint": "https://tu-dominio.com/api/voice/navigate"
}
```

**Función: confirmOrder**
```json
{
  "name": "confirmOrder",
  "description": "Confirma y envía el pedido a cocina",
  "endpoint": "https://tu-dominio.com/api/voice/confirm-order"
}
```

#### B. Prompt del Agente (actualizado)
```
Eres el asistente de voz de Nou Espantall.

Cuando el cliente:
- Diga "quiero ver X" → llama a navigateMenu(section: X)
- Diga "quiero/añade/ponme un plato" → llama a addToCart(dish_name, quantity, modifications)
- Diga "confirmar pedido" → llama a confirmOrder()

IMPORTANTE: Después de ejecutar la función, confirma al cliente en español:
- "Vale, te muestro los bocadillos"
- "Añadido al carrito, ¿algo más?"
- "Pedido confirmado, llegará en breve"
```

---

### 2️⃣ **BACKEND (API Routes en Next.js)**

**Archivo:** `src/app/api/voice/add-to-cart/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

// Store temporal en memoria (puedes usar Redis o Supabase después)
const sessionStore = new Map<string, any>();

export async function POST(request: NextRequest) {
    const { dish_name, quantity, modifications, session_id } = await request.json();
    
    // Guardar acción en la sesión
    const session = sessionStore.get(session_id) || { actions: [] };
    session.actions.push({
        type: 'add_to_cart',
        timestamp: new Date(),
        data: { dish_name, quantity, modifications }
    });
    sessionStore.set(session_id, session);

    // Log para debugging
    console.log(`[Voice] Add to cart:`, { dish_name, quantity });

    // Responder a ElevenLabs
    return NextResponse.json({ 
        success: true,
        message: `Añadido ${dish_name} al carrito` 
    });
}
```

**Archivo:** `src/app/api/voice/get-actions/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

const sessionStore = new Map<string, any>();

export async function GET(request: NextRequest) {
    const session_id = request.nextUrl.searchParams.get('session_id');
    
    if (!session_id) {
        return NextResponse.json({ actions: [] });
    }

    const session = sessionStore.get(session_id) || { actions: [] };
    const actions = session.actions || [];

    // Limpiar acciones después de leerlas
    sessionStore.set(session_id, { actions: [] });

    return NextResponse.json({ actions });
}
```

---

### 3️⃣ **FRONTEND (Carta Web - Polling)**

**Archivo:** `src/components/menu/VoiceActionPoller.tsx`
```typescript
'use client';

import { useEffect } from 'react';

export default function VoiceActionPoller({ 
    sessionId,
    onAction 
}: { 
    sessionId: string;
    onAction: (action: any) => void;
}) {
    useEffect(() => {
        // Polling cada 2 segundos
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/voice/get-actions?session_id=${sessionId}`);
                const { actions } = await res.json();
                
                actions.forEach((action: any) => {
                    console.log('[Voice Action]', action);
                    onAction(action);
                });
            } catch (error) {
                console.error('Error polling actions:', error);
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [sessionId, onAction]);

    return null; // Componente invisible
}
```

---

## 🔄 FLUJO COMPLETO (END-TO-END)

```
1. Cliente dice: "Quiero una ensalada de cabra sin cebolla"

2. Widget ElevenLabs:
   - Captura audio
   - Transcribe: "quiero una ensalada de cabra sin cebolla"
   
3. Agente ElevenLabs (con NLU):
   - Detecta intent: addToCart
   - Extrae parámetros: dish_name="ensalada de cabra", modifications=[{type:"remove", ingredient:"cebolla"}]
   
4. ElevenLabs llama a tu API:
   POST https://tu-dominio.com/api/voice/add-to-cart
   {
     "dish_name": "ensalada de cabra",
     "quantity": 1,
     "modifications": [{"type": "remove", "ingredient": "cebolla"}],
     "session_id": "abc123"
   }

5. Tu API (Next.js):
   - Guarda acción en sessionStore
   - Responde: { success: true, message: "Añadido" }

6. ElevenLabs (TTS):
   - Lee al cliente: "Añadida ensalada sin cebolla al carrito"

7. Frontend (Polling cada 2s):
   - GET /api/voice/get-actions?session_id=abc123
   - Recibe: [{ type: "add_to_cart", data: {...} }]
   - Ejecuta: addItem() en el carrito
   - Muestra toast de confirmación visual
```

---

## ✅ VENTAJAS DE ESTA ARQUITECTURA

1. ✅ **Profesional**: Separación de capas clara
2. ✅ **Escalable**: Fácil añadir más comandos
3. ✅ **Debuggeable**: Logs en cada capa
4. ✅ **Sin base de datos**: Usa memoria (puedes añadir Redis después)
5. ✅ **Funciona con widget oficial**: No inventamos nada custom
6. ✅ **
Retry automático**: El polling captura acciones aunque haya delays

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### FASE 1: Configuración ElevenLabs (10 min)
- [ ] Ir a dashboard de ElevenLabs
- [ ] Pestaña "Herramientas" (Tools)
- [ ] Añadir función addToCart
- [ ] Añadir función navigateMenu
- [ ] Añadir función confirmOrder
- [ ] Actualizar prompt del agente
- [ ] Publicar agente

### FASE 2: Backend (30 min)
- [ ] Crear `/api/voice/add-to-cart/route.ts`
- [ ] Crear `/api/voice/navigate/route.ts`
- [ ] Crear `/api/voice/confirm-order/route.ts`
- [ ] Crear `/api/voice/get-actions/route.ts`
- [ ] Crear sessionStore (Map o Redis)

### FASE 3: Frontend (20 min)
- [ ] Crear `VoiceActionPoller.tsx`
- [ ] Integrar en `page.tsx`
- [ ] Generar session_id único por usuario
- [ ] Conectar acciones a handlers (addItem, navigate, etc.)

### FASE 4: Testing (15 min)
- [ ] Probar: "Quiero ver los bocadillos"
- [ ] Probar: "Una ensalada de cabra"
- [ ] Probar: "Sin cebolla"
- [ ] Probar: "Confirmar pedido"

### FASE 5: Deploy (opcional)
- [ ] Desplegar en Vercel/Netlify
- [ ] Configurar URLs en ElevenLabs
- [ ] Añadir HTTPS

---

## 🚫 LO QUE NO NECESITAMOS

❌ Base de datos (por ahora - se puede añadir después)
❌ WebSocket complejo
❌ Parseo manual de JSON del widget
❌ Hacks con MutationObserver

---

## 💡 ALTERNATIVA: Server-Sent Events (SSE)

Si no quieres polling, podemos usar SSE:

```typescript
// Frontend
const eventSource = new EventSource(`/api/voice/stream?session_id=${sessionId}`);
eventSource.onmessage = (event) => {
    const action = JSON.parse(event.data);
    onAction(action);
};

// Backend
export async function GET(request: NextRequest) {
    const stream = new ReadableStream({...});
    return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' }
    });
}
```

---

## ⏭️ PRÓXIMO PASO

¿Quieres que implemente esta arquitectura paso a paso?

Empezaremos por:
1. Configurar las Tools/Functions en ElevenLabs (te guiaré)
2. Crear las API routes
3. Integrar el poller

**¿Procedemos con esta arquitectura profesional?** 🚀
