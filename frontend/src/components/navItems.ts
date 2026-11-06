import type { ComponentType } from 'react'
import { BuildingIcon, HeartIcon, HomeIcon, LeafIcon } from './Icons'

/** Definición única de la navegación: la usan el Sidebar (desktop) y la Bottom Bar (móvil). */
export type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: HomeIcon },
  { to: '/salud', label: 'Salud', icon: HeartIcon },
  { to: '/agro', label: 'Agro', icon: LeafIcon },
  { to: '/infraestructura', label: 'Infraestructura', icon: BuildingIcon },
]
