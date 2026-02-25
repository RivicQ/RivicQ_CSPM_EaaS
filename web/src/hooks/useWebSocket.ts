import { useState, useCallback } from 'react';

export function useWebSocket() {
  const [data, setData] = useState<any>(null);

  const send = useCallback((message: any) => {
    // WebSocket send placeholder
    console.debug('WS send:', message);
  }, []);

  return { data, send, setData };
}
