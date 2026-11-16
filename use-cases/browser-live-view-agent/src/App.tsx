import React, { useState, useEffect, useRef } from 'react'
import { BrowserLiveView } from 'bedrock-agentcore/browser/live-view'
import { REMOTE_WIDTH, REMOTE_HEIGHT } from './constants'

type AgentStatus = 'idle' | 'starting' | 'running' | 'completed' | 'error'

interface StatusResponse {
  status: AgentStatus
  logs: string[]
  result: string | null
  error: string | null
  liveViewUrl: string | null
  region: string
}

const DEFAULT_PROMPT =
  'Go to en.wikipedia.org, search for "Amazon Web Services", and summarize the key information from the article including when it was founded, main services, and market position.'

async function postJson<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await res.json()
  if (!res.ok) throw new Error(payload.message ?? payload.error ?? `Request failed: ${res.status}`)
  return payload
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const App: React.FC = () => {
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [region, setRegion] = useState('—')
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [connecting, setConnecting] = useState(false)
  const logBodyRef = useRef<HTMLDivElement>(null)

  const applyStatus = (data: StatusResponse): void => {
    setLogs(data.logs)
    setStatus(data.status)
    setResult(data.result)
    setError(data.error)
    setRegion(data.region)
  }

  // Pick up a session the server already has (e.g. after a page reload) so it can still be watched and stopped
  useEffect(() => {
    const restore = async (): Promise<void> => {
      try {
        const res = await fetch('/api/status')
        const data: StatusResponse = await res.json()
        applyStatus(data)
        if (data.liveViewUrl) {
          const { liveViewUrl: freshUrl } = await postJson<{ liveViewUrl: string }>('/api/start')
          setLiveViewUrl(freshUrl)
        }
      } catch (err) {
        setError(`Cannot reach the agent server: ${errorMessage(err)}`)
      }
    }
    void restore()
  }, [])

  useEffect(() => {
    if (status !== 'running' && status !== 'starting') return
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/status')
        applyStatus(await res.json())
      } catch {
        // Transient network errors are retried on the next tick
      }
    }, 1000)
    return () => clearInterval(poll)
  }, [status])

  useEffect(() => {
    // Scroll only the log panel, so the page doesn't jump away from the live view
    logBodyRef.current?.scrollTo({ top: logBodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [logs])

  const handleLaunch = async (): Promise<void> => {
    try {
      setConnecting(true)
      setError(null)
      setResult(null)
      if (!liveViewUrl) {
        const { liveViewUrl: newUrl } = await postJson<{ liveViewUrl: string }>('/api/start')
        setLiveViewUrl(newUrl)
        // Give the live view a moment to connect so the first navigation is visible
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      await postJson('/api/run-agent', { prompt })
      setStatus('running')
    } catch (err) {
      setError(errorMessage(err))
      setStatus('error')
    } finally {
      setConnecting(false)
    }
  }

  const handleStop = async (): Promise<void> => {
    try {
      await postJson('/api/stop')
      setLiveViewUrl(null)
      setStatus('idle')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const isActive = status === 'running' || status === 'starting'
  const statusColor: Record<string, string> = {
    idle: '#9ca3af',
    starting: '#f59e0b',
    running: '#10b981',
    completed: '#3b82f6',
    error: '#ef4444',
  }
  const statusLabel: Record<string, string> = {
    idle: 'Idle',
    starting: 'Starting',
    running: 'Running',
    completed: 'Completed',
    error: 'Error',
  }

  return (
    <div style={s.root}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF9900" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12l2 2 4-4" />
          </svg>
          <div>
            <div style={s.headerTitle}>AgentCore Browser</div>
            <div style={s.headerSub}>Live View Demo</div>
          </div>
        </div>
        <div style={s.headerRight}>
          <div style={{ ...s.statusPill, borderColor: statusColor[status], color: statusColor[status] }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[status] }} />
            {statusLabel[status]}
          </div>
        </div>
      </header>

      {error && <div style={s.errorBar}>{error}</div>}

      <div style={s.layout}>
        {/* Main */}
        <main style={s.main}>
          {/* Live View */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.cardTitle}>Browser Session - Live View</span>
              {liveViewUrl && (
                <button onClick={handleStop} style={s.stopBtn}>
                  Stop Session
                </button>
              )}
            </div>
            <div style={s.viewerContainer}>
              {liveViewUrl ? (
                <BrowserLiveView signedUrl={liveViewUrl} remoteWidth={REMOTE_WIDTH} remoteHeight={REMOTE_HEIGHT} />
              ) : (
                <div style={s.placeholder}>
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                  <p style={s.phTitle}>No active session</p>
                  <p style={s.phSub}>Enter a prompt below and launch the agent to start streaming</p>
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div style={s.card}>
            <div style={s.promptRow}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Tell the agent what to do..."
                disabled={isActive}
                rows={3}
                style={s.promptInput}
              />
              <button
                onClick={handleLaunch}
                disabled={isActive || connecting || !prompt.trim()}
                style={{
                  ...s.launchBtn,
                  opacity: isActive || connecting || !prompt.trim() ? 0.5 : 1,
                  cursor: isActive || connecting ? 'wait' : 'pointer',
                }}
              >
                {connecting ? 'Connecting...' : isActive ? 'Agent Running...' : 'Launch Agent'}
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div style={s.card}>
              <div style={{ ...s.cardHeader, borderColor: '#dbeafe' }}>
                <span style={{ ...s.cardTitle, color: '#1d4ed8' }}>Agent Result</span>
              </div>
              <div style={s.resultBody}>{result}</div>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside style={s.sidebar}>
          {/* Activity Log */}
          <div style={{ ...s.card, flex: 1, display: 'flex', flexDirection: 'column' as const, maxHeight: 580 }}>
            <div style={s.cardHeader}>
              <span style={s.cardTitle}>Activity Log</span>
              <span style={s.logBadge}>{logs.length}</span>
            </div>
            <div ref={logBodyRef} style={s.logBody}>
              {logs.length === 0 ? (
                <p style={s.logEmpty}>Waiting for agent activity...</p>
              ) : (
                logs.map((line, i) => (
                  <div key={i} style={s.logLine}>
                    <span style={s.logTime}>{line.slice(0, 8)}</span>
                    <span style={s.logMsg}>{line.slice(9)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Session Info */}
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.cardTitle}>Session Info</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              {(
                [
                  ['Region', region],
                  ['Viewport', `${REMOTE_WIDTH}\u00D7${REMOTE_HEIGHT}`],
                  ['Protocol', 'DCV / WebSocket'],
                  ['Agent', 'Bedrock Converse API'],
                ] as const
              ).map(([label, value]) => (
                <div key={label} style={s.infoRow}>
                  <span style={s.infoLabel}>{label}</span>
                  <span style={s.infoValue}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ---- Styles (Light / AWS-themed) ----
const s: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: '#f4f6f9',
    color: '#1a202c',
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    background: '#232F3E',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  headerRight: { display: 'flex', alignItems: 'center' },
  headerTitle: { fontSize: '17px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' },
  headerSub: { fontSize: '12px', color: '#9ca3af', marginTop: 1 },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    border: '1.5px solid',
    borderRadius: '999px',
    padding: '3px 14px 3px 10px',
    background: 'rgba(255,255,255,0.08)',
  },
  errorBar: {
    background: '#fef2f2',
    borderBottom: '1px solid #fecaca',
    color: '#b91c1c',
    padding: '8px 24px',
    fontSize: '13px',
  },
  layout: {
    display: 'flex',
    flexWrap: 'wrap',
    maxWidth: '1440px',
    margin: '0 auto',
    padding: '20px',
    gap: '20px',
  },
  // The large grow factor keeps the sidebar near 330px side by side, and full width once it wraps on small screens
  main: { flex: '999 1 600px', minWidth: 0, display: 'flex', flexDirection: 'column' as const, gap: '16px' },
  card: {
    background: '#ffffff',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    padding: '10px 16px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f8fafc',
  },
  cardTitle: { fontSize: '13px', fontWeight: 700, color: '#334155', letterSpacing: '-0.01em' },
  stopBtn: {
    fontSize: '12px',
    padding: '4px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  viewerContainer: {
    aspectRatio: `${REMOTE_WIDTH}/${REMOTE_HEIGHT}`,
    background: '#0f172a',
    position: 'relative' as const,
  },
  placeholder: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: '#0f172a',
  },
  phTitle: { fontSize: '15px', color: '#94a3b8', margin: 0 },
  phSub: { fontSize: '12px', color: '#64748b', margin: 0, maxWidth: 340, textAlign: 'center' as const },
  promptRow: {
    padding: '14px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'flex-end',
  },
  promptInput: {
    flex: '999 1 240px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#1e293b',
    padding: '10px 14px',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'none' as const,
    outline: 'none',
    lineHeight: 1.5,
  },
  launchBtn: {
    flex: '1 0 auto',
    padding: '10px 28px',
    fontSize: '13px',
    fontWeight: 700,
    background: '#FF9900',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    whiteSpace: 'nowrap' as const,
    letterSpacing: '-0.01em',
  },
  resultBody: {
    padding: '14px 16px',
    fontSize: '13px',
    lineHeight: 1.7,
    color: '#334155',
    whiteSpace: 'pre-wrap' as const,
  },
  sidebar: {
    flex: '1 1 330px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  logBadge: {
    fontSize: '11px',
    background: '#e2e8f0',
    padding: '1px 9px',
    borderRadius: '999px',
    color: '#64748b',
    fontWeight: 600,
  },
  logBody: {
    padding: '4px 0',
    fontSize: '12px',
    fontFamily: '"IBM Plex Mono", monospace',
    overflowY: 'auto' as const,
    flex: 1,
  },
  logEmpty: {
    color: '#94a3b8',
    padding: '20px 16px',
    textAlign: 'center' as const,
    margin: 0,
    fontFamily: '"IBM Plex Sans", sans-serif',
    fontSize: '13px',
  },
  logLine: {
    padding: '4px 16px',
    display: 'flex',
    gap: '10px',
    borderBottom: '1px solid #f1f5f9',
    lineHeight: 1.6,
  },
  logTime: { color: '#94a3b8', flexShrink: 0 },
  logMsg: { color: '#475569', wordBreak: 'break-word' as const },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    fontSize: '12px',
  },
  infoLabel: { color: '#94a3b8' },
  infoValue: { color: '#334155', fontWeight: 600 },
}
