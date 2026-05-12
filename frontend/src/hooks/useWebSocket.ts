import { useEffect, useRef, useState, useCallback } from 'react'

export interface WSMessage {
  event: string
  data: unknown
}

interface UseWebSocketReturn {
  isConnected: boolean
  lastMessage: WSMessage | null
}

const WS_BASE = 'ws://localhost:8000/api'
const MAX_BACKOFF_MS = 30_000

export function useWebSocket(projectId: string | undefined): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)
  const unmountedRef = useRef(false)

  const getToken = useCallback(() => localStorage.getItem('token'), [])

  const connect = useCallback(() => {
    if (unmountedRef.current || !projectId) return

    const token = getToken()
    if (!token) return

    const url = `${WS_BASE}/ws/${projectId}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return }
      setIsConnected(true)
      attemptsRef.current = 0
    }

    ws.onmessage = (event) => {
      if (unmountedRef.current) return
      try {
        const msg = JSON.parse(event.data as string) as WSMessage
        setLastMessage(msg)
      } catch {
        // ignore non-JSON messages (e.g. "pong")
      }
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      setIsConnected(false)
      wsRef.current = null

      // Exponential backoff: 1s, 2s, 4s, 8s … up to 30s
      const delay = Math.min(1_000 * 2 ** attemptsRef.current, MAX_BACKOFF_MS)
      attemptsRef.current += 1
      reconnectTimerRef.current = setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [projectId, getToken])

  useEffect(() => {
    unmountedRef.current = false
    attemptsRef.current = 0
    connect()

    return () => {
      unmountedRef.current = true
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return { isConnected, lastMessage }
}
