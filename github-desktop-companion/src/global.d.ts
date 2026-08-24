import type { CompanionApi } from './shared/types'

declare global {
  interface Window {
    companion: CompanionApi
  }
}

export {}
