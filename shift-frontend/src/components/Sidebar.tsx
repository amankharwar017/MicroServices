import { Drawer, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import WidgetsIcon from "@mui/icons-material/Widgets";

const drawerWidth = 240;

type SidebarProps = {
  activePage: "master" | "dashboard";
  onPageChange: (page: "master" | "dashboard") => void;
};

function Sidebar({ activePage, onPageChange }: SidebarProps) {
  return (
    <Drawer variant="permanent" className="dashboard-sidebar" sx={{ width: drawerWidth, flexShrink: 0 }}>
      <List className="sidebar-list">
        <ListItemButton selected={activePage === "dashboard"} className="sidebar-dashboard-button" onClick={() => onPageChange("master")}>
          <ListItemIcon className="sidebar-icon">
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" className="sidebar-text" />
        </ListItemButton>
        <ListItemButton selected={activePage === "master"} className="sidebar-dashboard-button" onClick={() => onPageChange("dashboard")}>
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