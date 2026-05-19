import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "../services/authService";
import "../components/styles/ErrorPage.css";

function ErrorPage() {
  const navigate = useNavigate();
  const auth = isAuthenticated();

  const handleGoHome = () => {
    if (auth) {
      navigate("/main-page/dashboard", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  };

  return (
    <section className="error-page">
      <div className="error-container">

        {/* Custom SVG Illustration */}
        <div className="error-illustration" aria-hidden="true">
          <svg
            viewBox="0 0 380 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="error-svg"
          >
            <defs>
              <linearGradient id="scrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0f2f5" />
                <stop offset="100%" stopColor="#e8eaed" />
              </linearGradient>
              <linearGradient id="crGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1d9e75" />
                <stop offset="100%" stopColor="#0f6e56" />
              </linearGradient>
              <clipPath id="scrClip">
                <rect x="52" y="22" width="276" height="172" rx="10" />
              </clipPath>
            </defs>

            {/* Stand */}
            <rect x="172" y="198" width="36" height="14" rx="3" fill="#d8dce4" />
            <rect x="150" y="210" width="80" height="7" rx="3.5" fill="#cbd0d9" />

            {/* Monitor shell */}
            <rect x="44" y="14" width="292" height="190" rx="14" fill="#ffffff" stroke="#e2e5eb" strokeWidth="1.2" />

            {/* Screen */}
            <rect x="52" y="22" width="276" height="172" rx="10" fill="url(#scrGrad)" />

            {/* Subtle scanlines */}
            {[...Array(16)].map((_, i) => (
              <line
                key={i}
                x1="52" y1={34 + i * 10}
                x2="328" y2={34 + i * 10}
                stroke="#000"
                strokeOpacity="0.022"
                strokeWidth="1"
              />
            ))}

            {/* Glitch bars */}
            <rect className="error-glitch error-glitch--1" x="70" y="140" width="80" height="6" rx="2" fill="#1d9e75" fillOpacity="0.12" />
            <rect className="error-glitch error-glitch--2" x="220" y="58" width="58" height="6" rx="2" fill="#1d9e75" fillOpacity="0.10" />

            {/* 404 ghost text */}
            <text x="190" y="118" textAnchor="middle" fill="#d0d3da" fontSize="70" fontWeight="800" fontFamily="monospace" letterSpacing="-3">404</text>

            {/* Crack glow */}
            <path d="M190 30 L178 82 L198 100 L177 138 L190 194" stroke="#1d9e75" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.07" />

            {/* Main crack */}
            <path className="error-crack error-crack--main" d="M190 30 L178 82 L198 100 L177 138 L190 194" stroke="url(#crGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            {/* Branch left */}
            <path className="error-crack error-crack--left" d="M178 82 L155 104 L140 114" stroke="url(#crGrad)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.65" />
            {/* Branch right */}
            <path className="error-crack error-crack--right" d="M198 100 L226 112 L248 108" stroke="url(#crGrad)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.65" />
            {/* Branch lower */}
            <path className="error-crack error-crack--lower" d="M177 138 L158 152 L146 163" stroke="url(#crGrad)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeOpacity="0.45" />

            {/* Floating shards */}
            <g className="error-shard error-shard--1">
              <polygon points="24,72 36,65 32,82" fill="#1d9e75" fillOpacity="0.35" />
            </g>
            <g className="error-shard error-shard--2">
              <polygon points="344,54 357,48 353,66" fill="#1d9e75" fillOpacity="0.25" />
            </g>
            <g className="error-shard error-shard--3">
              <polygon points="16,152 27,146 23,162" fill="#0f6e56" fillOpacity="0.30" />
            </g>

            {/* Power LED */}
            <circle className="error-led" cx="190" cy="208" r="2.5" fill="#1d9e75" />
          </svg>
        </div>

        <div className="error-content">
          <p className="error-eyebrow">Error 404</p>
          <h1 className="error-title">Whoops! You hit a snag.</h1>
          <p className="error-message">
            We know there is a problem and we are working on it. Thank You!
          </p>

          <div className="error-actions">
            <button className="btn btn-primary" onClick={handleGoHome}>
              I Understand :(
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}

export default ErrorPage;