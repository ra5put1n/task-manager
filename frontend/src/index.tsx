import { createRoot } from 'react-dom/client'
import App from '../App'
import './jank-mode'

const root = createRoot(document.getElementById('root') as Element)
root.render(<App />)
