import Link from "next/link";
import { HeroAuthButtons } from "../components/HeroAuthButtons";
import { HeroBarrierWord } from "@/components/ui/hero-barrier-word";
import BackgroundPaperShaders from "@/components/ui/background-paper-shaders";
import { DekaLogo } from "@/components/ui/deka-logo";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <BackgroundPaperShaders className="page-shader-layer" />
      <header className="landing-topbar glass-nav">
        <Link className="brand brand-chromic" href="/">
          <DekaLogo className="deka-logo deka-logo-nav" />
        </Link>
        <nav className="landing-nav" aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#demo">Demo</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-nav-actions">
          <Link className="nav-link nav-link-glass" href="/join">
            Join room
          </Link>
          <Link className="button button-primary" href="/upgrade">
            Request access
          </Link>
        </div>
      </header>

      <section className="hero hero-chromic">
        <div className="hero-copy">
          <div className="eyebrow eyebrow-chromic">Premium real-time AI voice translation</div>
          <h1>
            Conversations
            <br />
            without language <HeroBarrierWord />
          </h1>
          <p className="lead">Speak naturally across languages.</p>
          <HeroAuthButtons />
          <div className="hero-proof">
            <span className="status-pill status-live">LIVE CONVERSATION UX</span>
            <span>For travel, work, and family.</span>
          </div>
        </div>

        <div className="hero-demo-wrap">
          <div className="demo-shell chromic-card">
            <div className="demo-header">
              <div>
                <p className="demo-label">Product experience</p>
                <h2>Live translation UI</h2>
              </div>
              <span className="status-pill status-live">EARLY ACCESS</span>
            </div>
            <div className="demo-stage">
              <div className="demo-translation-flow">
                <article className="message-bubble incoming">
                  <span className="message-chip">Speaker A</span>
                  <strong>Hello, can you help me find the train?</strong>
                  <p>Detected in English. Translated instantly for the listener.</p>
                </article>
                <article className="demo-translation-bridge">
                  <span className="demo-bridge-label">Live translation</span>
                  <strong>English → Spanish</strong>
                  <p>Low-latency voice output with natural pacing.</p>
                </article>
                <article className="message-bubble outgoing">
                  <span className="message-chip">Speaker B</span>
                  <strong>Yes, platform three. I can show you.</strong>
                  <p>Response delivered back in English in real time.</p>
                </article>
              </div>
              <div className="demo-insights">
                <div className="mini-shell">
                  <span className="metric-label">Latency</span>
                  <p className="mini-shell-line">Sub-second feel</p>
                  <p className="muted-line">Built to keep conversation moving.</p>
                </div>
                <div className="mini-shell">
                  <span className="metric-label">Language pair</span>
                  <p className="mini-shell-line">EN / ES</p>
                  <p className="muted-line">Swap languages without friction.</p>
                </div>
              </div>
            </div>
            <div className="demo-metrics">
              <div className="metric-card">
                <span className="metric-label">Mode</span>
                <strong>Simple</strong>
              </div>
              <div className="metric-card">
                <span className="metric-label">Experience</span>
                <strong>Speak naturally. Hear instantly.</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section split-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow eyebrow-chromic">How it works</p>
          <h2>Speak. Translate. Respond.</h2>
        </div>
        <div className="timeline-grid">
          <article className="chromic-card timeline-card">
            <span className="timeline-step">01</span>
            <h3>Speak</h3>
            <p>Just talk.</p>
          </article>
          <article className="chromic-card timeline-card">
            <span className="timeline-step">02</span>
            <h3>Translate</h3>
            <p>Instant.</p>
          </article>
          <article className="chromic-card timeline-card">
            <span className="timeline-step">03</span>
            <h3>Respond</h3>
            <p>Keep flow.</p>
          </article>
        </div>
      </section>

      <section className="landing-section demo-placeholder-section" id="demo">
        <div className="section-heading">
          <p className="eyebrow eyebrow-chromic">Demo</p>
          <h2>Demo placeholder</h2>
        </div>
        <div className="demo-placeholder chromic-card">
          <div className="demo-placeholder-label">Demo placeholder</div>
          <p>Live walkthrough coming soon.</p>
        </div>
      </section>

      <section className="landing-section">
        <div className="cta-banner chromic-card">
          <div>
            <p className="eyebrow eyebrow-chromic">Final CTA</p>
            <h2>Try Deka first.</h2>
            <p className="lead">Early access.</p>
          </div>
          <form className="cta-form">
            <label className="sr-only" htmlFor="email">
              Email address
            </label>
            <input id="email" name="email" placeholder="you@company.com" type="email" />
            <button className="button button-primary" type="submit">
              Request access
            </button>
          </form>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <span className="brand brand-chromic">
            <DekaLogo className="deka-logo deka-logo-footer" />
          </span>
          <p>Real-time AI voice translation.</p>
        </div>
        <div className="footer-links">
          <Link href="/create">Create room</Link>
          <Link href="/join">Join room</Link>
          <a href="#faq">FAQ</a>
        </div>
      </footer>
    </main>
  );
}
