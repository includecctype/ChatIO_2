import './styles/CSS/main.css'

// import {Helmet} from 'react-helmet'

// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <>
    <App />
  </>
  // </StrictMode>,
)
