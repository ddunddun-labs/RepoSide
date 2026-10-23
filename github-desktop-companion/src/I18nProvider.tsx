import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  readUiLanguage,
  translate,
  writeUiLanguage,
} from './i18n'
import type { TranslationKey, UiLanguage } from './i18n'

interface I18nContextValue {
  language: UiLanguage
  setLanguage(language: UiLanguage): void
  t(key: TranslationKey, params?: Record<string, string | number>): string
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined)

function readLanguage(): UiLanguage {
  try {
    return readUiLanguage(localStorage)
  } catch {
    return 'en'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState(readLanguage)
  const setLanguage = useCallback((nextLanguage: UiLanguage) => {
    updateLanguage(nextLanguage)
    writeUiLanguage(localStorage, nextLanguage)
  }, [])
  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    t: (key, params) => translate(language, key, params),
  }), [language, setLanguage])

  useEffect(() => {
    document.documentElement.lang = language
    window.companion?.setTerminalLanguage(language)
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
