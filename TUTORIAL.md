# Tutorial: cómo ejecutar Paty

Guía paso a paso para levantar el proyecto en tu computadora (Windows, macOS o Linux) y probarlo.
Toma unos 10 minutos la primera vez.

## 1. Requisitos

| Programa | Versión | Para qué | Descarga |
|---|---|---|---|
| Git | cualquiera | Clonar el repositorio | https://git-scm.com |
| Node.js | 20.19 o superior (o 22.12+) | Frontend (React + Vite) | https://nodejs.org |
| .NET SDK | 9 (o 10, ver nota) | Backend (API) | https://dotnet.microsoft.com/download |

Comprueba que estén instalados:

```bash
git --version
node --version
dotnet --version
```

> **Nota si solo tienes .NET 10:** el backend está hecho para .NET 9. Puedes instalar el runtime de ASP.NET Core 9
> o ejecutar el backend sobre .NET 10 con la variable `DOTNET_ROLL_FORWARD=Major` (ver el paso 3).

Opcional: Python 3.11+ solo si quieres reentrenar el modelo de riesgo, y [Ollama](https://ollama.com) si quieres IA de chat sin internet.

## 2. Clonar el repositorio

```bash
git clone -b Pruebas_Alonso https://github.com/settt28/hackathon.git
cd hackathon
```

## 3. Levantar el backend (API)

Abre una terminal en la carpeta del proyecto:

```bash
cd backend
dotnet run --project src/ElNino.API --launch-profile http
```

Si solo tienes .NET 10 y aparece *"You must install or update .NET to run this application"*:

```powershell
# Windows (PowerShell)
$env:DOTNET_ROLL_FORWARD="Major"; dotnet run --project src/ElNino.API --launch-profile http
```

```bash
# macOS / Linux / Git Bash
DOTNET_ROLL_FORWARD=Major dotnet run --project src/ElNino.API --launch-profile http
```

La **primera vez** tarda un poco más: crea la base de datos `elnino.db` e importa los distritos del Perú y las
emergencias reales del INDECI (SINPAD). Está listo cuando la consola muestra:

```
Modelo de riesgo XGBoost cargado (autocomprobación OK, ...)
Now listening on: http://localhost:5261
```

Déjala abierta. Para ver y probar todos los endpoints en el navegador: http://localhost:5261/scalar

## 4. Levantar el frontend

Abre **otra** terminal en la carpeta del proyecto:

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173. El frontend reenvía las llamadas `/api` al backend automáticamente.

> Cada vez que hagas `git pull`, vuelve a correr `npm install`: si alguien agregó una dependencia y no la instalas,
> la página sale en blanco.

## 5. Probar la app

### Pantallas

| Dirección | Qué es |
|---|---|
| http://localhost:5173/ | Dashboard: riesgo de tu zona, mapa, acceso a Paty y botón SOS |
| http://localhost:5173/paty | Chat con Paty |
| http://localhost:5173/emergencia | Números de emergencia (se abre con el botón SOS) |
| http://localhost:5173/resumen | Resumen de alertas por sector y cifras de los últimos 5 años en el Perú (INDECI) |
| http://localhost:5173/historial | Historial de emergencias de tu distrito |
| http://localhost:5173/salud, /agro, /infraestructura | Alertas y recomendaciones de cada sector |

### Sin GPS (laptop o demo)

El navegador pide permiso de ubicación. Si no lo das, o tu computadora no tiene GPS, fija una ubicación en la URL.
Por ejemplo, Chosica (Lurigancho, Lima), una zona con historial de huaicos:

```
http://localhost:5173/?lat=-11.9369&lon=-76.6966
```

### Hablar con Paty por voz (como una llamada)

En el chat, con el campo de texto vacío, toca el **micrófono**. Se abre la llamada: dices tu pregunta, Paty
responde hablando y vuelve a escucharte, hasta que tocas **Colgar**. También puedes entrar directo desde el
micrófono de "Habla con Paty" en el inicio. Funciona en Chrome, Edge y Safari (usa el reconocimiento de voz del
navegador; la primera vez pide permiso para el micrófono). Si es una emergencia médica, la llamada se corta sola
y aparece la alerta para llamar al SAMU (106).

### Preguntas para el chat

- `hay un huaico` → emergencia: botones para llamar al 911 (en Lima y Callao), al 116 y al 115, y qué hacer mientras llega la ayuda
- `¿cómo evito el dengue?` → pasos del MINSA con su fuente
- `¿qué riesgo hay en mi zona?` → historial del INDECI y la probabilidad del modelo de riesgo para este mes
- `mi papá se desmayó y no respira` → alerta flotante "Direccionando al SAMU (106) en 5…" con qué hacer mientras tanto;
  al terminar la cuenta (o con "Llamar ahora") se abre la app de llamadas del celular con el 106 marcado
- `mi hijo tiene fiebre` → recomendación del MINSA y alerta con el botón para llamar al 106 (sin abrir el marcador sola)
- `cuéntame un chiste` → Paty responde que solo ayuda con prevención ante El Niño (no se consulta a la IA)

### Probar la API directamente

```bash
# Predicción del modelo de riesgo para un distrito (ubigeo del INEI)
curl "http://localhost:5261/api/mapa/prediccion?ubigeo=150118"

# Canal SMS: lo que respondería Paty a un SMS (clave de demo, solo en desarrollo)
curl -X POST "http://localhost:5261/api/sms/entrante?key=demo-sms-2026" -d "text=hay un huaico"
```

## 6. Activar la IA de chat y la voz (opcional)

Sin configurar nada, Paty ya funciona: responde con los consejos oficiales y puedes hablarle por voz (el navegador
reconoce y lee en voz alta). Para que un modelo de lenguaje redacte las respuestas y para la voz natural del
servidor, agrega tus claves en un **archivo local que git ignora** (así nunca se suben al repositorio).

**1. Crea el archivo de claves** a partir del ejemplo:

```powershell
# Windows (PowerShell)
cd backend/src/ElNino.API
Copy-Item appsettings.Local.example.json appsettings.Local.json
```

```bash
# macOS / Linux / Git Bash
cd backend/src/ElNino.API && cp appsettings.Local.example.json appsettings.Local.json
```

**2. Ábrelo y completa las claves que tengas** (puedes dejar en blanco las que no uses):

```json
{
  "Ai": {
    "Chat": { "ApiKey": "gsk_tu_clave_de_groq" },
    "Stt":  { "ApiKey": "gsk_tu_clave_de_groq" },
    "Tts":  { "ApiKey": "tu_clave_de_fish_audio", "VoiceId": "id_de_la_voz" }
  }
}
```

| Clave | Para qué | Dónde se obtiene |
|---|---|---|
| `Chat` y `Stt` | IA que redacta las respuestas y dictado por voz (Whisper) | https://console.groq.com (gratis con registro) |
| `Tts` | Voz natural de Paty | https://fish.audio (clave en *API Keys*; el `VoiceId` es el id de la voz que elijas) |

**3. Reinicia el backend.** La consola dice qué quedó activo, por ejemplo:

```
IA de chat: openai/gpt-oss-20b · Dictado: whisper-large-v3-turbo · Voz servidor: Fish Audio
```

**Sin internet (Ollama).** Instala [Ollama](https://ollama.com), descarga el modelo con `ollama pull llama3.1:8b`
y en `appsettings.Local.json` usa:

```json
{ "Ai": { "Chat": { "BaseUrl": "http://localhost:11434/v1", "Model": "llama3.1:8b", "ReasoningEffort": "" } } }
```

> Nunca pongas claves en `appsettings.json` ni en el README: esos archivos sí se suben a GitHub.
> También puedes usar variables de entorno (`$env:Ai__Chat__ApiKey="..."` en PowerShell).

## 7. Problemas comunes

| Síntoma | Solución |
|---|---|
| La página sale en blanco | Corre `npm install` en `frontend` y reinicia `npm run dev`. |
| Vite abre en `localhost:5174` en vez de 5173 | Ya hay otro `npm run dev` abierto (quizá con una versión vieja): ciérralo y vuelve a arrancar. |
| `You must install or update .NET` | Usa `DOTNET_ROLL_FORWARD=Major` (paso 3) o instala ASP.NET Core 9. |
| `SQLite Error: no such column ...` | Tu base de datos es de una versión anterior. Detén el backend, borra `backend/src/ElNino.API/elnino.db` y vuelve a arrancarlo. |
| `No se pudo copiar ... ElNino.API.dll` al compilar | El backend sigue abierto en otra terminal: ciérralo antes de compilar. |
| El mapa dice "Activa tu ubicación" | Da permiso de ubicación al navegador o usa `?lat=...&lon=...` (paso 5). |
| "Demasiadas consultas seguidas" | Hay un límite de 20 consultas por minuto al chat. Espera un minuto. |
| El micrófono no te escucha | Da permiso de micrófono al navegador. Firefox no tiene reconocimiento de voz: usa Chrome, Edge o Safari, o configura el dictado con Whisper (paso 6). |
| En el celular (abriendo `http://192.168…` con `npm run dev -- --host`) no funcionan el micrófono ni la ubicación | El navegador solo los permite con HTTPS o en `localhost`. Para la demo en celular publica el frontend con HTTPS (un túnel o un despliegue), o usa `?lat=...&lon=...` y el chat escrito. |
| Las respuestas no usan IA (no aparece la etiqueta "IA" en el chat) | Mira la consola del backend: `respondió 401` = clave incorrecta; `respondió 404 model_not_found` = Groq retiró el modelo: cambia `Ai:Chat:Model` en `appsettings.json` por uno de https://console.groq.com/docs/models. |
| La consola dice `IA de chat: no configurada` | Falta `appsettings.Local.json` o está mal ubicado: debe estar en `backend/src/ElNino.API/`. |
| Una palabra de alarma nueva no se detecta | Las palabras de alarma se cargan al crear la base de datos: borra `elnino.db` y reinicia. |

## 8. Más información

- [README](README.md): estructura del proyecto, configuración de IA, reentrenamiento del modelo y seguridad para desplegar.
- `ml/train_risk_model.py`: entrenamiento del modelo de riesgo XGBoost con el historial del SINPAD.
