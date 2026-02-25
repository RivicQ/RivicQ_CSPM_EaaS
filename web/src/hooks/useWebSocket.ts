import { useState, useEffect, useRef } from 'react'

export interface WebSocketData {
  type: string
  data: unknown
}

export function useWebSocket(url?: string) {
  const [data, setData] = useState<WebSocketData | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!url) return

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as WebSocketData
        setData(parsed)
      } catch {
        // ignore parse errors
      }
    }

    return () => {
      ws.close()
    }
  }, [url])

  const send = (message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }

  return { data, connected, send }
}
