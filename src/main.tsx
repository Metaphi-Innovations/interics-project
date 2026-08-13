import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { FoundationThemeProvider } from './design-system/ThemeContext'
import App from './App.tsx'
import { API_BASE_URL } from './api/config'

/**
 * MSW still mocks modules that are not backend-integrated yet.
 * Customers, Vendors, and Project CRUD call the real backend via `API_BASE_URL`.
 * Unhandled requests bypass MSW so they reach the backend directly.
 */
async function enableMocking() {
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: !import.meta.env.DEV,
      serviceWorker: { url: '/mockServiceWorker.js' },
      waitUntilReady: true,
    })
    if (import.meta.env.DEV) {
      console.info(`[API] base URL: ${API_BASE_URL}`)
    }
  } catch (e) {
    console.warn('[MSW] Service worker failed to start; API calls may fail until refresh.', e)
  }
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
