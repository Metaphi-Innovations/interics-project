import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { FoundationThemeProvider } from './design-system/ThemeContext'
import App from './App.tsx'

/** MSW runs in dev and production so deploys (e.g. Vercel) use mock APIs without env flags or a backend. */
async function enableMocking() {
  const { worker } = await import('./mocks/browser')
  return worker.start({
    onUnhandledRequest: 'bypass',
    quiet: !import.meta.env.DEV,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <FoundationThemeProvider>
          <App />
        </FoundationThemeProvider>
      </Provider>
    </StrictMode>
  )
})
