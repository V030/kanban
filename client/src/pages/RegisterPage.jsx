import RegisterForm from "../components/common/RegisterForm";

function RegisterPage() {
    return (
        <div className="auth-page">
            <section className="auth-panel">
                <aside className="auth-brand">
                    <div>
                        <h1>Build aligned teams and clean boards.</h1>
                        <p>
                            Create your account to organize projects, map priorities, and keep collaboration moving.
                        </p>
                    </div>
                    <div className="auth-brand-list">
                        <span>Quick project setup</span>
                        <span>Role-aware board permissions</span>
                        <span>Simple teammate coordination</span>
                    </div>
                </aside>

                <div className="auth-content">
                    <h2>Create Account</h2>
                    <p>Start with a focused workspace designed for clarity.</p>
                    <RegisterForm />
                </div>
            </section>
        </div>
    );
}

export default RegisterPage;