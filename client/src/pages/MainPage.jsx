import { Outlet } from "react-router-dom";
import SideBar from "../components/common/SideBar";
import Breadcrumbs from "../components/common/Breadcrumbs";

function MainPage() {
    return (
        <div className="app-layout">
            <SideBar />
            <main className="content">
                <div className="content-inner">
                    <Breadcrumbs />
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default MainPage;