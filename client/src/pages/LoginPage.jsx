import LoginForm from "../components/common/LoginForm";

function LoginPage() {
    return (
        <div className="auth-page">
            <section className="auth-panel">
                <aside className="auth-brand">
                    <div>
                        <h1>Plan better workdays with TaskFlow.</h1>
                        <p>
                            Keep projects clear, boards tidy, and team momentum visible from one focused workspace.
                        </p>
                    </div>
                    <div className="auth-brand-list">
                        <span>Structured project views</span>
                        <span>Transparent task ownership</span>
                        <span>Fast access to teams and settings</span>
                    </div>
                </aside>

                <div className="auth-content">
                    <h2>Sign In</h2>
                    <p>Welcome back. Continue where your team left off.</p>
                    <LoginForm />
                </div>
            </section>
        </div>
    );
}

export default LoginPage;