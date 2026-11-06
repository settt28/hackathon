---
name: ui-ux
description: Guía de UI/UX y diseño responsive del frontend de Paty (React + Tailwind). Úsala antes de crear o modificar cualquier pantalla, componente, layout, estilo o breakpoint en frontend/, y para revisar que una interfaz se vea bien en celular, tablet y PC.
---

# UI/UX de Paty

Paty es una app de prevención y emergencias: la usan personas con miedo, poca señal y celulares de gama baja.
Cada decisión de diseño se mide contra eso: **claridad, rapidez y que la acción de emergencia esté siempre a un toque.**

## Reglas que no se rompen

1. **Nunca quitar elementos ni funciones al adaptar una pantalla.** Se reorganizan (columnas, orden, tamaño), no se eliminan.
   Si algo no cabe, se pliega (`<details>`, "Ver más") o se mueve, pero sigue accesible.
2. **El celular es el diseño base.** Se escribe primero sin prefijos (móvil) y se amplía hacia arriba. Un cambio para
   tablet/PC no puede alterar cómo se ve en el celular.
3. **Emergencia primero.** SOS, 911, SAMU 106 y los botones "Llamar" son siempre visibles, grandes (mín. 44×44 px) y en rojo.
   La pantalla de emergencia (`pages/EmergencyView.tsx`) va en el bundle principal: no se carga con `lazy()`.
4. **No afirmar seguridad sin datos.** Sin datos se muestra "Sin datos" / "Sin alertas", nunca "Riesgo bajo".

## Sistema responsive

Las pantallas a pantalla completa (`/`, `/paty`, `/historial`, `/emergencia`) viven dentro de `layouts/DeviceFrame.tsx`,
que es un **`@container`**. Por eso se usan **container queries**, no breakpoints de ventana:

| Prefijo | Ancho del contenedor | Uso |
|---|---|---|
| (ninguno) | < 768 px | Celular: una columna, márgenes `px-4` |
| `@2xl:` | ≥ 672 px | Ventanas/hojas internas con contenedor propio (p. ej. el pop-up del mapa) |
| `@3xl:` | ≥ 768 px | Tablet: dos columnas, `px-6`, contenido en `mx-auto max-w-6xl` |
| `@4xl:` | ≥ 896 px | Tablet horizontal / PC chico: paneles laterales (`sticky`) |
| `@5xl:` | ≥ 1024 px | PC: más columnas, mapa más grande |

- **Por qué container queries:** la "vista teléfono" (marco de celular de 390 px para presentaciones) dibuja la app dentro
  de una ventana ancha. Con `md:`/`lg:` el marco mostraría el diseño de PC; con `@3xl:` se ve como celular.
- **`sm:`, `md:`, `lg:` (ventana)** solo para: el propio `DeviceFrame`, overlays `fixed` (p. ej. `MedicalAlert`) y las
  pantallas de `MainLayout` (`/resumen`, `/salud`, `/agro`, `/infraestructura`), que tienen sidebar propio.
- **Solo dentro del marco:** `sm:group-data-[framed=true]/frame:<clase>` (ej. menos espacio bajo la barra "9:41").
- **Sin selector de vista:** la app detecta sola el tamaño de pantalla. El marco de celular existe solo para
  presentaciones con `?vista=telefono` en la URL (no se guarda; `hooks/useDevicePreview.ts`).

### Aprovechar pantallas grandes

- Ancho del contenido: `mx-auto max-w-[110rem]` con `@3xl:px-8 @5xl:px-10`. Nada de columnas angostas con franjas vacías a los lados.
- Altura: en PC la pantalla se llena. El inicio usa `@3xl:min-h-full` + grilla `flex-1` y el mapa ocupa todo el alto
  (`flex-1`, mín. `30rem`/`34rem`; en tablet vertical máx. `44rem`). Las pantallas de acciones (Emergencia) centran su contenido en vertical (`my-auto`).
- Escala: desde `@5xl:` (inicio) o `@6xl:` (emergencia) los elementos crecen: íconos, textos (números de emergencia hasta
  `text-6xl`), rellenos y botones. Siempre como variantes `@…:` encima de la clase móvil, que no se toca.
