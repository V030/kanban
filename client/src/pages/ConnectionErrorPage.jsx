import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "../services/authService";
import { ConnectionIllustration, RefreshIcon } from "../components/common/AppIcons";
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

        <div className="conn-illustration" aria-hidden="true">
          <ConnectionIllustration className="conn-svg" />
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
            <RefreshIcon size={14} />
          </button>
        </div>

      </div>
    </section>
  );
}

export default ConnectionErrorPage;