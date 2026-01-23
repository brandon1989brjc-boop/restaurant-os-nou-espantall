# Voice Agent Architecture

Este módulo implementa un Agente de Voz condicionado por JSON utilizando WebRTC y la API Realtime de OpenAI.

## Estructura

- **`schemas.ts`**: Definición de las "Herramientas" (Tools) y el "System Prompt". Aquí es donde se define la inteligencia del agente.
- **`types.ts`**: Tipos TypeScript que aseguran que el código cumpla con los esquemas JSON.
- **`VoiceClientService.ts`**: Servicio Singleton/Clase que maneja la conexión WebRTC, el intercambio de tokens y la emisión de eventos.
- **`VoiceController.tsx`**: Componente visual que interactúa con el usuario y visualiza el estado del agente.

## Flujo de Datos

1. **Inicialización**: `VoiceController` instancia `VoiceClientService`.
2. **Conexión**: Se solicita un token efímero a `/api/voice/session` (Next.js API Route).
3. **WebRTC**: Se establece conexión P2P con OpenAI.
4. **Interacción**:
   - El usuario habla.
   - OpenAI procesa el audio y decide si llamar a una herramienta (definida en `schemas.ts`).
   - Si llama a una herramienta (ej. `navigate_to_section`), `VoiceClientService` emite un evento `VoiceEvent`.
   - `page.tsx` escucha este evento y ejecuta la acción en la UI (cambiar tab, añadir al carrito).

## Extensión

Para añadir nuevas capacidades:
1. Edita `schemas.ts` para añadir la nueva función.
2. Actualiza `types.ts`.
3. Maneja el nuevo tipo de evento en `page.tsx`.
