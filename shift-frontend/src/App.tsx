import { useState } from "react";
import Activityboard from "./app/activity/shift-activity-board.";
import ShiftLogin from "./app/activity/shift-login";

function App() {
    const [activePage, setActivePage] = useState<"dashboard" | "master">("dashboard");

    const isFreshStart = !sessionStorage.getItem("appStarted");

    if (isFreshStart) {
        sessionStorage.setItem("appStarted", "true");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
    }

    const [token, setToken] = useState<string | null>(() =>
        localStorage.getItem("token")
    );

    const [role, setRole] = useState<string | null>(() =>
        localStorage.getItem("role")
    );

    const [username, setUsername] = useState<string | null>(() =>
        localStorage.getItem("username")
    );

    const handleLoginSuccess = (
        newToken: string,
        newRole: string,
        newUsername: string
    ) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem("role", newRole);
        localStorage.setItem("username", newUsername);

        setToken(newToken);
        setRole(newRole);
        setUsername(newUsername);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");

        setToken(null);
        setRole(null);
        setUsername(null);
    };

    if (!token || !role) {
        return <ShiftLogin onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <Activityboard
            activePage={activePage}
            onPageChange={setActivePage}
            username={username ?? ""}
            role={role}
            onLogout={handleLogout}
        />
    );
}

export default App;