# 🎤 Guía de Integración: ElevenLabs WebSocket

Esta guía te ayudará a conectar tu carta inteligente con tu servidor de ElevenLabs para comandos de voz en tiempo real.

---

## 📋 **Requisitos Previos**

1. **Servidor WebSocket de ElevenLabs** funcionando (Node.js, Python, etc.)
2. **Variables de entorno** configuradas en `.env.local`
3. **Certificado SSL** (para producción con WSS)

---

## ⚙️ **Configuración**

### 1. **Copiar Variables de Entorno**

```bash
cp .env.example .env.local
```

### 2. **Editar `.env.local`**

```bash
# Para desarrollo local
NEXT_PUBLIC_LEVELLABS_WS_URL=ws://localhost:8080
NEXT_PUBLIC_VOICE_CLIENT=levellabs
NEXT_PUBLIC_VOICE_DEBUG=true
NEXT_PUBLIC_RESTAURANT_ID=nou-espantall-cambrils

# Para producción
NEXT_PUBLIC_LEVELLABS_WS_URL=wss://api.tuservidor.com/voice
NEXT_PUBLIC_LEVELLABS_API_KEY=tu_api_key_secreta
NEXT_PUBLIC_VOICE_CLIENT=levellabs
NEXT_PUBLIC_VOICE_DEBUG=false
```

### 3. **Reiniciar Servidor**

```bash
npm run dev
```

---

## 🔌 **Protocolo WebSocket**

### **Formato de Mensajes**

#### 📤 **Cliente → Servidor (Carta)**

**1. Autenticación (opcional)**
```json
{
  "type": "auth",
  "data": {
    "apiKey": "your_api_key",
    "restaurantId": "nou-espantall",
    "clientType": "web_menu",
    "timestamp": "2026-01-22T22:00:00Z"
  }
}
```

**2. Audio en tiempo real**
- Envía `ArrayBuffer` con chunks de audio
- Formato: `audio/webm;codecs=opus` (16kHz, mono)
- Frecuencia: Cada 100ms

---

#### 📥 **Servidor → Cliente (Carta)**

**1. Transcripción parcial**
```json
{
  "type": "transcription",
  "text": "Quiero una ensalada de cabra sin cebolla"
}
```

**2. Intención detectada**
```json
{
  "type": "intent",
  "intent": "add_to_cart",
  "entities": {
    "items": [
      {
        "name": "ensalada de cabra",
        "quantity": 1,
        "modifications": [
          { "type": "remove", "ingredient": "cebolla" }
        ]
      }
    ]
  }
}
```

**3. Audio de respuesta (TTS)**
```json
{
  "type": "audio_response",
  "audioUrl": "https://cdn.yourserver.com/audio/response_123.mp3"
}
```

O directamente enviar `Blob` de audio.

**4. Completado**
```json
{
  "type": "complete"
}
```

**5. Error**
```json
{
  "type": "error",
  "error": "Error message here"
}
```

---

## 🧪 **Testing con Mock**

Para probar sin servidor real:

```bash
# .env.local
NEXT_PUBLIC_VOICE_CLIENT=mock
```

El modo mock simula:
- "Quiero ver los bocadillos" → Navega a bocadillos
- "Una ensalada de cabra" → Añade al carrito
- "Sin cebolla" → Añade modificación

---

## 🔧 **Ejemplo de Servidor WebSocket (Node.js)**

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    console.log('✅ Cliente conectado desde la carta');
    
    ws.on('message', async (message) => {
        // Si es ArrayBuffer, es audio
        if (message instanceof Buffer || message instanceof ArrayBuffer) {
            console.log('🎤 Recibido audio chunk');
            
            // 1. Transcribir con Whisper/Deepgram
            const transcription = await transcribeAudio(message);
            ws.send(JSON.stringify({
                type: 'transcription',
                text: transcription
            }));

            // 2. Analizar intención con GPT/Claude
            const intent = await analyzeIntent(transcription);
            ws.send(JSON.stringify({
                type: 'intent',
                intent: intent.action,
                entities: intent.entities
            }));

            // 3. Generar respuesta TTS
            const audioUrl = await generateTTS(intent.response);
            ws.send(JSON.stringify({
                type: 'audio_response',
                audioUrl: audioUrl
            }));

            ws.send(JSON.stringify({ type: 'complete' }));
        } else {
            // Es JSON (autenticación, etc.)
            const data = JSON.parse(message);
            console.log('📨 Mensaje:', data.type);
        }
    });

    ws.on('close', () => {
        console.log('👋 Cliente desconectado');
    });
});

