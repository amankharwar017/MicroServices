import { AppBar, Toolbar, Typography, Box, IconButton, Menu, Divider, Button } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PersonIcon from "@mui/icons-material/Person";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import Notification from "../app/activity/notification";
import MenuIcon from "@mui/icons-material/Menu";

type HeaderProps = {
    username: string;
    role: string;
    anchorEl: HTMLElement | null;
    onProfileClick: (event: React.MouseEvent<HTMLElement>) => void;
    onProfileClose: () => void;
    onLogout: () => void;
    onMenuClick: () => void;
};

function Header({ username, role, anchorEl, onProfileClick, onProfileClose, onLogout, onMenuClick }: HeaderProps) {
    const open = Boolean(anchorEl);

    return (
        <AppBar position="fixed" elevation={0} className="dashboard-header">
            <Toolbar className="dashboard-header-toolbar">
                <IconButton onClick={onMenuClick} aria-label="Open menu" sx={{ color: "#334155", mr: 1 }}>
                    <MenuIcon />
                </IconButton>
                <Box component="img" src="/dreamsol-logo.jpg" alt="DreamSol TeleSolutions" sx={{ height: 44, width: "auto", maxWidth: 220, objectFit: "contain" }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: "auto", color: "#334155" }}>
                    <Notification />
                    <IconButton color="inherit" aria-label="User profile" onClick={onProfileClick}>
                        <AccountCircleIcon />
                    </IconButton>
                    <Menu
                        anchorEl={anchorEl}
                        open={open}
                        onClose={onProfileClose}
                        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                        transformOrigin={{ vertical: "top", horizontal: "right" }}
                        slotProps={{ paper: { sx: { width: 320, maxWidth: "calc(100vw - 24px)", mt: 1, p: 1.25, borderRadius: 3, boxShadow: "0 8px 28px rgba(15,23,42,0.18)" } } }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 1.5, mb: 1, borderRadius: 2, bgcolor: "#eff6ff" }}>
                            <IconButton aria-label="Back" onClick={onProfileClose} size="small" sx={{ color: "#1d4ed8" }}>
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#172554", flex: 1, textAlign: "center", mr: 4 }}>
                                My Profile
                            </Typography>
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}>
                            <Box sx={{ width: 68, height: 68, borderRadius: "50%", bgcolor: "#1976d2", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                                <AccountCircleIcon sx={{ fontSize: 48 }} />
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: "#172033" }}>
                                {username || "User"}
                            </Typography>
                            <Box sx={{ mt: 0.75, px: 1.5, py: 0.4, borderRadius: 5, bgcolor: "#dbeafe", color: "#1d4ed8", fontSize: 12, fontWeight: 700 }}>
                                {role}
                            </Box>
                        </Box>
                        <Divider sx={{ mb: 1 }} />
                        <Box sx={{ px: 1.5, py: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <PersonIcon sx={{ color: "#64748b" }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary">Username</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{username || "User"}</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ px: 1.5, py: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}>
                            <ShieldOutlinedIcon sx={{ color: "#64748b" }} />
                            <Box>
                                <Typography variant="caption" color="text.secondary">Role</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{role}</Typography>
                            </Box>
                        </Box>
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<LogoutIcon />}
                            onClick={onLogout}
                            sx={{ mt: 1.5, py: 1.2, borderRadius: 2, bgcolor: "#e5394f", textTransform: "none", fontSize: 15, fontWeight: 700, boxShadow: "none", "&:hover": { bgcolor: "#c62828", boxShadow: "none" } }}
                        >
                            Logout
                        </Button>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default Header;