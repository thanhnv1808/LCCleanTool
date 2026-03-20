import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import TrayPopup from './pages/TrayPopup'
import './index.css'

const isTray = window.location.hash === '#tray'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isTray ? <TrayPopup /> : <App />}
  </React.StrictMode>,
)
