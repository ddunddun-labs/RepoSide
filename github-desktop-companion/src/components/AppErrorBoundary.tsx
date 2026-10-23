import { Component, type ErrorInfo, type ReactNode } from 'react'
import { I18nContext } from '../I18nProvider'
import { localizeRuntimeMessage } from '../i18n'
import type { UiLanguage } from '../i18n'

interface Props { children: ReactNode }
interface State { error?: Error }

export class AppErrorBoundary extends Component<Props, State> {
  static contextType = I18nContext
  declare context: { language: UiLanguage; t(key: 'app.rendererError'): string } | undefined
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <div className="fatal-error">
        <strong>{this.context?.t('app.rendererError') ?? 'Could not start the app.'}</strong>
        <span>{localizeRuntimeMessage(this.state.error.message, this.context?.language ?? 'en')}</span>
      </div>
    }
    return this.props.children
  }
}