- Decorativos de fondo (silueta del Perú): centrados en la pantalla (`top-1/2 left-1/2` + traslado) y dimensionados por el alto.

### Patrones por pantalla

- **Inicio:** móvil en una columna (estado → mapa → historial → Paty → SOS). `@3xl:` en grilla de 2 columnas con posiciones
  explícitas (`col-start`/`row-start`): izquierda estado + accesos + SOS, derecha el mapa (`row-span-3`). Centrado vertical.
- **Pop-ups:** en móvil, hoja inferior (`justify-end`, `rounded-t`, `animate-sheet-up`); desde `@3xl:`, ventana centrada
  (`items-center justify-center`, `max-w-5xl`, `rounded-[2rem]`) y contenido en 2 columnas.
- **Listas de lectura (chat, historial):** columna de lectura `mx-auto max-w-3xl`; el panel de contexto va `sticky` al costado.
- **Grillas de tarjetas:** 2 → 3 → 5 columnas. Con cantidad impar en 2 columnas, la última ocupa la fila
  (`[&>*:last-child:nth-child(odd)]:col-span-2`) y se anula en el breakpoint siguiente. Botones de acción alineados abajo (`flex-1` en el texto).
- **Decorativos absolutos** (silueta del Perú, resplandores): acotar tamaño en pantallas anchas para que no agreguen scroll.

### Mapa de riesgo (`MapCard`, `riskmap/RiskMap`)

- Área fija de `MAP_RADIUS_KM` (20 km) alrededor de la persona, centrada en ella (`lib/riskGeo.ts`).
- Proyección Web Mercator (unidades = píxeles del mundo a zoom 20) para que distritos y mapa base calcen.
- Capas, de abajo hacia arriba: cuadrícula → mapa base (`BaseMapTiles`, Esri Dark Gray Base fundido con
  `screen`/`multiply`, invertido en tema claro) → distritos (relleno translúcido) → nombres (`DistrictLabels`) → marcador y controles.
- Los nombres solo se muestran si caben y no chocan; al acercar aparecen más. Tamaño de letra fijo en pantalla.
- Siempre mostrar los créditos del mapa base (`MapAttribution`). Sin internet el mapa base no carga y queda la cuadrícula.
- Nada de librerías de mapas pesadas: el mapa debe seguir siendo liviano para redes 3G.

## Estilo visual

- Tema claro y oscuro en todo (`dark:`); el oscuro es el predeterminado. Fondo `#f4f7fb` / `#070d17`.
- Acento: `sky-600` (claro) / `cyan-300/400` (oscuro). Ámbar = información oficial. Rojo = emergencia. Riesgo: verde, amarillo, naranja, rojo.
- Tarjetas `rounded-2xl`/`rounded-3xl`, borde sutil (`border-slate-200` / `dark:border-cyan-400/15`), sin sombras en oscuro.
- Etiquetas de sección: `text-[10px]–[11px] font-extrabold tracking-[0.16em]` en mayúsculas.
- Animaciones siempre con `motion-safe:`.
- Clases de Tailwind completas en el código (nada de `bg-${color}-500`): si no, no entran al build.

## Accesibilidad

- Controles solo con ícono: `aria-label`. Íconos decorativos: `aria-hidden`.
- Foco visible: `focus-visible:ring-2` en todo lo interactivo.
- Diálogos: `role="dialog"` + `aria-modal`, foco inicial al abrir (una sola vez), `Escape` cierra.
- Estados que cambian solos (riesgo, alertas, chat): `aria-live="polite"`.
- Texto mínimo 11 px; contraste AA en ambos temas.

## Cómo verificar un cambio

1. `cd frontend && npm run build && npx oxlint` sin errores ni avisos.
2. Revisar cada pantalla tocada en **390×844 (celular), 820×1180 (tablet), 1440×900 y 1920×1080 (PC)**, en tema claro y oscuro,
   y en `?vista=telefono` (debe verse igual que en el celular).
   Con `?lat=-12.05&lon=-77.04` en la URL no hace falta GPS.
3. Comprobar que **todos** los elementos y acciones del celular siguen presentes en tablet y PC.
