import Link from "next/link";

const freeFeatures = [
  "Basic voice translation",
  "Limited daily usage",
  "Standard translation speed",
  "Community support"
];

const plusFeatures = [
  "Higher translation limits",
  "Faster response latency",
  "Priority language models",
  "Conversation history"
];

const businessFeatures = [
  "Team workspaces",
  "Admin controls and seats",
  "Advanced privacy controls",
  "Priority support"
];

export default function UpgradePage() {
  return (
    <main className="upgrade-shell">
      <div className="upgrade-inner">
        <div className="upgrade-top">
          <h1>Upgrade your plan</h1>
          <p>Choose the right Deka plan for your conversations.</p>
        </div>

        <section className="upgrade-grid">
          <article className="upgrade-card">
            <div className="upgrade-card-head">
              <h2>Free</h2>
              <p className="upgrade-price">
                <span>$0</span> / month
              </p>
              <p className="upgrade-subtitle">Start for individuals</p>
            </div>
            <button className="upgrade-btn upgrade-btn-muted" type="button">
              Current plan
            </button>
            <ul className="upgrade-list">
              {freeFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>

          <article className="upgrade-card">
            <div className="upgrade-card-head">
              <h2>Plus</h2>
              <p className="upgrade-price">
                <span>$12</span> / month
              </p>
              <p className="upgrade-subtitle">For power users</p>
            </div>
            <button className="upgrade-btn" type="button">
              Upgrade to Plus
            </button>
            <ul className="upgrade-list">
              {plusFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>

          <article className="upgrade-card upgrade-card-featured">
            <div className="upgrade-card-head">
              <div className="upgrade-title-row">
                <h2>Business</h2>
                <span className="upgrade-badge">Recommended</span>
              </div>
              <p className="upgrade-price">
                <span>$29</span> / seat / month
              </p>
              <p className="upgrade-subtitle">For teams and organizations</p>
            </div>
            <button className="upgrade-btn upgrade-btn-featured" type="button">
              Add Business workspace
            </button>
            <ul className="upgrade-list">
              {businessFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
        </section>

        <div className="upgrade-foot">
          <Link href="/">Back to home</Link>
        </div>
      </div>
    </main>
  );
}
