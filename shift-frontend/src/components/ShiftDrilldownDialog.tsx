import { useMemo, useState } from "react";
import {Dialog, DialogTitle, DialogContent, DialogActions,Button, Box, Typography, Chip, Stack, IconButton} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import type { MRT_ColumnDef, MRT_Row } from "material-react-table";
import * as XLSX from "xlsx";
import Table from "./Table";
import ShiftHistory from "../app/activity/shift-history";
import type { ShiftResponse } from "../types/shift";

export type ShiftDrilldownDialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    shifts: ShiftResponse[];
    loading?: boolean;
};

const StatusPill = ({ active }: { active: boolean }) => (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5,px: 1, py: 0.25, borderRadius: 4, fontSize: "0.75rem", fontWeight: 700, bgcolor: active ? "#ecfdf5" : "#fef2f2", color: active ? "#059669" : "#dc2626", border: `1px solid ${active ? "#a7f3d0" : "#fecaca"}` }} >
        {active ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <CancelIcon sx={{ fontSize: 14 }} />}
        {active ? "Active" : "Inactive"}
    </Box>
);
export default function ShiftDrilldownDialog({ open, onClose, title, subtitle, shifts, loading = false}: ShiftDrilldownDialogProps) {
    const [historyShiftId, setHistoryShiftId] = useState<number | null>(null);
    const [historyShiftCode, setHistoryShiftCode] = useState<string>("");
    const columns: MRT_ColumnDef<ShiftResponse>[] = useMemo(() => [
        { accessorKey: "shiftCode",
            header: "Shift Code",
            size: 130,
            enableSorting: true,
            Cell: ({ row }: { row: MRT_Row<ShiftResponse> }) => (
                <Typography component="button" onClick={() => { setHistoryShiftId(row.original.id);setHistoryShiftCode(row.original.shiftCode ?? ""); }} sx={{ border: 0, background: "transparent", padding: 0, color: "#1976d2",fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textAlign: "left", "&:hover": { textDecoration: "underline" } }}  >
                    {row.original.shiftCode}
                </Typography>
            )
        },
        { accessorKey: "shiftName", header: "Shift Name", size: 170, enableSorting: true },
        { accessorKey: "shiftType", header: "Shift Type", size: 130, enableSorting: true },
        { accessorKey: "startTime", header: "Start Time", size: 110 },
        { accessorKey: "endTime", header: "End Time", size: 110 },
        { accessorKey: "workingHours", header: "Working Hours", size: 130 },
        { accessorKey: "nightShift", header: "Night Shift", size: 110,
            Cell: ({ cell }) => {
                const val = Boolean(cell.getValue());
                return ( <Chip label={val ? "Yes" : "No"} size="small" color={val ? "warning" : "default"} variant={val ? "filled" : "outlined"} sx={{ fontWeight: 600, fontSize: "0.72rem" }} /> ); }},
        { accessorKey: "overtimeAllowed", header: "Overtime", size: 110,
            Cell: ({ cell }) => {
                const val = Boolean(cell.getValue());
                return ( <Chip label={val ? "Yes" : "No"} size="small" color={val ? "success" : "default"} variant={val ? "filled" : "outlined"} sx={{ fontWeight: 600, fontSize: "0.72rem" }} /> );}},
        { accessorKey: "status", header: "Status", size: 120,
            Cell: ({ cell }) => <StatusPill active={Boolean(cell.getValue())} />},
        { accessorKey: "createdAt", header: "Created At", size: 160, enableSorting: true,
            Cell: ({ cell }) => {
                const value = cell.getValue<string>();
                if (!value) return "-";
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return String(value);
                return date.toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
            }
        }
    ], []);

    // Download filtered shifts as Excel
    const handleDownloadExcel = () => {
        if (!shifts.length) return;
        const rows = shifts.map(s => ({
            "Shift Code": s.shiftCode ?? "",
            "Shift Name": s.shiftName ?? "",
            "Shift Type": s.shiftType ?? "",
            "Start Time": s.startTime ?? "",
            "End Time": s.endTime ?? "",
            "Working Hours": s.workingHours ?? "",
            "Night Shift": s.nightShift ? "Yes" : "No",
            "Overtime Allowed": s.overtimeAllowed ? "Yes" : "No",
            "Status": s.status ? "Active" : "Inactive",
            "Created At": s.createdAt ?? ""
        }));
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, sheet, "Filtered Shifts");
        XLSX.writeFile(workbook, "shift-drilldown.xlsx");
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "90vh", display: "flex", flexDirection: "column" } } }} >
                <DialogTitle sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", bgcolor: "#f8fafc" }} >
                    <Box>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>
                                {title}
                            </Typography>
                            <Chip label={`${shifts.length} ${shifts.length === 1 ? "Record" : "Records"}`} size="small" color="primary" sx={{ fontWeight: 700, borderRadius: 1.5 }} />
                        </Stack>
                        {subtitle && ( <Typography variant="body2" color="text.secondary"> {subtitle} </Typography> )}
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={handleDownloadExcel} disabled={!shifts.length} sx={{ textTransform: "none", fontWeight: 600 }} > Export </Button>
                        <IconButton onClick={onClose} size="small"> <CloseIcon /> </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent sx={{ p: 1.5, flex: 1, overflow: "auto" }}>
                    <Table
                        data={shifts}
                        columns={columns}
                        emptyMessage="No shift records found for this selection."
                        enablePagination={true}
                        maxHeight={520}
                        getRowId={row => String(row.id ?? row.shiftCode ?? Math.random())}
                        tableOptions={{
                            state: { isLoading: loading },
                            enableGlobalFilter: true,
                            enableColumnFilters: false,
                            enableDensityToggle: false,
                            enableFullScreenToggle: true,
                            initialState: { density: "compact", pagination: { pageIndex: 0, pageSize: 10 } }
                        }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 2, py: 1.5, borderTop: "1px solid #e2e8f0" }}>
                    <Button variant="contained" onClick={onClose} sx={{ bgcolor: "#17324d", "&:hover": { bgcolor: "#0f2032" } }} >Close </Button>
                </DialogActions>
            </Dialog>

            {/* Shift History Modal Dialog */}
            {historyShiftId !== null && (
                <ShiftHistory
                    shiftId={historyShiftId}
                    shiftCode={historyShiftCode}
                    onClose={() => {
                        setHistoryShiftId(null);
                        setHistoryShiftCode("");
                    }}
                />
            )}
        </>
    );
}
