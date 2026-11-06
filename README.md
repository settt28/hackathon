# Sistema Preventivo El Niño · Paty

Asistente de prevención ante el Fenómeno El Niño para poblaciones vulnerables del Perú: chat con IA, mapa de riesgo
por distrito con un modelo XGBoost local, voz y canal SMS.

Monorepo fullstack: API en .NET 9 + SPA en React (Vite + TypeScript + Tailwind CSS).

👉 **¿Primera vez? Sigue el [tutorial para ejecutarlo](TUTORIAL.md).**

## Estructura

```
backend/                      Solución ElNino.sln (Clean Architecture)
  src/ElNino.API              Controladores, Program.cs (depende de Core e Infrastructure)
  src/ElNino.Core             Entidades e interfaces (sin dependencias)
  src/ElNino.Infrastructure   Implementaciones (repositorios) + registro DI
frontend/
  src/components              UI: dashboard, chat de Paty (paty/), emergencias, tarjetas
  src/layouts                 MainLayout (Sidebar desktop / Bottom Bar móvil), DeviceFrame
  src/pages                   Dashboard, PatyChat, Emergencia, Resumen, Salud, Agro, Infraestructura
  src/hooks                   usePatyChat, useRiskMap, useAlertas, useRecorder, useTheme…
  src/lib                     Cliente de la API, ubicación, voz
backend/data/ml/              Modelo de riesgo XGBoost (JSON) y sus métricas
ml/                           Script de entrenamiento del modelo
```

## Ejecutar

**Guía completa paso a paso: [TUTORIAL.md](TUTORIAL.md)** (requisitos, cómo probar, IA opcional y problemas comunes).

```bash
# Terminal 1: backend → http://localhost:5261 (documentación de la API en /scalar)
cd backend && dotnet run --project src/ElNino.API --launch-profile http

# Terminal 2: frontend → http://localhost:5173
cd frontend && npm install && npm run dev
```

## IA de Paty

Cada pieza se activa sola si está configurada; si no, la app sigue funcionando sin ella.

| Pieza | Qué hace | Sin internet |
|---|---|---|
| **Modelo de riesgo (XGBoost)** | Probabilidad de emergencia por lluvias/huaico/inundación/deslizamiento por distrito y mes. Colorea el mapa de riesgo y da contexto al chat. | Sí: el backend evalúa los árboles él mismo (`backend/data/ml/riesgo_xgb.json`), sin Python. |
| **Chat (LLM)** | Redacta la respuesta solo con los fragmentos oficiales (RAG). Sin LLM, Paty responde con plantillas. | Con Ollama (Llama 3 local). |
| **Dictado (Whisper)** | Mensajes de voz en el chat. | Con un servidor Whisper local compatible con OpenAI. |
| **Voz (Fish Audio)** | Lee las respuestas con voz natural. Sin él, el navegador lee con su propia voz. | Sí, con la voz del navegador. |
| **SMS** | `POST /api/sms/entrante`: el gateway GSM reenvía el SMS y recibe la respuesta en un solo SMS (160 caracteres). | Sí (red 2G). |

### Configuración (las claves nunca van en el repo)

```bash
# Nube: Groq (console.groq.com) para chat y dictado, Fish Audio (fish.audio) para la voz
setx Ai__Chat__ApiKey "gsk_..."
setx Ai__Stt__ApiKey  "gsk_..."
setx Ai__Tts__ApiKey  "..." & setx Ai__Tts__VoiceId "id-de-la-voz"

# Local, sin internet: Ollama con Llama 3
ollama pull llama3.1:8b
setx Ai__Chat__BaseUrl "http://localhost:11434/v1" & setx Ai__Chat__Model "llama3.1:8b"
```

Al arrancar, la API indica en consola qué está activo. `GET /api/paty/capacidades` lo devuelve en JSON.

### Reentrenar el modelo de riesgo

```bash
# Requiere haber ejecutado el backend una vez (crea elnino.db con el historial del SINPAD)
python -m venv ml/.venv && ml/.venv/Scripts/pip install xgboost pandas scikit-learn
ml/.venv/Scripts/python ml/train_risk_model.py
```

Valida con los últimos 24 meses (sin mezclar futuro y pasado). Resultado actual: AUC 0,87 frente a 0,81 de la línea base
"pasó en este mes otros años". Al arrancar, la API comprueba que reproduce las probabilidades de Python; si no, lo descarta y usa reglas.
`GET /api/mapa/prediccion?ubigeo=150118` muestra la predicción y las variables usadas.

### SMS (gateway GSM)

```bash
curl -X POST "http://localhost:5261/api/sms/entrante?key=demo-sms-2026" -d "from=999888777&text=hay un huaico"
# → EMERGENCIA: llama YA al 116 (Bomberos). ...
```

Clave en `Sms:ApiKey`. Las llamadas de voz por Asterisk están pendientes (requieren el gateway y la centralita).

## Seguridad (antes de desplegar)

- **Claves:** `Operador:ApiKey` y `Sms:ApiKey` solo tienen valores de demo en `appsettings.Development.json`. En producción, defínelas por variables de entorno (`Operador__ApiKey`, `Sms__ApiKey`); sin clave configurada, esos endpoints rechazan todo.
- **CORS:** pon el dominio real del frontend en `Cors:Origins` (lista).
- **Límite de peticiones por IP:** 20/min en chat, voz y lectura (usan IA de pago), 120/min en SMS y 300/min en el resto. Detrás de un proxy inverso hay que activar `ForwardedHeaders` para ver la IP real.
- Cuerpo máximo de 1 MB por petición (10 MB para mensajes de voz). Respuestas comprimidas con Brotli/Gzip.
