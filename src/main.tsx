import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import SimulationView from './SimulationView.tsx'
import SimulationLauncher from './SimulationLauncher.tsx'

const params = new URLSearchParams(window.location.search)
const view = params.has('simulate') ? 'simulate'
           : params.has('launch')   ? 'launch'
           : 'app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {view === 'simulate' ? <SimulationView />
   : view === 'launch'   ? <SimulationLauncher />
   : <App />}
  </StrictMode>,
)
