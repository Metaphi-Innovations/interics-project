import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { FoundationThemeProvider } from './design-system/ThemeContext'
import App from './App.tsx'

/**
 * MSW runs in dev and production so deploys (e.g. Vercel) use mock APIs without env flags or a backend.
 *
 * - Axios uses `VITE_API_URL` or defaults to `/api` (see `src/api/client.ts`). If MSW is not running,
 *   unhandled `/api/*` requests may hit the static host and return HTML — log warnings in dev below.
 * - Ensure `public/mockServiceWorker.js` is registered (Application → Service Workers). If startup
 *   fails, the catch handler warns and API calls are not mocked.
 */
async function enableMocking() {
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: import.meta.env.DEV ? 'warn' : 'bypass',
      quiet: !import.meta.env.DEV,
      serviceWorker: { url: '/mockServiceWorker.js' },
      waitUntilReady: true,
    })
  } catch (e) {
    console.warn('[MSW] Service worker failed to start; API calls may 404 until refresh.', e)
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
