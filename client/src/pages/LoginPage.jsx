import LoginForm from "../components/common/LoginForm";
import AuthBrand, { AuthLogo } from "../components/common/AuthBrand";

function LoginPage() {
    return (
        <div className="auth-page">
            <section className="auth-panel">
                <AuthBrand
                    title="Plan better workdays with Miruban."
                    description="Keep projects clear, boards tidy, and team momentum visible from one focused workspace."
                    items={[
                        "Structured project views",
                        "Transparent task ownership",
                        "Fast access to teams and settings",
                    ]}
                />

                <div className="auth-content">
                    <AuthLogo className="auth-mobile-logo-row" />
                    <h2>Sign In</h2>
                    <p>Welcome back. Continue where your team left off.</p>
                    <LoginForm />
                </div>
            </section>
        </div>
    );
}

export default LoginPage;
