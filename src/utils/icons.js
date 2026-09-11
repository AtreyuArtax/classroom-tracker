import {
  DoorOpen,
  UserX,
  Clock,
  NotebookPen,
  Phone,
  GraduationCap,
  Smartphone,
  Activity,
  BookOpen,
  Eye,
  MessageSquare,
  Hand,
  Heart,
  Smile,
  AlertTriangle,
  XCircle,
  Shield,
  Zap,
  Award,
  Flame,
  HelpCircle,
  Star,
  CheckCircle2,
  CalendarClock,
  Check,
  Plus,
  Trash2,
  Pencil,
  Users,
  Folder,
  Calculator,
  FlaskConical,
  Globe,
  Palette,
  Languages
} from 'lucide-vue-next'

const iconMap = {
  DoorOpen,
  UserX,
  Clock,
  NotebookPen,
  Phone,
  GraduationCap,
  Smartphone,
  Activity,
  BookOpen,
  Eye,
  MessageSquare,
  Hand,
  Heart,
  Smile,
  AlertTriangle,
  XCircle,
  Shield,
  Zap,
  Award,
  Flame,
  HelpCircle,
  Star,
  CheckCircle2,
  CalendarClock,
  Check,
  Plus,
  Trash2,
  Pencil,
  Users,
  Folder,
  Calculator,
  FlaskConical,
  Globe,
  Palette,
  Languages,
  // Aliases for legacy data & migrations
  Toilet: DoorOpen,
  Droplets: DoorOpen
}

/**
 * Resolves a Lucide icon name string to its Vue component.
 * Falls back to HelpCircle if the name is not found.
 */
export function resolveIcon(name) {
  if (!name) return HelpCircle
  return iconMap[name] || HelpCircle
}

/**
 * Common icon size for behavior code contexts (radial, event feed, charts)
 */
export const ICON_SIZE_SM = 18

/**
 * Common icon size for navigation and UI chrome
 */
export const ICON_SIZE_MD = 22
