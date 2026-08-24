interface IconProps {
  size?: number
}

export function FolderIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M1.75 3.5h4l1.35 1.4h7.15v7.35a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1V3.5Z" fill="currentColor"/><path d="M1.75 4.9h12.5" stroke="#0d1117" opacity=".35"/></svg>
}

export function FileIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M3 1.75h6l4 4v8.5H3V1.75Z" stroke="currentColor"/><path d="M9 1.75v4h4" stroke="currentColor"/></svg>
}

export function ChevronIcon({ size = 14 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="m6 3.75 4.25 4.25L6 12.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

export function TerminalIcon({ size = 18 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.25" width="13" height="11.5" rx="1.5" stroke="currentColor"/><path d="m4 5 2.25 2L4 9M8 10h3.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
}

export function ExplorerIcon({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none"><path d="M1.5 4h5l1.25 1.25h6.75v7.5H1.5V4Z" stroke="currentColor"/><path d="M5.25 8.25h5.5M8 5.25v6" stroke="currentColor" opacity=".75"/></svg>
}
