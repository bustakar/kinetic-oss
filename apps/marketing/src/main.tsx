import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

declare const __EXERCISE_COUNT__: number
declare const __MUSCLE_COUNT__: number

const githubUrl = 'https://github.com/bustakar/kinetic-oss'
const appUrl = import.meta.env.VITE_APP_URL ?? 'https://kinetic.rocks/exercises'

function App() {
  return (
    <div className="page">
      <main>
        <section className="hero shell">
          <div className="topbar">
            <a className="brand" href="/" aria-label="Kinetic home">
              <img src="/kinetic-icon.svg" alt="" />
              Kinetic
            </a>
            <a className="primary-action" href={appUrl}>Go to app</a>
          </div>
          <h1>Building blocks<br />for any workout</h1>
          <p className="intro">
            Open-source exercise data and training primitives for apps and agents
          </p>
          <div className="hero-actions">
            <a className="primary-action" href={appUrl}>Go to app</a>
            <a className="secondary-action" href={githubUrl}>View on GitHub <span aria-hidden="true">↗</span></a>
          </div>
        </section>

        <section className="catalog shell">
          <h2 className="section-title">Kinetic’s Catalog</h2>
          <div className="catalog-grid">
            <div className="catalog-card">
              <h2>{__EXERCISE_COUNT__} exercises</h2>
              <p>Gym, calisthenics, cardio and more</p>
            </div>
            <div className="catalog-card">
              <h2>{__MUSCLE_COUNT__} muscles</h2>
              <p>Primary and secondary muscle roles</p>
            </div>
          </div>
        </section>

        <section className="clients shell" aria-label="Kinetic clients">
          <h2 className="section-title">Who is Kinetic for?</h2>
          <div className="client-list">
            <article>
              <h3>For people</h3>
              <p>Build and manage your exercise library in the browser</p>
            </article>
            <article>
              <h3>For agents</h3>
              <p>Connect training data to Claude, ChatGPT, Codex, and other MCP clients</p>
            </article>
          </div>
        </section>
      </main>

      <footer className="footer shell">
        <span>© {new Date().getFullYear()} Karel Busta</span>
        <a href={githubUrl}>GitHub</a>
      </footer>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
