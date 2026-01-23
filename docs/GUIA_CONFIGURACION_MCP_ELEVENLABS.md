# 📘 GUÍA COMPLETA: CONFIGURAR MCP EN ELEVENLABS

## 🎯 OBJETIVO
Conectar el servidor MCP de la carta inteligente con ElevenLabs para que el agente de voz pueda ejecutar acciones en tiempo real.

---

## 🔍 IMPORTANTE: TIPO DE SERVIDOR

ElevenLabs soporta **2 tipos de servidores MCP**:

### **Opción 1: SSE (Server-Sent Events)** ⭐ RECOMENDADA
- ✅ Compatible con ElevenLabs directamente
- ✅ Funciona via HTTPS
- ✅ Más fácil de debuggear
- ⚠️ Requiere API pública (usaremos Next.js API Routes)

### **Opción 2: HTTP Reproducible**
- Similar a SSE pero con reintentos automáticos
- Útil para conexiones inestables

---

## 📋 CONFIGURACIÓN PASO A PASO

### **SECCIÓN 1: Configuración del Servidor**

#### **Paso 1.1: Tipo de servidor**
- **Selecciona:** `SSE`
- **Por qué:** Es el estándar para comunicación en tiempo real y ElevenLabs lo soporta nativamente

#### **Paso 1.2: URL del servidor**
- **Tipo:** `Valor` (no "Secreto")
- **URL (desarrollo):** `http://localhost:3000/api/mcp/sse`
- **URL (producción):** `https://tu-dominio.com/api/mcp/sse`

**⚠️ IMPORTANTE:** 
- En desarrollo local, necesitarás **ngrok** para hacer tu localhost público
- Comando: `ngrok http 3000`
- Luego usa la URL que te dé ngrok (ej: `https://abc123.ngrok.io/api/mcp/sse`)

---

### **SECCIÓN 2: Token Secreto**

#### **Paso 2.1: Generar token**
1. Click en **"Añadir nuevo secreto"**
2. **Nombre:** `RESTAURANT_AUTH_TOKEN`
3. **Valor:** Genera uno aleatorio, por ejemplo: `secret_nouespantall_2026_xY9zK`

**Este token lo usarás en tu API para validar que las peticiones vienen de ElevenLabs.**

---

### **SECCIÓN 3: Encabezados HTTP**

#### **Paso 3.1: Añadir encabezados**

**NO necesitas añadir encabezados** a menos que tu servidor requiera autenticación especial.

Si quieres añadir el token:
1. Click **"Añadir encabezado"**
2. **Nombre:** `Authorization`
3. **Valor:** `Bearer RESTAURANT_AUTH_TOKEN` (referencia al secreto)

---

### **SECCIÓN 4: Tool Approval Mode**

#### **Paso 4.1: Selecciona el modo**

Tienes 3 opciones:

##### **A) Preguntar siempre** (Recomendado para testing)
- ✅ **Selecciona esto mientras pruebas**
- El agente preguntará: "¿Quieres que añada la ensalada al carrito?"
- Usuario: "Sí"
- Entonces ejecuta la acción

##### **B) Aprobación detallada**
- Puedes preseleccionar qué herramientas se ejecutan automáticamente
- Útil cuando algunas acciones son sensibles

##### **C) Sin aprobación** (Para producción)
- ⚡ **Usa esto en producción**
- El agente ejecuta las acciones inmediatamente sin preguntar
- Experiencia más fluida

**MI RECOMENDACIÓN:**
1. Empieza con **"Preguntar siempre"** (testing)
2. Cuando todo funcione, cambia a **"Sin aprobación"** (producción)

---

### **SECCIÓN 5: Configuración de Herramientas**

#### **Paso 5.1: Forzar Discurso Previo a la Herramienta**
- **Marca esta opción:** ✅ SÍ
- **Por qué:** El agente dirá algo antes de ejecutar la acción
- **Ejemplo:** "Vale, voy a añadir la ensalada al carrito"

#### **Paso 5.2: Desactivar Interrupciones**
- **Marca esta opción:** ✅ SÍ
- **Por qué:** Evita que el cliente interrumpa mientras se ejecuta la herramienta
- **Duración:** 2-3 segundos para ejecutar la API call

#### **Paso 5.3: Modo de Ejecución**
- **Selecciona:** `Inmediato`
- **Por qué:** Queremos que las acciones se ejecuten al instante
- **Alternativa:** "Diferido" solo si quieres batch operations

#### **Paso 5.4: Sonido de Llamada**
- **Selecciona:** `None` (ninguno)
- **Por qué:** No queremos ruido innecesario durante la ejecución
- **Alternativa:** Puedes poner un "ping" sutil si quieres feedback auditivo

---

## 🏗️ CONFIGURACIÓN RESUMIDA (COPIA Y PEGA)

```
┌─────────────────────────────────────────────┐
│ CONFIGURACIÓN MCP EN ELEVENLABS             │
├─────────────────────────────────────────────┤
│ Tipo de servidor: SSE                       │
│ URL: https://[ngrok-url]/api/mcp/sse       │
│ Token: secret_nouespantall_2026_xY9zK      │
│ Encabezados: (ninguno o Authorization)     │
│ Tool Approval: Preguntar siempre (testing)  │
│               Sin aprobación (producción)   │
│ Forzar discurso: ✅ Activado                │
│ Bloquear interrupciones: ✅ Activado        │
│ Modo ejecución: Inmediato                  │
│ Sonido: None                                │
└─────────────────────────────────────────────┘
```

---

## 🚀 PRÓXIMOS PASOS

Ahora que sabes cómo configurarlo, necesitamos:

1. **Crear el endpoint SSE** en Next.js (`/api/mcp/sse`)
2. **Configurar ngrok** para exponer localhost
3. **Conectar en ElevenLabs** con la URL de ngrok
4. **Probar los comandos de voz**

¿Quieres que proceda a crear el endpoint SSE en Next.js? Es más simple que el servidor stdio que hicimos antes.

---

## 📝 NOTAS IMPORTANTES

- 🔒 **Seguridad:** El token evita que terceros llamen a tu API
- 🌐 **ngrok:** Gratis para testing, úsalo en desarrollo
- ☁️ **Producción:** Despliega en Vercel y usa tu dominio real
- 🐛 **Debugging:** Los logs de MCP aparecen en la consola de ElevenLabs
