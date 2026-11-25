import { useMemo, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Chip, Stack, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import type { MRT_ColumnDef, MRT_Row } from "material-react-table";
import ExcelJS from "exceljs";
import { shiftResponseHeaders } from "../../types/shift";
import Table from "../../components/Table";
import ShiftHistory from "./shift-history";
import type { ShiftResponse } from "../../types/shift";

export type ShiftDrilldownDialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    shifts: ShiftResponse[];
    loading?: boolean;
};

export default function ShiftDrilldownDialog({ open, onClose, title, subtitle, shifts, loading = false }: ShiftDrilldownDialogProps) {
    const [historyShiftId, setHistoryShiftId] = useState<number | null>(null);
    const [historyShiftCode, setHistoryShiftCode] = useState<string>("");

    const columns: MRT_ColumnDef<ShiftResponse>[] = useMemo(() => [
        {
            accessorKey: "shiftCode",
            header: "Shift Code",
            size: 130,
            enableSorting: true,
            Cell: ({ row }: { row: MRT_Row<ShiftResponse> }) => (
                <Typography component="button" onClick={() => { setHistoryShiftId(row.original.id); setHistoryShiftCode(row.original.shiftCode ?? ""); }} sx={{ border: 0, background: "transparent", padding: 0, color: "#1976d2", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", textAlign: "left", "&:hover": { textDecoration: "underline" } }}>
                    {row.original.shiftCode}
                </Typography>
            )
        },
        { accessorKey: "shiftName", header: "Shift Name", size: 170, enableSorting: true },
        { accessorKey: "shiftType", header: "Shift Type", size: 130, enableSorting: true },
        { accessorKey: "startTime", header: "Start Time", size: 110 },
        { accessorKey: "endTime", header: "End Time", size: 110 },
        { accessorKey: "workingHours", header: "Working Hours", size: 130 },
        {
            accessorKey: "nightShift",
            header: "Night Shift",
            size: 110,
            Cell: ({ row }) => <Chip label={row.original.nightShift ? "Yes" : "No"} size="small" color={row.original.nightShift ? "warning" : "default"} variant={row.original.nightShift ? "filled" : "outlined"} />
        },
        {
            accessorKey: "overtimeAllowed",
            header: "Overtime",
            size: 110,
            Cell: ({ row }) => <Chip label={row.original.overtimeAllowed ? "Yes" : "No"} size="small" color={row.original.overtimeAllowed ? "success" : "default"} variant={row.original.overtimeAllowed ? "filled" : "outlined"} />
        },
        {
            accessorKey: "status",
            header: "Status",
            size: 120,
            Cell: ({ row }) => <Chip label={row.original.status ? "Active" : "Inactive"} size="small" color={row.original.status ? "success" : "default"} variant={row.original.status ? "filled" : "outlined"} />
        },
        {
            accessorKey: "createdAt",
            header: "Created At",
            size: 160,
            enableSorting: true,
            Cell: ({ row }) => {
                const value = row.original.createdAt;
                if (!value) return "-";
                const [date, time] = String(value).split("T");
                return <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}><Typography sx={{ fontSize: "0.78rem" }}>{date}</Typography><Typography sx={{ fontSize: "0.78rem" }}>{time?.split(".")[0]}</Typography></Box>;
            }
        }
    ], []);

    const handleDownloadExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Shift Master");
            const mandatoryHeaders = new Set<string>(["shiftCode", "shiftName", "shiftType", "startTime", "endTime"]);
            const headers = shiftResponseHeaders.filter(header => header !== "id" && shifts.some(shift => header in shift));

            worksheet.addRow(headers.map(header => mandatoryHeaders.has(header) ? "MANDATORY" : "OPTIONAL"));
            worksheet.addRow(headers);

            shifts.forEach(shift => {
                worksheet.addRow(headers.map(header => {
                    const value = shift[header as keyof ShiftResponse];
                    return Array.isArray(value) ? value.join(", ") : value ?? "";
                }));
            });

            const mandatoryRow = worksheet.getRow(1);
            mandatoryRow.height = 24;
            mandatoryRow.eachCell((cell, colNumber) => {
                const header = headers[colNumber - 1];
                const isMandatory = mandatoryHeaders.has(header);
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE5E5" } };
                cell.font = { bold: true, color: { argb: isMandatory ? "FFFF0000" : "FF1565C0" }, size: 10 };
                cell.alignment = { horizontal: "center", vertical: "middle" };
            });

            const headerRow = worksheet.getRow(2);
            headerRow.height = 28;
            headerRow.eachCell(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
                cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.border = { bottom: { style: "thin", color: { argb: "FF808080" } } };
            });

            headers.forEach((header, index) => {
                worksheet.getColumn(index + 1).width = Math.max(header.length + 4, 15);
            });

            worksheet.views = [{ state: "frozen", ySplit: 2 }];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "Shift_Master_Export.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export shift data:", error);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: "90vh", display: "flex", flexDirection: "column" } } }}>
                <DialogTitle sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", bgcolor: "#f8fafc" }}>
                    <Box>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0f172a" }}>{title}</Typography>
                            <Chip label={`${shifts.length} ${shifts.length === 1 ? "Record" : "Records"}`} size="small" color="primary" sx={{ fontWeight: 700, borderRadius: 1.5 }} />
                        </Stack>
                        {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} onClick={handleDownloadExcel} disabled={!shifts.length} sx={{ textTransform: "none", fontWeight: 600 }}>Export</Button>
                        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ p: 1.5, flex: 1, overflow: "auto" }}>
                    <Table
                        data={shifts}
                        columns={columns}
                        emptyMessage="No shift records found for this selection."
                        enablePagination
                        maxHeight={520}
                        getRowId={(row) => String(row.id ?? row.shiftCode)}
                        tableOptions={{
                            state: { isLoading: loading },
                            enableSorting: true,
                            enableColumnFilters: false,
                            enableGlobalFilter: true,
                            enableDensityToggle: false,
                            enableFullScreenToggle: true,
                            enableColumnActions: false,
                            enableHiding: true,
                            initialState: { density: "compact", showGlobalFilter: true, pagination: { pageIndex: 0, pageSize: 10 } },
                            muiTablePaperProps: { elevation: 0, sx: { backgroundColor: "transparent", boxShadow: "none", width: "100%", overflow: "hidden" } },
                            muiTableContainerProps: {
                                sx: {
                                    width: "100%",
                                    maxHeight: 520,
                                    overflowX: "auto",
                                    overflowY: "auto",
                                    "&::-webkit-scrollbar": { width: "12px", height: "12px" },
                                    "&::-webkit-scrollbar-track": { backgroundColor: "#e5e7eb" },
                                    "&::-webkit-scrollbar-thumb": { backgroundColor: "#6b7280", borderRadius: "6px" },
                                    "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "#374151" }
                                }
                            },
                            muiTableProps: { sx: { minWidth: 1400, borderCollapse: "separate", borderSpacing: 0 } },
                            muiTableHeadCellProps: {
                                sx: {
                                    whiteSpace: "nowrap",
                                    fontWeight: 700,
                                    color: "#ffffff",
                                    backgroundColor: "#111111",
                                    borderBottom: "none",
                                    "& .Mui-TableHeadCell-Content": { color: "#ffffff" },
                                    "& .MuiTableSortLabel-root": { color: "#ffffff !important" },
                                    "& .MuiTableSortLabel-icon": { color: "#ffffff !important" },
                                    "& .MuiButtonBase-root": { color: "#ffffff" }
                                }
                            },
                            muiTableBodyRowProps: { hover: true },
                            muiTableBodyCellProps: { sx: { whiteSpace: "nowrap", color: "#263238", fontSize: "0.78rem", py: 1, borderBottom: "1px solid #e5e7eb" } },
                            muiBottomToolbarProps: {
                                sx: {
                                    backgroundColor: "#1f2937 !important",
                                    color: "#ffffff !important",
                                    "& *": { color: "#ffffff !important" },
                                    "& .Mui-disabled": { color: "rgba(255,255,255,0.4) !important" }
                                }
                            },
                            muiPaginationProps: {
                                rowsPerPageOptions: [5, 10, 20, 50],
                                showRowsPerPage: true,
                                shape: "rounded",
                                sx: {
                                    color: "#ffffff !important",
                                    "& *": { color: "#ffffff !important" },
                                    "& .MuiTablePagination-selectIcon": { color: "#ffffff !important" }
                                }
                            }
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 2, py: 1.5, borderTop: "1px solid #e2e8f0" }}>
                    <Button variant="contained" onClick={onClose} sx={{ bgcolor: "#17324d", "&:hover": { bgcolor: "#0f2032" } }}>Close</Button>
                </DialogActions>
            </Dialog>

            {historyShiftId !== null && (
                <ShiftHistory
                    shiftId={historyShiftId}
                    shiftCode={historyShiftCode}
                    onClose={() => { setHistoryShiftId(null); setHistoryShiftCode(""); }}
                />
            )}
        </>
    );
}