console.log('🚀 Servidor WebSocket escuchando en ws://localhost:8080');
```

---

## 📊 **Flujo Completo End-to-End**

```
[Usuario habla] "Quiero una ensalada sin cebolla"
    ↓
[Carta Web - Micrófono] Captura audio
    ↓
[WebSocket] Envía chunks a ws://localhost:8080
    ↓
[Servidor - Whisper] Transcribe: "quiero una ensalada sin cebolla"
    ↓
[Servidor - GPT] Analiza:
    {
      intent: "add_to_cart",
      entities: {
        items: [{
          name: "ensalada de cabra",
          modifications: [{ type: "remove", ingredient: "cebolla" }]
        }]
      }
    }
    ↓
[WebSocket] Envía JSON a la carta
    ↓
[Carta Web] Ejecuta:
    - addItem con modificaciones
    - Muestra toast de confirmación
    - Actualiza carrito
    ↓
[Servidor - ElevenLabs TTS] "He añadido una ensalada sin cebolla"
    ↓
[Carta Web] Reproduce audio de confirmación
```

---

## 🐛 **Debugging**

### Activar logs detallados

```bash
NEXT_PUBLIC_VOICE_DEBUG=true
```

Verás en consola:
```
[LevelLabs] Connecting to WebSocket: ws://localhost:8080
[LevelLabs] ✅ WebSocket connected
[LevelLabs] Microphone access granted
[LevelLabs] Audio recording started
[LevelLabs] Received message: intent
[LevelLabs] Intent detected: add_to_cart {...}
```

### Problemas comunes

**❌ "WebSocket connection failed"**
- Verificar que el servidor esté corriendo
- Revisar la URL en `.env.local`
- Comprobar firewall/CORS

**❌ "Microphone access denied"**
- El navegador requiere HTTPS en producción
- En desarrollo, `localhost` está permitido
- Dar permisos manualmente

**❌ "Transcription timeout"**
- Aumentar timeout en el servidor
- Verificar que Whisper/STT esté respondiendo

---

## 🚀 **Deploy a Producción**

### 1. **Cambiar a WSS (seguro)**

```bash
NEXT_PUBLIC_LEVELLABS_WS_URL=wss://api.tudominio.com/voice
```

### 2. **Configurar Nginx (ejemplo)**

```nginx
upstream levellabs_ws {
    server localhost:8080;
}

server {
    listen 443 ssl;
    server_name api.tudominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /voice {
        proxy_pass http://levellabs_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
    }
}
```

### 3. **Variables en Vercel/Netlify**

En el panel de tu hosting, añade:
```
NEXT_PUBLIC_LEVELLABS_WS_URL=wss://api.tudominio.com/voice
NEXT_PUBLIC_LEVELLABS_API_KEY=<tu_key_secreta>
NEXT_PUBLIC_VOICE_CLIENT=levellabs
```

---

## 📚 **Recursos Adicionales**

- **Documentación técnica completa**: `LEVELLABS_INTEGRATION.md`
- **Tipos TypeScript**: `src/lib/voice/types.ts`
- **Cliente WebSocket**: `src/lib/voice/LevelLabsVoiceClient.ts`
- **Ejemplo de servidor**: Próximamente en `/examples/server/`

---

## 🆘 **Soporte**

Si tienes problemas, revisa:
1. Logs del navegador (F12 → Console)
2. Logs del servidor WebSocket
3. Variables de entorno en `.env.local`

**Para debugging avanzado:**
```javascript
// En el navegador
localStorage.setItem('voice-debug', 'true');
```

¡Buena suerte con la integración! 🎉
