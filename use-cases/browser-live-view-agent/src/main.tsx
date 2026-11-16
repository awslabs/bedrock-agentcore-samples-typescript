import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html has no #root element')

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
