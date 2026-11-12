import { useCallback, useEffect, useState } from "react";
import type { MouseEvent } from "react";
import { Box, IconButton, Badge, Popover, List, ListItem, ListItemButton, Divider, Button, CircularProgress, Tooltip, Typography, Dialog, DialogTitle, DialogContent } from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { getNotificationData, markNotificationAsRead, markAllNotificationsAsRead } from "../shift-api";
import type { ShiftNotification } from "../shift-api";

function Notification() {
    const [notifications, setNotifications] = useState<ShiftNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [loading, setLoading] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [markingId, setMarkingId] = useState<number | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [selectedNotification, setSelectedNotification] = useState<ShiftNotification | null>(null);
    const pageSize = 10;
    const open = Boolean(anchorEl);
    const isNotificationRead = (notification: ShiftNotification) => notification.isRead ?? notification.read ?? false;
    const fetchNotifications = useCallback(async (pageNumber: number = page) => {
        setLoading(true);
        try {
            const response = await getNotificationData(pageNumber, pageSize);
            setNotifications(response.notifications ?? []);
            setUnreadCount(response.unreadCount ?? 0);
            setTotalPages(response.totalPages ?? 0);
            setTotalElements(response.totalElements ?? 0);
            setPage(response.currentPage ?? pageNumber);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        const handleShiftNotificationUpdate = () => {
            void fetchNotifications(page);
        };
        window.addEventListener("shift-notification-update", handleShiftNotificationUpdate);
        return () => window.removeEventListener("shift-notification-update", handleShiftNotificationUpdate);
    }, [fetchNotifications, page]);

    useEffect(() => { if (open) void fetchNotifications(page);}, [open, fetchNotifications, page]);

    useEffect(() => {void fetchNotifications(0);}, []);

    const handleNotificationClick = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
    const handleMarkAsRead = async (notification: ShiftNotification) => {
        if (isNotificationRead(notification)) return;
        setMarkingId(notification.id);
        try {
            await markNotificationAsRead(notification.id);
            setNotifications(previous => previous.map(item => item.id === notification.id ? { ...item, isRead: true, read: true } : item));
            setUnreadCount(previous => Math.max(0, previous - 1));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        } finally {
            setMarkingId(null);
        }
    };
    const handleNotificationSelect = (notification: ShiftNotification) => {
        setSelectedNotification(notification);
        void handleMarkAsRead(notification);
    };
    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0) return;
        setMarkingAll(true);
        try {
            await markAllNotificationsAsRead();
            setNotifications(previous => previous.map(item => ({ ...item, isRead: true, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        } finally {
            setMarkingAll(false);
        }
    };
    const handlePageChange = (newPage: number) => {
        if (newPage < 0 || newPage >= totalPages || loading) return;
        setPage(newPage);
    };
    const formatDate = (date: string) => {
        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) return date;
        return parsedDate.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };
    return (
        <>
            <Tooltip title="Notifications">
                <IconButton color="inherit" aria-label="Notifications" onClick={handleNotificationClick}>
                    <Badge badgeContent={unreadCount} color="error" max={99}><NotificationsNoneIcon /></Badge>
                </IconButton>
            </Tooltip>
            <Popover open={open} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { width: { xs: 320, sm: 390 }, maxWidth: "calc(100vw - 24px)", maxHeight: 520, mt: 1, borderRadius: 2, boxShadow: "0 8px 30px rgba(15, 23, 42, 0.15)" } } }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1.25, gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
                        <IconButton size="small" aria-label="Back to page" title="Back" onClick={() => setAnchorEl(null)} sx={{ color: "#334155", ml: -0.5 }}>
                            <ChevronLeftIcon />
                        </IconButton>
                        <Box>
                            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Notifications</Typography>
                            <Typography variant="caption" color="text.secondary">{unreadCount} unread</Typography>
                        </Box>
                    </Box>
                    <Button size="small" startIcon={<DoneAllIcon />} disabled={unreadCount === 0 || markingAll} onClick={handleMarkAllAsRead} sx={{ whiteSpace: "nowrap", minWidth: 0 }}>{markingAll ? "Marking..." : "Mark all read"}</Button>
                </Box>
                <Divider />
                {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress size={26} /></Box>
                ) : notifications.length === 0 ? (
                    <Box sx={{ textAlign: "center", py: 5, px: 2 }}>
                        <NotificationsNoneIcon sx={{ fontSize: 38, color: "#94a3b8", mb: 1 }} />
                        <Typography sx={{ fontWeight: 600 }}>No notifications yet</Typography>
                        <Typography variant="body2" color="text.secondary">Shift activity notifications will appear here.</Typography>
                    </Box>
                ) : (
                    <List disablePadding sx={{ maxHeight: 340, overflowY: "auto" }}>
                        {notifications.map(notification => {
                            const isRead = isNotificationRead(notification);
                            return (
                                <Box key={notification.id}>
                                    <ListItem disablePadding>
                                        <ListItemButton onClick={() => handleNotificationSelect(notification)} disabled={markingId === notification.id} sx={{ alignItems: "flex-start", gap: 1.25, px: 2, py: 1.5, backgroundColor: isRead ? "#ffffff" : "#eff6ff", opacity: 1, "&.Mui-disabled": { opacity: 1, color: "inherit" }, "&:hover": { backgroundColor: isRead ? "#f8fafc" : "#dbeafe" } }}>
                                            <Box sx={{ width: 9, height: 9, minWidth: 9, borderRadius: "50%", backgroundColor: isRead ? "transparent" : "#2563eb", mt: 0.8 }} />
                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontSize: 13.5, fontWeight: isRead ? 500 : 700, color: "#1e293b" }}>{notification.title}</Typography>
                                                <Typography sx={{ fontSize: 13, color: "#475569", mt: 0.4, whiteSpace: "normal", overflowWrap: "anywhere" }}>{notification.message}</Typography>
                                                <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: "#64748b" }}>{formatDate(notification.createdAt)}</Typography>
                                            </Box>
                                            {!isRead && markingId === notification.id && <CircularProgress size={16} />}
                                        </ListItemButton>
                                    </ListItem>
                                    <Divider />
                                </Box>
                            );
                        })}
                    </List>
                )}
                <Divider />
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.25, gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">{totalElements === 0 ? "0 notifications" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalElements)} of ${totalElements}`}</Typography>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton size="small" aria-label="Previous page" title="Previous" disabled={page === 0 || loading} onClick={() => handlePageChange(page - 1)} sx={{ width: 32, height: 32, border: "1px solid", borderColor: page === 0 || loading ? "#e0e0e0" : "#90caf9", borderRadius: 1, color: page === 0 || loading ? "#bdbdbd" : "#1976d2" }}>
                            <ChevronLeftIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" aria-label="Next page" title="Next" disabled={page >= totalPages - 1 || loading || totalPages === 0} onClick={() => handlePageChange(page + 1)} sx={{ width: 32, height: 32, border: "1px solid", borderColor: page >= totalPages - 1 || loading || totalPages === 0 ? "#e0e0e0" : "#90caf9", borderRadius: 1, color: page >= totalPages - 1 || loading || totalPages === 0 ? "#bdbdbd" : "#1976d2" }}>
                            <ChevronRightIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>
            </Popover>
            <Dialog open={Boolean(selectedNotification)} onClose={() => setSelectedNotification(null)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 700, pr: 1 }}>
                    <Box sx={{ flex: 1 }}>Notification Details</Box>
                    <IconButton aria-label="Close notification details" title="Close" onClick={() => setSelectedNotification(null)} size="small">
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ py: 3 }}>
                    {selectedNotification && (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <Box>
                                <Typography variant="caption" color="text.secondary">Title</Typography>
                                <Typography sx={{ fontWeight: 700, fontSize: 16, mt: 0.5 }}>{selectedNotification.title}</Typography>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="caption" color="text.secondary">Message</Typography>
                                <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", lineHeight: 1.7 }}>{selectedNotification.message}</Typography>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="caption" color="text.secondary">Date & Time</Typography>
                                <Typography sx={{ mt: 0.5 }}>{formatDate(selectedNotification.createdAt)}</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
export default Notification;
