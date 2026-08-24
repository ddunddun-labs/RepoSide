import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error?: Error }

export class AppErrorBoundary extends Component<Props, State> {
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
        <strong>Renderer를 시작하지 못했어.</strong>
        <span>{this.state.error.message}</span>
      </div>
    }
    return this.props.children
  }
}
