import { useState } from "react";
import RegisterForm from "../components/common/RegisterForm";
import AuthBrand, { AuthLogo } from "../components/common/AuthBrand";

const DEFAULT_COPY = {
    title: "Create Account",
    subtitle: "Start with a focused workspace designed for clarity.",
};

function RegisterPage() {
    const [panelCopy, setPanelCopy] = useState(DEFAULT_COPY);

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
                    <h2>{panelCopy.title}</h2>
                    <p>{panelCopy.subtitle}</p>
                    <RegisterForm onStepChange={setPanelCopy} />
                </div>
            </section>
        </div>
    );
}

export default RegisterPage;
