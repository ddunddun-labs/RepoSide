import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useEffect, useRef, useState } from 'react'
import type { RepositoryState, TerminalData, TerminalTab } from '../shared/types'
import { TerminalIcon } from './icons'

interface TerminalPanelProps {
  repository?: RepositoryState
}

export function TerminalPanel({ repository }: TerminalPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const lastRepositoryId = useRef<number | undefined>(undefined)
  const terminalSize = useRef({ columns: 80, rows: 24 })
  const [terminals, setTerminals] = useState<TerminalTab[]>([])
  const [activeTerminalId, setActiveTerminalId] = useState<number>()

  useEffect(() => {
    if (!repository || !hostRef.current) {
      setTerminals([])
      setActiveTerminalId(undefined)
      return
    }

    const repositoryChanged = lastRepositoryId.current !== repository.id
    lastRepositoryId.current = repository.id
    const requestedTerminalId = repositoryChanged ? undefined : activeTerminalId
    if (repositoryChanged) setTerminals([])
    let cancelled = false

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

    let attached = false
    let outputOffset: number | undefined
    const pendingOutput: TerminalData[] = []
    const writeOutput = (event: TerminalData) => {
      if (outputOffset === undefined) {
        pendingOutput.push(event)
        return
      }
      const eventEnd = event.offset + event.data.length
      if (eventEnd <= outputOffset) return
      const overlap = Math.max(0, outputOffset - event.offset)
      terminal.write(event.data.slice(overlap))
      outputOffset = eventEnd
    }
    const dataDisposable = terminal.onData(data => {
      if (attached && activeTerminalId !== undefined) {
        window.companion.writeTerminal(activeTerminalId, data)
      }
    })
    const unsubscribe = window.companion.onTerminalData(event => {
      if (
        event.repositoryId === repository.id &&
        event.terminalId === activeTerminalId
      ) writeOutput(event)
    })
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit()
        terminalSize.current = { columns: terminal.cols, rows: terminal.rows }
        if (attached) {
          window.companion.resizeTerminal(activeTerminalId!, terminal.cols, terminal.rows)
        }
      } catch {
        // The element can briefly have no dimensions while switching repositories.
      }
    })
    resizeObserver.observe(hostRef.current)

    requestAnimationFrame(() => {
      fitAddon.fit()
      terminalSize.current = { columns: terminal.cols, rows: terminal.rows }
      void window.companion.attachTerminal(
        requestedTerminalId,
        terminal.cols,
        terminal.rows
      ).then(attachment => {
        if (cancelled || attachment.repositoryId !== repository.id) return
        setTerminals(attachment.terminals)
        setActiveTerminalId(attachment.terminalId)
        terminal.write(attachment.bufferedOutput)
        outputOffset = attachment.outputOffset
        for (const event of pendingOutput) writeOutput(event)
        pendingOutput.length = 0
        attached = true
        terminal.focus()
      }).catch(error => {
        terminal.writeln(`\r\n\x1b[31mTerminal failed: ${error.message}\x1b[0m`)
      })
    })

    return () => {
      cancelled = true
      attached = false
      resizeObserver.disconnect()
      unsubscribe()
      dataDisposable.dispose()
      terminal.dispose()
    }
  }, [repository?.id, activeTerminalId])

  const createTerminal = () => {
    if (!repository) return
    const { columns, rows } = terminalSize.current
    void window.companion.createTerminal(columns, rows).then(attachment => {
      if (attachment.repositoryId !== repository.id) return
      setTerminals(attachment.terminals)
      setActiveTerminalId(attachment.terminalId)
    })
  }

  const closeTerminal = (terminalId: number) => {
    if (!repository) return
    const { columns, rows } = terminalSize.current
    void window.companion.closeTerminal(terminalId, columns, rows).then(attachment => {
      if (attachment.repositoryId !== repository.id) return
      setTerminals(attachment.terminals)
      setActiveTerminalId(attachment.terminalId)
    })
  }

  return <div className="terminal-shell">
    <div className="terminal-toolbar">
      <div className="terminal-tabs">
        {terminals.map((item, index) => <div
          className={`terminal-tab${item.id === activeTerminalId ? ' active' : ''}`}
          key={item.id}
        >
          <button className="terminal-tab-select" onClick={() => setActiveTerminalId(item.id)}>
            <TerminalIcon size={15} />
            <span>{terminals.length > 1 ? `${item.shellName} ${index + 1}` : item.shellName}</span>
          </button>
          <button
            className="terminal-tab-close"
            title="터미널 닫기"
            aria-label={`${item.shellName} 터미널 닫기`}
            onClick={() => closeTerminal(item.id)}
          >×</button>
        </div>)}
      </div>
      <button className="icon-button" title="새 터미널" onClick={createTerminal} disabled={!repository}>+</button>
    </div>
    {repository
      ? <div className="xterm-host" ref={hostRef} />
      : <div className="terminal-placeholder"><div className="terminal-mark"><TerminalIcon size={26} /></div><h2>Terminal</h2><p>Repository 연결을 기다리는 중이야.</p></div>}
  </div>
}
