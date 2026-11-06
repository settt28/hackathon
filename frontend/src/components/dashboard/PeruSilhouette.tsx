import type { FC } from 'react'
import peruMask from '../../assets/peru-mask.png'

/**
 * Silueta del Perú para el fondo del dashboard.
 * La forma viene de `assets/peru-mask.png` (mapa real con fondo transparente) usada como máscara CSS,
 * así el color se controla con Tailwind según el tema:
 * - Modo oscuro: verde azulado translúcido con resplandor cian en los bordes.
 * - Modo claro: gris sólido #E2E2E2, sin resplandor.
 * El resplandor va en el contenedor padre porque `filter` en el mismo elemento quedaría recortado por la máscara.
 */
const PeruSilhouette: FC = () => (
  <div
    className="pointer-events-none absolute left-[3.5%] top-[24%] w-[93%] drop-shadow-none dark:drop-shadow-[0_0_16px_rgba(34,211,238,0.35)]"
    aria-hidden
  >
    <div
      className="aspect-[233/340] w-full bg-[#E2E2E2] dark:bg-gradient-to-b dark:from-[#16424c] dark:to-[#0f3039]"
      style={{
        maskImage: `url(${peruMask})`,
        WebkitMaskImage: `url(${peruMask})`,
        maskSize: '100% 100%',
        WebkitMaskSize: '100% 100%',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  </div>
)

export default PeruSilhouette
