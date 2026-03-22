
import "../styles/SideBar.css";

export default function SideBar () {
    return (
        <div className="sidebar">
            <div className="sidebar-top">
                <h2 className="logo">TaskFlow</h2>
            </div>

            {/* main navigation */}
            <div className="sidebar-section">
                <button className="nav-btn"> Dashboard</button>
                <button className="nav-btn"> Projects</button>
                <button className="nav-btn"> My Tasks</button>
                <button className="nav-btn"> Settings</button>
            </div>

            {/* bottom */}
            <div className="sidebar-bottom">
                <div className="user">
                <div className="avatar">J</div>
                <span>jayvee@email.com</span>
                </div>
                <button className="logout">Logout</button>
            </div>
        </div>
    );
}

