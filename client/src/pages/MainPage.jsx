import { Outlet } from "react-router-dom";
import SideBar from "../components/common/SideBar";

function MainPage() {
    return (
        <div className="app-layout">
            <SideBar />
            <main className="content">
                <div className="content-inner">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}

export default MainPage;