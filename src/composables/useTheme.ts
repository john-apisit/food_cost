import { computed, ref } from 'vue'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'food-cost-theme'

const theme = ref<Theme>('light')

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // ignore unavailable storage
  }
  return 'light'
}

function applyTheme(value: Theme, persist: boolean) {
  theme.value = value
  const root = document.documentElement
  root.classList.toggle('dark', value === 'dark')
  root.style.colorScheme = value
  if (!persist) return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // ignore unavailable storage
  }
}

export function initTheme() {
  applyTheme(readStoredTheme(), false)
}

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  const setTheme = (value: Theme) => {
    applyTheme(value, true)
  }

  return {
    theme,
    isDark,
    setTheme,
  }
}
