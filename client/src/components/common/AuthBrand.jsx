export function AuthLogo({ className = "" }) {
  const classes = ["auth-logo-row", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div className="auth-logo-mark" aria-hidden="true">Miru</div>
      <div className="auth-logo-copy">
        <span className="auth-logo-name">Miruban</span>
        <span className="auth-logo-subtitle">Project command center</span>
      </div>
    </div>
  );
}

function AuthBrand({ title, description, items = [] }) {
  return (
    <aside className="auth-brand">
      <div className="auth-brand-header">
        <AuthLogo />

        <div className="auth-brand-message">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="auth-brand-list">
          {items.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
    </aside>
  );
}

export default AuthBrand;
