# MASTER PLAN: Carta Inteligente de Producción (Nou Espantall)

Este documento define la evolución técnica del sistema de voz, pasando de un prototipo de palabras clave a una solución de comprensión semántica de grado empresarial.

---

## 📊 Arquitectura del Sistema (Flujo de Datos)
```mermaid
graph TD
    A[Usuario/Audio] --> B[Client: VAD / Noise Filter]
    B --> C[Client: Browser Speech API / Whisper]
    C --> D[Server: Groq/Llama-3 Semantic NLP]
    D --> E[RAG: Dynamic Context Injection (menu.json)]
    E --> F[Validator: Constraint Graph]
    F --> G[Action Dispatcher: JSON Standard]
    G --> H[UI: Visualizer & Cart Update]
    H --> I[Kitchen: KDS Integration]
```

---

## 🛠️ FASE 1: INMEDIATO - Comprensión Semántica (NLP Avanzado)
**Objetivo:** Eliminar el hardcoding de palabras clave y entender la intención humana real.

### Componentes Técnicos
- **LLM Engine:** Uso de Groq (Llama-3-70b) con `response_format: { "type": "json_object" }`.
- **System Prompting:** Inyección de la base de datos de platos actual en el prompt del sistema (RAG-lite).

### Arquitectura
- Reemplazo de `LocalIntentMatcher` por un endpoint `/api/voice/process`.
- Salida estandarizada: `[{item_id, quantity, modifiers: []}]`.

### Métricas de Éxito
- Tasa de acierto en pedidos con negaciones ("Sin cebolla") > 90%.
- Resolución de atribución compleja ("Dos cervezas, una muy fría") > 85%.

---

## 🌍 FASE 2: CORTO PLAZO - Multiidioma & Audio Inteligente
**Objetivo:** Detección automática de idioma y robustez en entornos ruidosos.

### Componentes Técnicos
- **Deepgram / Whisper API:** Sustitución del Speech API del navegador por Whisper para soporte nativo de +50 idiomas sin configuración manual.
- **VAD (Voice Activity Detection):** Implementación de `hark.js` en el cliente para detectar silencios y enviar audio solo cuando hay voz humana clara.

### Arquitectura
- Pipeline asíncrono: Capture (Mic) -> Stream (Websockets/API) -> Transcribe (Whisper) -> Process (LLM).

### Métricas de Éxito
- Tiempo de respuesta (Audio -> UI) < 1.5 segundos.
- Soporte de pedidos en "Spanglish" o idiomas extranjeros sin errores de mapeo.

---

## 🧠 FASE 3: MEDIO PLAZO - Dinamismo & Reglas de Negocio
**Objetivo:** Menú dinámico (RAG Real) y validación de restricciones.

### Componentes Técnicos
- **Vector Search (Embeddings):** Almacenamiento de platos en una base de datos vectorial (Pinecone o local search) para manejar sinónimos ("filete" vs "solomillo").
- **Grafo de Restricciones:** Diccionario de validación (Ej: `categoria: bebible` -> `modificador: caliente|frío|con_hielo`).

### Arquitectura
- Validación pre-carrito: El backend rechaza órdenes imposibles ("Café poco hecho") devolviendo un `response_text` aclaratorio.

### Métricas de Éxito
- Reducción del 100% en "Pedidos Imposibles" que llegan a cocina.
- Actualización automática de la IA al cambiar el stock en la DB.

---

## 🚀 FASE 4: PRODUCCIÓN - Escalabilidad & UX Premium
**Objetivo:** Estabilidad total y manos libres (Always-On).

### Componentes Técnicos
- **Acoustic Fingerprinting:** Filtrado de ruido de fondo de restaurante mediante red neuronal en cliente (WebAssembly).
- **Proactive AI:** El sistema sugiere platos basados en la hora del día o ítems populares en el prompt.

### Arquitectura
- Deploy en Infraestructura Edge para latencia sub-segundo.
- Backup local (Offline-first) con modelos cuantizados en el navegador.

---

## 🏁 Checklist de Validación (Phase Gate)
- [ ] **Fase 1:** ¿El sistema entiende "Ponme esto pero sin aquello"?
- [ ] **Fase 2:** ¿Puedo pedir en Inglés y que el carrito se llene en Español?
- [ ] **Fase 3:** ¿Si pido algo que no está en el menú, me lo indica amablemente?
- [ ] **Fase 4:** ¿Funciona el sistema con música de fondo o platos chocando?

---

## 📑 Decisiones Arquitectónicas (Trade-offs)
1. **LLM vs Local Matcher:** Se elige LLM por la flexibilidad semántica a cambio de un coste marginal por token y latencia extra (<600ms).
2. **JSON Mode:** Crítico para evitar que la UI se rompa con respuestas de texto plano inesperadas.
3. **Monolingüismo en Backend:** Decisión pragmática: el menú y la lógica de cocina siempre en Español para evitar errores de traducción en el KDS.
