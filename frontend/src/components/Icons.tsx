/**
 * Íconos SVG inline (sin dependencias externas). Heredan el color con `currentColor`
 * y el tamaño con clases de Tailwind pasadas por `className`.
 */
type IconProps = { className?: string }

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

export const HomeIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></svg>
)

export const HeartIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}><path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.3h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.4 4.3 6.7C19.5 16.4 12 21 12 21z" /></svg>
)

export const LeafIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}><path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15zM5 19l7-7" /></svg>
)

export const BuildingIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}><path d="M4 21V5l8-3 8 3v16M9 21v-4h6v4M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01" /></svg>
)

export const AlertIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}><path d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01" /></svg>
)

export const ChatIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}><path d="M4 5h16v11H8l-4 4z" /></svg>
)

export const CloseIcon = ({ className = 'h-6 w-6' }: IconProps) => (
  <svg {...base} className={className}><path d="M6 6l12 12M18 6 6 18" /></svg>
)

export const SendIcon = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg {...base} className={className}><path d="M4 12 20 4l-6 16-3-7z" /></svg>
)
