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
| http://localhost:5173/resumen | Resumen de alertas por sector |
| http://localhost:5173/salud, /agro, /infraestructura | Alertas y recomendaciones de cada sector |

### Sin GPS (laptop o demo)

El navegador pide permiso de ubicación. Si no lo das, o tu computadora no tiene GPS, fija una ubicación en la URL.
Por ejemplo, Chosica (Lurigancho, Lima), una zona con historial de huaicos:

```
http://localhost:5173/?lat=-11.9369&lon=-76.6966
```

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

Sin configurar nada, Paty ya funciona: responde con los consejos oficiales y lee en voz alta con la voz del
navegador. Para que un modelo de lenguaje redacte las respuestas y para dictar por voz, elige una opción y
**reinicia el backend** en la misma terminal donde definiste las variables.

**Opción A: Groq (en la nube, gratis con registro).** Crea una clave en https://console.groq.com

```powershell
# Windows (PowerShell), solo para esta terminal
$env:Ai__Chat__ApiKey="gsk_tu_clave"
$env:Ai__Stt__ApiKey="gsk_tu_clave"      # dictado por voz (Whisper)
```

```bash
# macOS / Linux / Git Bash
export Ai__Chat__ApiKey="gsk_tu_clave"
export Ai__Stt__ApiKey="gsk_tu_clave"
```

**Opción B: Ollama (en tu computadora, sin internet).**

```bash
ollama pull llama3.1:8b
```

```powershell
$env:Ai__Chat__BaseUrl="http://localhost:11434/v1"; $env:Ai__Chat__Model="llama3.1:8b"
```

**Voz natural con Fish Audio (opcional).** Crea una clave en https://fish.audio y elige una voz:

```powershell
$env:Ai__Tts__ApiKey="tu_clave"; $env:Ai__Tts__VoiceId="id_de_la_voz"
```

Al arrancar, la consola del backend dice qué quedó activo, por ejemplo
`IA de chat: llama-3.1-8b-instant · Dictado: whisper-large-v3-turbo`. El micrófono del chat solo aparece si el
dictado está activo.

> Nunca subas las claves al repositorio: van solo en variables de entorno.

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
| No aparece el micrófono en el chat | El dictado no está configurado (paso 6). |
| Una palabra de alarma nueva no se detecta | Las palabras de alarma se cargan al crear la base de datos: borra `elnino.db` y reinicia. |

## 8. Más información

- [README](README.md): estructura del proyecto, configuración de IA, reentrenamiento del modelo y seguridad para desplegar.
- `ml/train_risk_model.py`: entrenamiento del modelo de riesgo XGBoost con el historial del SINPAD.
