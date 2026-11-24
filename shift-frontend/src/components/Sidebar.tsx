import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, IconButton, Box } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WidgetsIcon from "@mui/icons-material/Widgets";
import CloseIcon from "@mui/icons-material/Close";

const drawerWidth = 240;

type SidebarProps = {
    activePage: "master" | "dashboard";
    onPageChange: (page: "master" | "dashboard") => void;
    open: boolean;
    onClose: () => void;
};

function Sidebar({ activePage, onPageChange, open, onClose }: SidebarProps) {
    return (
        <Drawer
            anchor="left"
            variant="temporary"
            open={open}
            onClose={onClose}
            ModalProps={{ keepMounted: true }}
            sx={{
                "& .MuiDrawer-paper": {
                    width: drawerWidth,
                    boxSizing: "border-box",
                    backgroundColor: "#000",
                    color: "#fff",
                    border: 0
                }
            }}
        >
            <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
                <IconButton onClick={onClose} sx={{ color: "#fff" }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <List className="sidebar-list">
                <ListItemButton
                    selected={activePage === "dashboard"}
                    className="sidebar-dashboard-button"
                    onClick={() => {
                        onPageChange("dashboard");
                        onClose();
                    }}
                >
                    <ListItemIcon className="sidebar-icon">
                        <DashboardIcon />
                    </ListItemIcon>
                    <ListItemText primary="Dashboard" className="sidebar-text" />
                </ListItemButton>

                <ListItemButton
                    selected={activePage === "master"}
                    className="sidebar-dashboard-button"
                    onClick={() => {
                        onPageChange("master");
                        onClose();
                    }}
                >
                    <ListItemIcon className="sidebar-icon">
                        <WidgetsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Master" className="sidebar-text" />
                </ListItemButton>
            </List>
        </Drawer>
    );
}

export default Sidebar;