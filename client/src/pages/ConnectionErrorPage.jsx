import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "../services/authService";
import "../components/styles/ConnectionErrorPage.css";

function ConnectionErrorPage() {
  const navigate = useNavigate();
  const auth = isAuthenticated();

  useEffect(() => {
    const handleOnline = () => {
      navigate(auth ? "/main-page/dashboard" : "/login", { replace: true });
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [auth, navigate]);

  const handleGoHome = () => {
    if (auth) {
      navigate("/main-page/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  const handleRetry = () => {
    if (navigator.onLine) {
      navigate(auth ? "/main-page/dashboard" : "/login", { replace: true });
      return;
    }

    const handleRestore = () => {
      navigate(auth ? "/main-page/dashboard" : "/login", { replace: true });
    };

    window.addEventListener("online", handleRestore, { once: true });
  };

  return (
    <section className="conn-page">
      <div className="conn-container">

        {/* Custom SVG Illustration */}
        <div className="conn-illustration" aria-hidden="true">
          <svg
            viewBox="0 0 320 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="conn-svg"
          >
            <defs>
              <linearGradient id="connDevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0f2f5" />
                <stop offset="100%" stopColor="#e4e7ec" />
              </linearGradient>
              <linearGradient id="connCableGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#cbd0d9" />
                <stop offset="100%" stopColor="#b0b7c3" />
              </linearGradient>
            </defs>

            {/* Router body */}
            <rect x="90" y="52" width="140" height="80" rx="12" fill="#ffffff" stroke="#e2e5eb" strokeWidth="1.2" />
            <rect x="90" y="52" width="140" height="80" rx="12" fill="url(#connDevGrad)" fillOpacity="0.6" />

            {/* Router top bar */}
            <rect x="90" y="52" width="140" height="22" rx="12" fill="#eceef2" />
            <rect x="90" y="63" width="140" height="11" fill="#eceef2" />

            {/* Router label */}
            <text x="160" y="67" textAnchor="middle" fill="#b0b7c3" fontSize="8" fontWeight="500" fontFamily="monospace" letterSpacing="1">ROUTER</text>

            {/* Status LEDs */}
            <circle cx="108" cy="88" r="4" fill="#e2e5eb" />
            <circle cx="122" cy="88" r="4" fill="#e2e5eb" />
            <circle className="conn-led" cx="136" cy="88" r="4" fill="#f59e42" />

            {/* Port slots */}
            <rect x="108" y="100" width="14" height="8" rx="2" fill="#dde0e7" />
            <rect x="128" y="100" width="14" height="8" rx="2" fill="#dde0e7" />
            <rect x="148" y="100" width="14" height="8" rx="2" fill="#dde0e7" />
            <rect x="168" y="100" width="14" height="8" rx="2" fill="#dde0e7" />

            {/* Antennas */}
            <line x1="108" y1="52" x2="108" y2="36" stroke="#d0d4dc" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="212" y1="52" x2="212" y2="36" stroke="#d0d4dc" strokeWidth="2.5" strokeLinecap="round" />

            {/* Signal rings */}
            <circle className="conn-ring conn-ring--1" cx="160" cy="44" r="12" fill="none" stroke="#1d9e75" strokeWidth="1.2" />
            <circle className="conn-ring conn-ring--2" cx="160" cy="44" r="12" fill="none" stroke="#1d9e75" strokeWidth="1" />
            <circle className="conn-ring conn-ring--3" cx="160" cy="44" r="12" fill="none" stroke="#1d9e75" strokeWidth="0.8" />

            {/* Left dangling cable & plug */}
            <g className="conn-plug conn-plug--left">
              <path className="conn-cable conn-cable--left" d="M120 132 Q108 148 96 162 Q84 175 78 188" stroke="url(#connCableGrad)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <rect x="68" y="186" width="20" height="10" rx="3" fill="#c8cdd8" stroke="#b8bdc8" strokeWidth="1" />
              <rect x="73" y="196" width="4" height="6" rx="1" fill="#b8bdc8" />
              <rect x="81" y="196" width="4" height="6" rx="1" fill="#b8bdc8" />
            </g>

            {/* Right dangling cable & plug */}
            <g className="conn-plug conn-plug--right">
              <path className="conn-cable conn-cable--right" d="M200 132 Q212 148 224 162 Q236 175 242 188" stroke="url(#connCableGrad)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              <rect x="232" y="186" width="20" height="10" rx="3" fill="#c8cdd8" stroke="#b8bdc8" strokeWidth="1" />
              <rect x="237" y="196" width="4" height="6" rx="1" fill="#b8bdc8" />
              <rect x="245" y="196" width="4" height="6" rx="1" fill="#b8bdc8" />
            </g>

            {/* Broken link icon */}
            <path d="M144 170 L150 164 Q155 158 162 160 L166 161" stroke="#d0d4dc" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M176 170 L170 176 Q165 182 158 180 L154 179" stroke="#d0d4dc" strokeWidth="2" strokeLinecap="round" fill="none" />
            <line x1="158" y1="163" x2="162" y2="177" stroke="#e8a87c" strokeWidth="2" strokeLinecap="round" />

            {/* Lost packet dots — left */}
            <circle className="conn-dot conn-dot--1" cx="56" cy="120" r="4" fill="#1d9e75" />
            <circle className="conn-dot conn-dot--2" cx="42" cy="138" r="3" fill="#1d9e75" />
            <circle className="conn-dot conn-dot--3" cx="62" cy="152" r="2.5" fill="#0f6e56" />

            {/* Lost packet dots — right */}
            <circle className="conn-dot conn-dot--1" cx="264" cy="120" r="4" fill="#1d9e75" />
            <circle className="conn-dot conn-dot--2" cx="278" cy="138" r="3" fill="#1d9e75" />
            <circle className="conn-dot conn-dot--3" cx="258" cy="152" r="2.5" fill="#0f6e56" />
          </svg>
        </div>

        <div className="conn-content">
          <p className="conn-eyebrow">No Connection</p>
          <h1 className="conn-title">You're offline.</h1>
          <p className="conn-message">
            We can't reach the internet right now. Check your connection and try again.
          </p>
        </div>

        <ul className="conn-tips" aria-label="Troubleshooting tips">
          <li className="conn-tip">
            <span className="conn-tip-dot" aria-hidden="true" />
            Check your Wi-Fi or ethernet cable
          </li>
          <li className="conn-tip">
            <span className="conn-tip-dot" aria-hidden="true" />
            Try restarting your router or modem
          </li>
          <li className="conn-tip">
            <span className="conn-tip-dot" aria-hidden="true" />
            Make sure airplane mode is off
          </li>
        </ul>

        <div className="conn-actions">
          <button className="btn btn-primary" onClick={handleRetry}>
            Try Again
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 4a8 8 0 0 0-7.18 4.45.75.75 0 1 0 1.34.67A6.5 6.5 0 1 1 12 18.5c-2.04 0-3.93-1-5.1-2.6H8a.75.75 0 0 0 0-1.5H4.5a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-1.74A8 8 0 1 0 12 4Z" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

      </div>
    </section>
  );
}

export default ConnectionErrorPage;