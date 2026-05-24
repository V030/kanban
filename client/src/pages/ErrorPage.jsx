import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "../services/authService";
import { ErrorIllustration } from "../components/common/AppIcons";
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

        <div className="error-illustration" aria-hidden="true">
          <ErrorIllustration className="error-svg" />
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