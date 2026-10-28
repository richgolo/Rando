import Icon from '../components/Icon'

// Welcome panel + form layout shared by the sign-in and sign-up pages.
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth">
      <section className="auth-hero">
        <h1>Get your harvest to market on time.</h1>
        <p>Farmers post a load. Local transporters send their price. Both follow the delivery from farm to market.</p>
        <ul className="auth-points">
          <li><Icon name="truck" size={18} /> Compare offers from transporters in your area</li>
          <li><Icon name="shield" size={18} /> Phone numbers stay private until an offer is accepted</li>
          <li><Icon name="check" size={18} /> Track pickup and delivery step by step</li>
        </ul>
      </section>
      <section className="auth-card">
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </section>
    </div>
  )
}
