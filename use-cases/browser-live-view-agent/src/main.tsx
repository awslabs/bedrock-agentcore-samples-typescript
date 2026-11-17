import ReactDOM from 'react-dom/client'
import { App } from './App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html has no #root element')

// No StrictMode: its double mount in development makes BrowserLiveView open a second stream, which the session refuses
ReactDOM.createRoot(rootElement).render(<App />)
