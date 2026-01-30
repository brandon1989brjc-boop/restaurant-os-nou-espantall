# 🏗️ Plan de Implementación: Carta Inteligente PRO

> **ADN BitTraffic**: Activo Digital vs Gasto | Arquitectura 80% + IA 20%

## 📋 FASE 1: Webhook Profesional + Persistencia Transaccional

### Objetivo
Transformar el flujo de pedidos de **efímero (client-side)** a **persistente (server-side)** usando la arquitectura híbrida.

### Arquitectura Actual (MVP) ❌
```
Usuario → VAPI → useVapi.ts (Client Tools) → Zustand (RAM) 
                                           ↓
                                    [SE PIERDE AL CERRAR]
```

### Arquitectura Objetivo (PRO) ✅
```
Usuario → VAPI Assistant 
            ├─ Client Tool: navegar (UI/UX)
            └─ Server Tool: place_order 
                    ↓
                n8n Webhook
                    ↓
                Supabase (ACID)
                    ↓
                Real-time → React UI (Auto-update)
```

---

## 🎯 Componentes a Desarrollar

### 1. **API Route Profesional**: `/api/orders/place`
**Responsabilidad**: Endpoint RESTful para recibir pedidos desde n8n (o directamente desde VAPI en Phase 1)

**Input Schema**:
```typescript
{
  table_id: string;
  items: [{
    dish_id: string;
    quantity: number;
    diner_name: string;
    modifications?: string[];
  }];
  source: 'vapi' | 'direct' | 'n8n';
}
```

**Output**:
```typescript
{
  success: boolean;
  order_id: string;
  total: number;
  estimated_time_minutes: number;
}
```

**Medición**: 
- Tiempo de respuesta < 500ms
- Tasa de error < 0.1%

---

### 2. **n8n Workflow**: `voice-order-orchestration`
**Trigger**: Webhook HTTP POST desde VAPI  
**Steps**:
1. **Validación**: Verificar disponibilidad de platos (stock)
2. **Transformación**: Normalizar datos del pedido
3. **Persistencia**: Insertar en Supabase (`orders` + `order_items`)
4. **Notificación**: Enviar a KDS (Kitchen Display System)
5. **Analytics**: Registrar evento en tabla `analytics_events`

**Output**: JSON con confirmación + tiempo estimado

**Medición**:
- Latencia end-to-end < 1s
- Logs estructurados en Supabase

---

### 3. **Supabase Schema Optimizado**

#### Tabla: `orders`
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  source VARCHAR(20) DEFAULT 'vapi',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_table_status ON orders(table_id, status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

#### Tabla: `order_items`
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  dish_id VARCHAR(100) NOT NULL,
  dish_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  diner_name VARCHAR(100) DEFAULT 'General',
  modifications JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

#### Tabla: `analytics_events` (ROI Tracking)
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL, -- 'voice_order', 'manual_order', 'order_complete'
  order_id UUID REFERENCES orders(id),
  session_id VARCHAR(100),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type_date ON analytics_events(event_type, created_at DESC);
```

---

### 4. **Hook React**: `useRealtimeOrders`
**Responsabilidad**: Escuchar cambios en Supabase y actualizar el carrito automáticamente

```typescript
// src/hooks/useRealtimeOrders.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useOrderStore } from '@/stores/useOrderStore';

export function useRealtimeOrders(tableId: string) {
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `table_id=eq.${tableId}`
        },
        (payload) => {
          // Auto-fetch order items and update Zustand
          fetchOrderDetails(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [tableId]);
}
```

**Medición**:
- Latencia de sincronización < 200ms
- 0 conflictos de estado

---

### 5. **VAPI Assistant Configuration** (Phase 1 Simplificado)

#### Herramientas Híbridas:
```json
{
  "tools": [
    {
      "type": "function",
      "side": "client",
      "name": "navegar",
      "description": "Navega a una sección del menú",
      "parameters": {
        "type": "object",
        "properties": {
          "section": { "type": "string", "enum": ["entrantes", "postres", "carrito"] }
        }
      }
    },
    {
      "type": "function",
      "side": "server",
      "name": "place_order_webhook",
      "description": "Registra un pedido en el sistema",
      "url": "https://yourdomain.com/api/orders/place",
      "method": "POST",
      "parameters": {
        "type": "object",
        "properties": {
          "items": {
            "type": "array",
            "items": {
              "dish_id": "string",
              "quantity": "number",
              "diner": "string"
            }
          }
        }
      }
    }
  ]
}
```

---

## 📊 KPIs de Medición (Sin Dato no hay Relato)

### Performance
- **P95 API Response Time**: < 500ms
- **Real-time Sync Latency**: < 200ms
- **Webhook Success Rate**: > 99.5%

### Business
- **Conversión Voice → Order**: % de sesiones que resultan en pedido
- **Average Order Value (AOV)**: Promedio gastado por mesa
- **Time to Kitchen**: Tiempo desde voz hasta KDS

### Tracking Implementation
```typescript
// src/lib/analytics.ts
export async function trackEvent(event: {
  type: string;
  order_id?: string;
  metadata?: Record<string, any>;
}) {
  await supabase.from('analytics_events').insert([{
    event_type: event.type,
    order_id: event.order_id,
    metadata: event.metadata,
    user_agent: navigator.userAgent,
    session_id: getSessionId()
  }]);
}
```

---

## 🚀 Roadmap de Implementación

### Week 1: Foundation
- [x] Diseño de arquitectura
- [ ] Crear schema Supabase
- [ ] API Route `/api/orders/place`
- [ ] Testing con datos mock

### Week 2: Integration
- [ ] Configurar n8n workflow básico
- [ ] Integrar VAPI con server tools
- [ ] Implementar `useRealtimeOrders`
- [ ] Testing end-to-end

### Week 3: Optimization
- [ ] Implementar analytics tracking
- [ ] Optimizar queries (índices)
- [ ] Error handling robusto
- [ ] Monitoring con Sentry/LogRocket

### Week 4: Production
- [ ] Deploy a Vercel + Supabase
- [ ] n8n en Portainer/VPS
- [ ] Testing de carga
- [ ] Documentación final

---

## 🧰 Stack Tecnológico

| Componente | Tecnología | Justificación |
|-----------|-----------|---------------|
| Frontend | Next.js 15 + React 19 | SSR + Edge Functions |
| State | Zustand + Supabase Realtime | Hybrid local/remote state |
| Database | Supabase (Postgres) | ACID + Real-time + Auth |
| Orchestration | n8n | Visual workflow + Debugging |
| Voice | VAPI | Best-in-class voice AI |
| Monitoring | Supabase Analytics | First-party data |

---

## ⚠️ Reglas de Oro (ADN BitTraffic)

1. **Cada feature debe tener su KPI**: Si no se mide, no se construye
2. **TypeScript estricto**: `strict: true` en tsconfig.json
3. **Documentación inline**: Cada función crítica debe tener JSDoc
4. **Testing obligatorio**: Unit tests para lógica de negocio
5. **Monitoreo desde día 1**: Logs estructurados en Supabase

---

## 📝 Próximos Pasos Inmediatos

1. Crear script SQL para schema Supabase
2. Implementar `/api/orders/place` con validación Zod
3. Configurar `.env.local` con credenciales
4. Testing local antes de n8n integration

**Fecha Inicio**: 2026-01-29  
**Deadline Phase 1**: 2026-02-05  
**Owner**: BitTraffic Dev Team
