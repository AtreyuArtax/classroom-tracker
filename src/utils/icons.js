import * as LucideIcons from 'lucide-vue-next'

/**
 * Resolves a Lucide icon name string to its Vue component.
 * Falls back to HelpCircle if the name is not found.
 */
export function resolveIcon(name) {
    return LucideIcons[name] ?? LucideIcons.HelpCircle
}

/**
 * Common icon size for behavior code contexts (radial, event feed, charts)
 */
export const ICON_SIZE_SM = 18

/**
 * Common icon size for navigation and UI chrome
 */
export const ICON_SIZE_MD = 22
