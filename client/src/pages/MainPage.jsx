import { Outlet } from "react-router-dom";
import SideBar from "../components/common/SideBar";

function MainPage() {
    return (
        <div className="app-layout">
            <SideBar />
            <main className="content">
                <Outlet />  {/* This renders Dashboard/Projects/Profile based on route */}
            </main>
        </div>
    );
}

export default MainPage;