import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useRef, useState } from 'react'
import type { RepositoryState, TerminalAttachment, TerminalData, TerminalTab } from '../shared/types'
import { useI18n } from '../I18nProvider'
import { localizeRuntimeMessage, translate } from '../i18n'
import { TerminalIcon } from './icons'

interface TerminalPanelProps {
  repository?: RepositoryState
}

export function TerminalPanel({ repository }: TerminalPanelProps) {
  const { language, t } = useI18n()
  const languageRef = useRef(language)
  languageRef.current = language
  const hostRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const activeTerminalIdRef = useRef<number | undefined>(undefined)
  const attachedRef = useRef(false)
  const outputOffsetRef = useRef<number | undefined>(undefined)
  const terminalSize = useRef({ columns: 80, rows: 24 })
  const [terminals, setTerminals] = useState<TerminalTab[]>([])
  const [activeTerminalId, setActiveTerminalId] = useState<number>()

  activeTerminalIdRef.current = activeTerminalId

  const syncTerminalSize = () => {
    const fitAddon = fitAddonRef.current
    const terminal = terminalRef.current
    if (!fitAddon || !terminal) return false
    try {
      fitAddon.fit()
      terminalSize.current = { columns: terminal.cols, rows: terminal.rows }
      if (attachedRef.current && activeTerminalIdRef.current !== undefined) {
        window.companion.resizeTerminal(
          activeTerminalIdRef.current,
          terminal.cols,
          terminal.rows
        )
      }
      return true
    } catch {
      return false
    }
  }

  const applyAttachment = (attachment: TerminalAttachment) => {
    const terminal = terminalRef.current
    if (!terminal) return
    setTerminals(attachment.terminals)
    setActiveTerminalId(attachment.terminalId)
    activeTerminalIdRef.current = attachment.terminalId
    terminal.clear()
    terminal.write(attachment.bufferedOutput)
    outputOffsetRef.current = attachment.outputOffset
    attachedRef.current = true
    syncTerminalSize()
  }

  useEffect(() => {
    if (!repository || !hostRef.current) {
      setTerminals([])
      setActiveTerminalId(undefined)
      activeTerminalIdRef.current = undefined
      attachedRef.current = false
      outputOffsetRef.current = undefined
      return
    }

    let cancelled = false
    attachedRef.current = false
    outputOffsetRef.current = undefined
    activeTerminalIdRef.current = undefined

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: '"Cascadia Mono", "Cascadia Code", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.2,
      scrollback: 10_000,
      theme: {
        background: '#080b10',
        foreground: '#d6deeb',
        cursor: '#58a6ff',
        cursorAccent: '#080b10',
        selectionBackground: '#264f78',
        black: '#0d1117',
        red: '#ff7b72',
        green: '#7ee787',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#76e3ea',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#aff5b4',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#a5d6ff',
        brightWhite: '#f0f6fc',
      },
    })
    const fitAddon = new FitAddon()
    terminalRef.current = terminal
    fitAddonRef.current = fitAddon
    terminal.loadAddon(fitAddon)
    terminal.open(hostRef.current)

    terminal.attachCustomKeyEventHandler(event => {
      const copyShortcut = event.type === 'keydown' &&
        event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'c' &&
        terminal.hasSelection()
      if (copyShortcut) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        window.companion.writeClipboardText(terminal.getSelection())
        return false
      }

      const pasteShortcut = event.type === 'keydown' && (
        (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'v') ||
        (event.shiftKey && event.key === 'Insert')
      )
      if (!pasteShortcut) return true
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      void window.companion.readClipboardText().then(text => {
        const singleLine = text.replace(/\r\n|\r|\n/g, ' ')
        if (singleLine) terminal.paste(singleLine)
      })
      return false
    })

    const pendingOutput: TerminalData[] = []
    const writeOutput = (event: TerminalData) => {
      if (outputOffsetRef.current === undefined) {
        pendingOutput.push(event)
        return
      }
      const eventEnd = event.offset + event.data.length
      if (eventEnd <= outputOffsetRef.current) return
      const overlap = Math.max(0, outputOffsetRef.current - event.offset)
      terminal.write(event.data.slice(overlap))
      outputOffsetRef.current = eventEnd
    }

    const dataDisposable = terminal.onData(data => {
      if (attachedRef.current && activeTerminalIdRef.current !== undefined) {
        window.companion.writeTerminal(activeTerminalIdRef.current, data)
      }
    })
    const unsubscribe = window.companion.onTerminalData(event => {
      if (
        event.repositoryId === repository.id &&
        event.terminalId === activeTerminalIdRef.current
      ) writeOutput(event)
    })

    const scheduleFit = (afterFit?: () => void) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return
          syncTerminalSize()
          afterFit?.()
        })
      })
    }

    const resizeObserver = new ResizeObserver(() => scheduleFit())
    resizeObserver.observe(hostRef.current)
    if (terminal.element) resizeObserver.observe(terminal.element)

    const onWindowResize = () => scheduleFit()
    window.addEventListener('resize', onWindowResize)

    void document.fonts.ready.then(() => {
      if (!cancelled) scheduleFit()
    })

    scheduleFit(() => {
      void window.companion.attachTerminal(
        undefined,
        terminalSize.current.columns,
        terminalSize.current.rows
      ).then(attachment => {
        if (cancelled || attachment.repositoryId !== repository.id) return
        applyAttachment(attachment)
        for (const event of pendingOutput) writeOutput(event)
        pendingOutput.length = 0
        scheduleFit()
        terminal.focus()
      }).catch(error => {
        const reason = error instanceof Error ? error.message : String(error)
        terminal.writeln(`\r\n\x1b[31m${translate(languageRef.current, 'terminal.error', { reason: localizeRuntimeMessage(reason, languageRef.current) })}\x1b[0m`)
      })
    })

    return () => {
      cancelled = true
      attachedRef.current = false
      window.removeEventListener('resize', onWindowResize)
      resizeObserver.disconnect()
      unsubscribe()
      dataDisposable.dispose()
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [repository?.id])

  const selectTerminal = (terminalId: number) => {
    if (!repository || terminalId === activeTerminalIdRef.current) return
    syncTerminalSize()
    void window.companion.attachTerminal(
      terminalId,
      terminalSize.current.columns,
      terminalSize.current.rows
    ).then(attachment => {
      if (attachment.repositoryId !== repository.id) return
      applyAttachment(attachment)
    })
  }

  const createTerminal = () => {
    if (!repository) return
    syncTerminalSize()
    void window.companion.createTerminal(
      terminalSize.current.columns,
      terminalSize.current.rows
    ).then(attachment => {
      if (attachment.repositoryId !== repository.id) return
      applyAttachment(attachment)
    })
  }

  const closeTerminal = (terminalId: number) => {
    if (!repository) return
    syncTerminalSize()
    void window.companion.closeTerminal(
      terminalId,
      terminalSize.current.columns,
      terminalSize.current.rows
    ).then(attachment => {
      if (attachment.repositoryId !== repository.id) return
      applyAttachment(attachment)
    })
  }

  return <div className="terminal-shell">
    <div className="terminal-toolbar">
      <div className="terminal-tabs">
        {terminals.map((item, index) => <div
          className={`terminal-tab${item.id === activeTerminalId ? ' active' : ''}`}
          key={item.id}
        >
          <button className="terminal-tab-select" onClick={() => selectTerminal(item.id)}>
            <TerminalIcon size={15} />
            <span>{terminals.length > 1 ? `${item.shellName} ${index + 1}` : item.shellName}</span>
          </button>
          <button
            className="terminal-tab-close"
            title={t('terminal.close', { name: item.shellName })}
            aria-label={t('terminal.close', { name: item.shellName })}
            onClick={() => closeTerminal(item.id)}
          >×</button>
        </div>)}
      </div>
      <button className="icon-button" title={t('terminal.new')} aria-label={t('terminal.new')} onClick={createTerminal} disabled={!repository}>+</button>
    </div>
    {repository
      ? <div className="xterm-host" ref={hostRef} />
      : <div className="terminal-placeholder"><div className="terminal-mark"><TerminalIcon size={26} /></div><h2>{t('terminal.heading')}</h2><p>{t('terminal.waiting')}</p></div>}
  </div>
}
