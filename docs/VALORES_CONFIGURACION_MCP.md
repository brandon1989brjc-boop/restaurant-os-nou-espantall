# 🎯 VALORES EXACTOS PARA CONFIGURAR MCP EN ELEVENLABS

## 📋 CONFIGURACIÓN PASO A PASO

### **1️⃣ CONFIGURACIÓN DEL SERVIDOR**

```
┌─────────────────────────────────────────────────┐
│ Tipo de servidor                                │
│ ☑ SSE          ☐ HTTP reproducible             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ URL del servidor                                │
│ Tipo: Valor (no secreto)                        │
│ URL:  [NECESITAS COMPLETAR ESTO]                │
│                                                  │
│ OPCIONES:                                        │
│ A) Desarrollo con ngrok:                        │
│    https://tu-url-ngrok.ngrok.io/api/mcp/sse   │
│                                                  │
│ B) Producción en Vercel:                        │
│    https://carta.nouespantall.com/api/mcp/sse  │
└─────────────────────────────────────────────────┘
```

---

### **2️⃣ TOKEN SECRETO**

```
┌─────────────────────────────────────────────────┐
│ Secreto                                          │
│                                                  │
│ ➕ Añadir nuevo secreto                         │
│                                                  │
│ Nombre: RESTAURANT_AUTH_TOKEN                   │
│ Valor:  secret_nouespantall_2026_xY9zK         │
│                                                  │
│ (Copia este valor exacto o genera uno nuevo)    │
└─────────────────────────────────────────────────┘
```

---

### **3️⃣ ENCABEZADOS HTTP**

```
┌─────────────────────────────────────────────────┐
│ NO AÑADIR ENCABEZADOS                           │
│                                                  │
│ (Dejar vacío - la autenticación se maneja       │
│  automáticamente con el token secreto)          │
└─────────────────────────────────────────────────┘
```

---

### **4️⃣ TOOL APPROVAL MODE**

**Para TESTING (mientras desarrollas):**
```
┌─────────────────────────────────────────────────┐
│ ☑ Preguntar siempre                            │
│ ☐ Aprobación detallada de herramientas         │
│ ☐ Sin aprobación                                │
└─────────────────────────────────────────────────┘
```

**Para PRODUCCIÓN (cuando esté listo):**
```
┌─────────────────────────────────────────────────┐
│ ☐ Preguntar siempre                            │
│ ☐ Aprobación detallada de herramientas         │
│ ☑ Sin aprobación                                │
└─────────────────────────────────────────────────┘
```

---

### **5️⃣ CONFIGURACIÓN DE HERRAMIENTAS**

```
┌─────────────────────────────────────────────────┐
│ ☑ Forzar Discurso Previo a la Herramienta     │
│   (El agente dirá algo antes de ejecutar)       │
│                                                  │
│ ☑ Desactivar Interrupciones                    │
│   (Evita cortes mientras ejecuta la acción)     │
│                                                  │
│ Modo de ejecución:                              │
│   ☑ Inmediato                                   │
│                                                  │
│ Sonido de llamada de la herramienta:           │
│   ☑ None                                        │
└─────────────────────────────────────────────────┘
```

---

## 🚀 CÓMO OBTENER LA URL PARA "URL DEL SERVIDOR"

### **OPCIÓN A: DESARROLLO LOCAL CON NGROK** (Gratis, rápido)

#### Paso 1: Instalar ngrok
```bash
# Descargar de: https://ngrok.com/download
# O con npm:
npm install -g ngrok
```

#### Paso 2: Ejecutar ngrok
```bash
ngrok http 3000
```

#### Paso 3: Copiar la URL
Verás algo como:
```
Forwarding  https://abc123def456.ngrok.io -> http://localhost:3000
```

#### Paso 4: Usar en ElevenLabs
```
URL: https://abc123def456.ngrok.io/api/mcp/sse
```

---

### **OPCIÓN B: PRODUCCIÓN EN VERCEL** (Recomendado para uso real)

#### Paso 1: Desplegar en Vercel
```bash
cd "d:\proyecto restaurantes\restaurant-os"
vercel
```

#### Paso 2: Obtener URL  
Vercel te dará una URL como:
```
https://restaurant-os-usuario.vercel.app
```

#### Paso 3: Usar en ElevenLabs
```
URL: https://restaurant-os-usuario.vercel.app/api/mcp/sse
```

---

## 📝 CHECKLIST ANTES DE GUARDAR

- [ ] Tipo de servidor: **SSE** ✅
- [ ] URL del servidor configurada (ngrok o Vercel)
- [ ] Token secreto: `RESTAURANT_AUTH_TOKEN` con valor `secret_nouespantall_2026_xY9zK`
- [ ] Tool Approval Mode: **Preguntar siempre** (para testing)
- [ ] Forzar discurso previo: **Activado** ✅
- [ ] Desactivar interrupciones: **Activado** ✅
- [ ] Modo de ejecución: **Inmediato** ✅
- [ ] Sonido: **None** ✅

---

## 🧪 TESTING DESPUÉS DE CONFIGURAR

Una vez guardado, prueba con estos comandos:

1. **Test de navegación:**
   - Di: "Quiero ver los bocadillos"
   - Esperado: El agente debe decir algo como "Vale, te muestro los bocadillos" y ejecutar `navigate_to_section`

2. **Test de añadir al carrito:**
   - Di: "Quiero una ensalada de cabra"
   - Esperado: "Añadido al carrito" y ejecutar `add_to_cart`

3. **Test de modificaciones:**
   - Di: "Sin cebolla"
   - Esperado: Añadir la modificación a la última orden

---

## ❓ TROUBLESHOOTING

### **Error: "Failed to connect to MCP server"**
- ✅ Verifica que ngrok esté corriendo
- ✅ Verifica que la URL termine en `/api/mcp/sse`
- ✅ Verifica que el servidor Next.js esté corriendo (`npm run dev`)

### **Error: "Unauthorized"**
- ✅ Verifica que el token en ElevenLabs coincida con el de `.env.local`
- ✅ Añade en `.env.local`: `MCP_AUTH_TOKEN=secret_nouespantall_2026_xY9zK`

### **El agente no ejecuta las herramientas**
- ✅ Revisa los logs en la consola de ElevenLabs (sección "Análisis")
- ✅ Asegúrate de que Tool Approval Mode esté bien configurado

---

¿Todo claro? **¡Ahora configura en ElevenLabs y prueba!** 🚀
