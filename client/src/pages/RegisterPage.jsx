import RegisterForm from "../components/common/RegisterForm";
import AuthBrand, { AuthLogo } from "../components/common/AuthBrand";

function RegisterPage() {
    return (
        <div className="auth-page">
            <section className="auth-panel">
                <AuthBrand
                    title="Build aligned teams and clean boards."
                    description="Create your account to organize projects, map priorities, and keep collaboration moving."
                    items={[
                        "Quick project setup",
                        "Role-aware board permissions",
                        "Simple teammate coordination",
                    ]}
                />

                <div className="auth-content">
                    <AuthLogo className="auth-mobile-logo-row" />
                    <h2>Create Account</h2>
                    <p>Start with a focused workspace designed for clarity.</p>
                    <RegisterForm />
                </div>
            </section>
        </div>
    );
}

export default RegisterPage;
