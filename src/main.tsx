import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { FoundationThemeProvider } from './design-system/ThemeContext'
import App from './App.tsx'

/** MSW runs in dev and production so deploys (e.g. Vercel) use mock APIs without env flags or a backend. */
async function enableMocking() {
  try {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      onUnhandledRequest: 'bypass',
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
