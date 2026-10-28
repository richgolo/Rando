import { Link } from 'react-router-dom'
import { PILOT_AREAS } from './lib/constants'
import Icon from './components/Icon'

const STEPS = [
  { title: 'Post your load', text: 'Say what you are sending, how much, from where to where, and on which day.' },
  { title: 'Compare prices', text: 'Transporters nearby send their price in cedis. You pick the offer that suits you.' },
  { title: 'Follow the delivery', text: 'See when your load is picked up and delivered, and confirm when it arrives.' },
]

// Front page for people who are not signed in yet.
export default function Landing() {
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">Now in {PILOT_AREAS.join(', ')}</p>
          <h1>Get your harvest to market on time.</h1>
          <p className="landing-lede">
            FarmHaul connects farmers with local transporters. Post a load, get prices from drivers nearby, and follow it all the way to market.
          </p>
          <div className="landing-ctas">
            <Link className="btn btn-primary" to="/signup?role=farmer">I’m a farmer</Link>
            <Link className="btn" to="/signup?role=transporter">I’m a transporter</Link>
          </div>
          <p className="muted small">Already have an account? <Link to="/signin">Sign in</Link></p>
        </div>
        <div className="landing-photo" role="img" aria-label="Fresh produce at a market" />
      </section>

      <section>
        <h2>How it works</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card step">
              <span className="step-num">{i + 1}</span>
              <p className="step-title">{s.title}</p>
              <p className="muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="audiences">
        <div className="card audience">
          <span className="load-icon"><Icon name="package" size={20} /></span>
          <h2>For farmers</h2>
          <ul>
            <li><Icon name="check" size={16} /> Free to post a load</li>
            <li><Icon name="check" size={16} /> Compare several prices before you choose</li>
            <li><Icon name="check" size={16} /> Your phone number stays private until you accept</li>
          </ul>
          <Link className="btn btn-primary" to="/signup?role=farmer">Post a load</Link>
        </div>
        <div className="card audience">
          <span className="vehicle-icon"><Icon name="truck" size={22} /></span>
          <h2>For transporters</h2>
          <ul>
            <li><Icon name="check" size={16} /> Find loads in your area every day</li>
            <li><Icon name="check" size={16} /> Set your own price for each trip</li>
            <li><Icon name="check" size={16} /> Fill empty space on trips you already make</li>
          </ul>
          <Link className="btn" to="/signup?role=transporter">Find loads</Link>
        </div>
      </section>

      <p className="landing-foot muted small">Built for the Codetrain 6-Week Innovation Challenge.</p>
    </div>
  )
}
