# Paty en Android (APK)

Guía para el proyecto Android que envuelve la app web (WebView, Capacitor o TWA). La app web ya está preparada:
pantalla completa, colores de la barra de estado, reintento de ubicación y voz. Lo de abajo va **en el proyecto
Android**, que no está en este repositorio.

> Los fragmentos son de referencia: no se probaron en un proyecto Android real. Revisa los nombres de tus clases.

## 1. ¿Cómo carga la app el APK?

| Forma | Ubicación y micrófono | Recomendación |
|---|---|---|
| **Capacitor** (la web va dentro del APK, origen `https://localhost`) | ✅ Funcionan (origen seguro) | La más simple |
| **TWA / Bubblewrap** (abre la web publicada en HTTPS, en Chrome) | ✅ Funcionan | Si la web está publicada con HTTPS |
| **WebView propio** que carga una URL `http://…` (ej. `http://192.168.1.10:5173`) | ❌ **El navegador los bloquea**: no es un origen seguro | Usa HTTPS o carga la web empaquetada |

**Si "no carga la ubicación" en el APK, revisa esto primero:** con una URL `http://` que no sea `localhost`,
Android nunca entrega la ubicación ni el micrófono a la página, aunque la app tenga los permisos.

## 2. Backend desde el APK

Dentro del APK no existe el proxy de Vite, así que la app debe saber dónde está la API:

```bash
# frontend: compila apuntando al backend publicado
VITE_API_URL=https://tu-backend.com npm run build
```

Y agrega el origen de la app a `Cors:Origins` del backend (Capacitor: `https://localhost` y `capacitor://localhost`).

## 3. Ocultar la barra de estado (pantalla completa)

**TWA / Bubblewrap:** ya está; el `manifest.webmanifest` declara `"display": "fullscreen"`.

**Capacitor:**

```bash
npm install @capacitor/status-bar && npx cap sync
```

```ts
// frontend/src/main.tsx (solo dentro de la app nativa)
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
if (Capacitor.isNativePlatform()) void StatusBar.hide()
```

**WebView propio (Kotlin, en `MainActivity.onCreate`):**

```kotlin
WindowCompat.setDecorFitsSystemWindows(window, false)
WindowInsetsControllerCompat(window, window.decorView).apply {
    hide(WindowInsetsCompat.Type.statusBars())
    systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
}
```

La app web ya respeta las zonas seguras (notch) con `viewport-fit=cover` y `env(safe-area-inset-*)`.

## 4. Permisos: ubicación y micrófono (WebView propio)

`AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

`MainActivity` (pide los permisos al abrir y se los da a la página):

```kotlin
private val askPermissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    askPermissions.launch(arrayOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.RECORD_AUDIO,
    ))

    webView.settings.javaScriptEnabled = true
    webView.settings.domStorageEnabled = true
    webView.settings.setGeolocationEnabled(true)
    webView.settings.mediaPlaybackRequiresUserGesture = false // para que Paty pueda hablar

    webView.webChromeClient = object : WebChromeClient() {
        // Ubicación: la página la pide → se concede (el permiso de Android ya se pidió arriba)
        override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
            callback.invoke(origin, true, false)
        }
        // Micrófono para la llamada con Paty
        override fun onPermissionRequest(request: PermissionRequest) {
            runOnUiThread { request.grant(request.resources) }
        }
    }
}
```

La app web vuelve a pedir la ubicación cuando la persona regresa a la app, así que, si acepta el permiso un poco
después, el mapa y el riesgo se cargan solos sin reiniciar.

## 5. Voz dentro del APK

- **Reconocimiento de voz:** el WebView de Android **no** trae reconocimiento de voz propio (Chrome sí). En el APK
  la llamada con Paty usa el dictado del servidor (Whisper vía Groq), así que hay que configurar `Ai:Stt` en el
  backend (ver el [tutorial](../TUTORIAL.md#6-activar-la-ia-de-chat-y-la-voz-opcional)).
- **Voz de Paty:** con Fish Audio configurado suena igual que en la web. El botón de llamar (`tel:106`) abre el
  marcador del teléfono. En un WebView propio, intercepta `tel:` en `shouldOverrideUrlLoading` y abre
  `Intent(Intent.ACTION_DIAL, uri)`.
