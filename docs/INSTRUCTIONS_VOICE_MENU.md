# Guía de Implementación: Carta Digital Interactiva por Voz (v1.0)

Esta guía detalla la arquitectura técnica y funcional para implementar un sistema de comandos de voz autónomo para la gestión de pedidos, asignación de comensales y pagos individuales.

---

## 1. Arquitectura del Sistema de Voz

El sistema utiliza un **Real-time Voice Agent** (Gemini Multi-modal) que integra:
- **Speech-to-Text (STT):** Captura de audio en tiempo real.
- **Natural Language Understanding (NLU/LLM):** Interpretación semántica y ejecución de herramientas (Function Calling).
- **Text-to-Speech (TTS):** Confirmación audible de acciones.
- **Context Management:** Un bus de eventos que comunica el agente de voz con el estado global (Zustand).

### Flujo de Datos
1. **Entrada:** "Añade una Burger con extra de queso para María".
2. **Interpretación:** El LLM identifica la herramienta `update_order_cart` con `item_name: "Burger"`, `notes: "extra de queso"` y `assigned_to: "María"`.
3. **Ejecución:** El Event Bus dispara una acción al `useOrderStore`.
4. **Respuesta:** El agente confirma por voz: "He añadido tu Burger con extra de queso para María. ¿Algo más?".

---

## 2. Definición de Herramientas (Function Calling Schema)

Debemos extender `TOOLS_SCHEMA` para soportar la complejidad requerida:

### 2.1. Gestión de Pedido Personalizado
```typescript
{
  name: "update_order_cart",
  description: "Añade, modifica o elimina platos vinculándolos a un comensal específico.",
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["add", "remove", "update"] },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item_name: { type: "string" },
            quantity: { type: "integer" },
            notes: { type: "string" }, // Modificaciones naturales
            assigned_to: { type: "string" } // Nombre o identificación del comensal
          },
          required: ["item_name", "quantity", "notes", "assigned_to"]
        }
      }
    }
  }
}
```

### 2.2. Gestión de Pagos y Cuentas
```typescript
{
  name: "manage_billing",
  description: "Gestiona el cierre de cuenta y métodos de pago individuales.",
  parameters: {
    type: "object",
    properties: {
      method: { type: "string", enum: ["split_equally", "individual", "full_table"] },
      payer: { type: "string", description: "Nombre de quién paga (si es individual)" },
      payment_type: { type: "string", enum: ["card", "cash", "digital_wallet"] }
    }
  }
}
```

---

## 3. Lógica de Modificación Natural

Para soportar comandos como *"que no tenga cebolla"* o *"más picante"*:
1. **Prompt del Sistema:** Instruir al agente para que extraiga estas preferencias y las mapee al campo `notes` del objeto `OrderItem`.
2. **Validación:** El frontend debe cruzar el `item_name` con el menú cargado en `menu.json` para evitar alucinaciones.
3. **Feedback:** El agente debe repetir la modificación para confirmar: "Entendido, una Burger sin cebolla".

---

## 4. Asignación de Comensales (Diner Tracking)

El `useOrderStore` debe evolucionar para gestionar sesiones de mesa:
- Cada `OrderItem` DEBE tener un campo `user`.
- Si el usuario dice "para el de la derecha", el asistente debe preguntar el nombre para mayor precisión o usar un ID temporal (`Comensal 1`, `Comensal 2`).
- **Comando de Consulta:** Implementar una función `get_order_summary` que permita responder a "¿Qué ha pedido Juan?".

---

## 5. Gestión de Pagos y Cuentas Separadas

Implementar una pantalla de "Checkout" que se active por voz:
1. **Cierre de mesa:** "Queremos pagar por separado".
2. **Asignación automática:** El sistema genera sub-totales basados en el campo `user` de cada item.
3. **Pasarela de Pago:** Integración transparente con Stripe o similar, enviando un link de pago al móvil o procesando tarjeta en el local tras la confirmación por voz.

---

## 6. ADN BitTraffic (Reglas de Oro para el Dev)

1. **ROI en Voz:** El sistema debe reducir el tiempo de toma de pedido en un 30% comparado con el menú táctil.
2. **Métricas:** Trackear cuántas veces el usuario tuvo que repetir un comando (Word Error Rate semántico).
3. **Escalabilidad:** Usar **TypeScript Estricto** para todos los eventos de voz. No usar `any` en los payloads de los comandos.
4. **Automatización:** Los pedidos confirmados deben dispararse automáticamente al KDS (Kitchen Display System).

---

## Próximos Pasos (Checklist)
- [ ] Actualizar `IVoiceClient.ts` con los nuevos tipos de eventos.
- [ ] Modificar `useOrderStore.ts` para soportar `assigned_to` en las acciones principales.
- [ ] Refinar `SYSTEM_INSTRUCTION` en `schemas.ts` para incluir el rol de "Gestor de cuenta y pagos".
- [ ] Implementar sonidos de confirmación (Earcons) para UX no visual.
