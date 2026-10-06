import { useEffect, useState } from 'react'
import './App.css'

type ApiStatus = 'checking' | 'ok' | 'down'

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then((data: { status: string }) => setApiStatus(data.status === 'ok' ? 'ok' : 'down'))
      .catch(() => setApiStatus('down'))
  }, [])

  return (
    <main className="app">
      <h1>ShortenUrl</h1>
      <p>Stage 0 skeleton: the shorten form arrives in stage 3.</p>
      <p>
        API status: <strong className={`status status-${apiStatus}`}>{apiStatus}</strong>
      </p>
    </main>
  )
}

export default App
