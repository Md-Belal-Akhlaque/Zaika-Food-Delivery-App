import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { Provider } from "react-redux";
import { store } from './redux/store.js'
import { Toaster } from 'sonner'
import GlobalDataProvider from './components/GlobalDataProvider.jsx'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Provider store={store}>
      <Toaster position="top-center" richColors closeButton />
      <GlobalDataProvider>
        <App />
      </GlobalDataProvider>
    </Provider>
  </BrowserRouter>
)
