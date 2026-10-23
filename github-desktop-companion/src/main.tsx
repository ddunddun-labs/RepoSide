import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { I18nProvider } from './I18nProvider'
import './styles.css'
import '@xterm/xterm/css/xterm.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider><AppErrorBoundary><App /></AppErrorBoundary></I18nProvider>
  </React.StrictMode>
)
