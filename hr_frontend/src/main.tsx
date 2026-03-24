import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { ConfirmProvider } from './hooks/useConfirm'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmProvider>
      <App />
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#fff',
            color: '#18181b', // zinc-900
            border: '1px solid #e4e4e7', // zinc-200
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            borderRadius: '0.75rem',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500
          },
        }}
      />
    </ConfirmProvider>
  </StrictMode>,
)
