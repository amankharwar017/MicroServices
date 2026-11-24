import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import type { GridSortModel } from "@mui/x-data-grid";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Drawer, IconButton, Tooltip, Typography, Menu, MenuItem, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useDispatch, useSelector } from "react-redux";
import type { MRT_ColumnDef, MRT_PaginationState, MRT_SortingState } from "material-react-table";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Table from "../../components/Table";
import ShiftForm from "./add-form.";
import EditForm from "./update-form";
import Dashboard from "./shift-dashboard";
import ShiftSearchForm from "./shift-search-filter";
import { getShiftList, searchShifts, deleteShift, saveMultipleShifts, validateMultipleShifts, downloadShiftTemplate } from "../shift-api";
import type { ShiftResponse } from "../../types/shift";
import { shiftResponseHeaders } from "../../types/shift";
import type { RootState } from "../../redux/store";
import { setShifts } from "../../redux/shiftSlice";
import Swal from "sweetalert2";
import ShiftHistory from "./shift-history";
import * as XLSX from "xlsx";
import { shiftValidationSchema } from "../shift-validation";
import { historyFields } from "./shift-history";
import ExcelJS from "exceljs";

const showTimedAlert = (title: string, text: string, icon: "success" | "error") => Swal.fire({ title, text, icon, timer: 2000, timerProgressBar: true, showConfirmButton: false, heightAuto: false, didOpen: (popup) => popup.parentElement!.style.zIndex = "20000" });
const formatExcelTime = (value: unknown): unknown => {
    if (typeof value === "number" && value >= 0 && value < 1) {
        const totalSeconds = Math.round(value * 86400) % 86400;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return value;
};

const normalizeGraceValue = (value: unknown): unknown => {
    if (value === null || value === undefined || String(value).trim() === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : value;
    const normalizedValue = String(value).trim();
    return normalizedValue !== "" && Number.isFinite(Number(normalizedValue)) ? Number(normalizedValue) : value;
};

const normalizeApplicableDays = (value: unknown): string[] => {
    const allowedDays = new Set(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);
    const days = Array.isArray(value) ? value : String(value ?? "").split(/[,;]+/);
    return days.map((day) => String(day).trim().toUpperCase()).filter(Boolean).map((day) => day.replace(/\s+/g, "")).filter((day) => allowedDays.has(day));
};

const normalizeExcelRow = (row: Record<string, unknown>): Record<string, unknown> => ({
    ...row,
    graceIn: normalizeGraceValue(row.graceIn ?? row["Grace In"]),
    graceOut: normalizeGraceValue(row.graceOut ?? row["Grace Out"]),
    applicableDays: normalizeApplicableDays(row.applicableDays ?? row["Applicable Days"]),
    startTime: formatExcelTime(row.startTime),
    endTime: formatExcelTime(row.endTime),
    breakStart: formatExcelTime(row.breakStart),
    breakEnd: formatExcelTime(row.breakEnd)
});

const shiftColumns: MRT_ColumnDef<ShiftResponse>[] = [
    { accessorKey: "shiftCode", header: "Shift Code", size: 150, enableSorting: true },
    { accessorKey: "shiftName", header: "Shift Name", size: 150, enableSorting: true },
    { accessorKey: "shiftType", header: "Shift Type", size: 150, enableSorting: false },
    { accessorKey: "startTime", header: "Start Time", size: 150, enableSorting: false },
    { accessorKey: "endTime", header: "End Time", size: 150, enableSorting: false },
    { accessorKey: "workingHours", header: "Working Hours", size: 150, enableSorting: false },
    { accessorKey: "nightShift", header: "Night Shift", size: 150, enableSorting: false },
    { accessorKey: "overtimeAllowed", header: "Overtime", size: 150, enableSorting: false },
    { accessorKey: "status", header: "Status", size: 150, enableSorting: false },
    { accessorKey: "createdAt", header: "Created On", size: 150, enableSorting: false },
    { accessorKey: "updatedAt", header: "Updated On", size: 150, enableSorting: false }
];

const renderShiftValue = (shift: ShiftResponse, key: keyof ShiftResponse) => {
    const value = shift[key];
    if (key === "nightShift") return <Chip label={shift.nightShift ? "Yes" : "No"} size="small" color={shift.nightShift ? "warning" : "default"} variant={shift.nightShift ? "filled" : "outlined"} />;
    if (key === "overtimeAllowed") return <Chip label={shift.overtimeAllowed ? "Yes" : "No"} size="small" color={shift.overtimeAllowed ? "success" : "default"} variant={shift.overtimeAllowed ? "filled" : "outlined"} />;
    if (key === "status") return <Chip label={shift.status ? "Active" : "Inactive"} size="small" color={shift.status ? "success" : "default"} variant={shift.status ? "filled" : "outlined"} />;
    if (key === "createdAt" || key === "updatedAt") {
        if (!value) return "N/a";
        const [date, time] = String(value).split("T");
        return <>{date}<br />{time?.split(".")[0]}</>;
    }
    if (value === null || value === undefined || value === "") return "N/a";
    if (value instanceof Set || Array.isArray(value)) return [...value].join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
};

const excelPreviewColumns: MRT_ColumnDef<Record<string, unknown>>[] = historyFields.filter(({ accessorKey }) => !["createdBy", "createdAt", "updatedBy"].includes(accessorKey))
    .map(({ header, accessorKey }) => ({
        accessorKey,
        header,
        size: 160,
        minSize: 130,
        enableSorting: false,
        Cell: ({ cell }) => accessorKey === "applicableDays" && Array.isArray(cell.getValue()) ? cell.getValue<string[]>().join(", ") : cell.getValue() as string
    }));

type PageType = "dashboard" | "master";

function Activityboard({ activePage, onPageChange, username, role, onLogout }: { activePage: PageType; onPageChange: (page: PageType) => void; username: string; role: string; onLogout: () => void; }) {
    const dispatch = useDispatch();
    const shifts = useSelector<RootState, ShiftResponse[]>((state) => state.shift.shifts);
    const [showForm, setShowForm] = useState(false);
    const [editShiftId, setEditShiftId] = useState<number | null>(null);
    const [searchParams, setSearchParams] = useState<Record<string, any>>({ status: true });
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [sortModel, setSortModel] = useState<GridSortModel>([{ field: "id", sort: "asc" }]);
    const [totalRows, setTotalRows] = useState(0);
    const [summaryCountsRefresh, setSummaryCountsRefresh] = useState(0);
    const [summaryCountsUpdate, setSummaryCountsUpdate] = useState({ version: 0, totalDelta: 0, activeDelta: 0, inactiveDelta: 0, nightDelta: 0 });
    const [historyShiftId, setHistoryShiftId] = useState<number | null>(null);
    const [historyShiftCode, setHistoryShiftCode] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [shiftToDelete, setShiftToDelete] = useState<ShiftResponse | null>(null);
    const excelFileInputRef = useRef<HTMLInputElement>(null);
    const [excelDialogOpen, setExcelDialogOpen] = useState(false);
    const [excelValidRows, setExcelValidRows] = useState<Record<string, unknown>[]>([]);
    const [excelInvalidRows, setExcelInvalidRows] = useState<{ rowNumber: number; data: Record<string, unknown>; errors: string[] }[]>([]);
    const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<HTMLElement | null>(null);
    const [fabHovered, setFabHovered] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [profileAnchorEl, setProfileAnchorEl] = useState<HTMLElement | null>(null);
    const handleProfileClick = (event: MouseEvent<HTMLElement>) => setProfileAnchorEl(event.currentTarget);
    const handleProfileClose = () => setProfileAnchorEl(null);

    const fetchShifts = async () => {
        try {
            const sort = sortModel.length > 0 ? `${sortModel[0].field},${sortModel[0].sort}` : "id,asc";
            const filters = { ...searchParams };
            if (Object.keys(filters).length > 0) {
                let response;
                if (filters.searchText?.trim()) {
                    const searchText = filters.searchText.trim();
                    const { searchText: _, ...otherParams } = filters;
                    response = await searchShifts({ ...otherParams, shiftCode: searchText }, paginationModel.page, paginationModel.pageSize, sort);
                    let filteredContent = (response.data?.content ?? []).filter((shift: ShiftResponse) => shift.shiftCode?.toLowerCase() === searchText.toLowerCase());
                    if (filteredContent.length === 0) {
                        response = await searchShifts({ ...otherParams, shiftName: searchText }, paginationModel.page, paginationModel.pageSize, sort);
                        filteredContent = (response.data?.content ?? []).filter((shift: ShiftResponse) => shift.shiftName?.toLowerCase() === searchText.toLowerCase());
                    }
                    dispatch(setShifts(filteredContent));
                    setTotalRows(response.data?.totalElements ?? filteredContent.length);
                } else {
                    response = await searchShifts(filters, paginationModel.page, paginationModel.pageSize, sort);
                    dispatch(setShifts(response.data?.content ?? []));
                    setTotalRows(response.data?.totalElements ?? 0);
                }
            } else {
                const response = await getShiftList(paginationModel.page, paginationModel.pageSize, sort);
                dispatch(setShifts(response.data?.content ?? []));
                setTotalRows(response.data?.totalElements ?? 0);
            }
        } catch (error) {
            console.error("Failed to fetch shifts:", error);
        }
    };

    useEffect(() => { fetchShifts(); }, [paginationModel, sortModel, searchParams]);
    const handleAddShift = () => { setEditShiftId(null); setShowForm(true); };
    const handleEdit = (shiftId: number) => { setEditShiftId(shiftId); setShowForm(true); };
    const handleViewHistory = (shiftId: number) => {
        const selectedShiftRow = shifts.find((shift) => shift.id === shiftId);
        setHistoryShiftCode(selectedShiftRow?.shiftCode ?? "");
        setHistoryShiftId(shiftId);
    };

    const handleBackToList = () => { setShowForm(false); setEditShiftId(null); };
    const handleFormError = (message: string) => { void showTimedAlert("Error!", message, "error"); };
    type SummaryCountKey = "total" | "active" | "inactive" | "night";
    const refreshSummaryCards = (_keys: SummaryCountKey[]) => { setSummaryCountsRefresh((previous) => previous + 1); };
    const refreshShiftData = async () => { await fetchShifts(); };


    const handleFormSuccess = async (
        message: string,
        changes?: { statusChanged: boolean; nightShiftChanged: boolean; restored: boolean; },
        updatedData?: Record<string, unknown>) => {
        const currentEditId = editShiftId;
        setShowForm(false);
        setEditShiftId(null);

        if (message === "No changes detected.") {
            await showTimedAlert("Info!", message, "success");
            return;
        }

        window.dispatchEvent(new Event("shift-notification-update"));

        if (currentEditId === null) {
            await fetchShifts();
            refreshSummaryCards(["total", "active", "inactive", "night"]);
        } else if (updatedData) {
            const previousShift = shifts.find(
                (shift) => shift.id === currentEditId
            );

            if (previousShift) {
                const updatedShift = { ...previousShift, ...updatedData, isDeleted: updatedData.status === true ? false : previousShift.isDeleted } as ShiftResponse;
                const updatedShifts = shifts.map((shift) => shift.id === currentEditId ? updatedShift : shift).filter((shift) =>
                    searchParams.status === true ? shift.status === true : searchParams.status === false ? shift.status === false : true);
                dispatch(setShifts(updatedShifts));
                if (changes) {
                    const activeDelta = Number(updatedShift.status) - Number(previousShift.status);
                    const inactiveDelta = Number(!updatedShift.status) - Number(!previousShift.status);
                    const nightDelta = Number(updatedShift.nightShift) - Number(previousShift.nightShift);
                    if (activeDelta !== 0 || inactiveDelta !== 0 || nightDelta !== 0) {
                        setSummaryCountsUpdate((previous) => ({ ...previous, version: previous.version + 1, totalDelta: 0, activeDelta, inactiveDelta, nightDelta }));
                    }
                }
            }
        }

        await showTimedAlert("Success!", message, "success");
    };


    const handleDelete = async (shift?: ShiftResponse, action?: "confirm" | "cancel") => {
        if (action === "cancel") {
            setDeleteDialogOpen(false);
            setShiftToDelete(null);
            return;
        }
        if (action === "confirm") {
            if (!shiftToDelete) return;
            const deletedShift = shiftToDelete;
            const selectedShiftId = deletedShift.id;
            setDeleteDialogOpen(false);
            setShiftToDelete(null);
            try {
                await deleteShift(selectedShiftId);
                window.dispatchEvent(new Event("shift-notification-update"));
                dispatch(setShifts(shifts.filter((item) => item.id !== selectedShiftId)));
                if (deletedShift.status) {
                    setSummaryCountsUpdate((previous) => ({
                        ...previous,
                        version: previous.version + 1,
                        totalDelta: 0,
                        activeDelta: -1,
                        inactiveDelta: 1,
                        nightDelta: 0
                    }));
                }
                await showTimedAlert("Success!", "Shift deactivated successfully.", "success");
            } catch (error) {
                await showTimedAlert("Error!", "Failed to deactivate shift.", "error");
            }
            return;
        }
        if (shift) {
            setShiftToDelete(shift);
            setDeleteDialogOpen(true);
        }
    };
    const handleSearch = (searchData: Record<string, any>) => {
        setSearchParams(searchData);
        setPaginationModel({ page: 0, pageSize: paginationModel.pageSize });
    };
    const handleCloseHistory = () => { setHistoryShiftId(null); setHistoryShiftCode(""); };
    const handleDownloadMenuOpen = (event: MouseEvent<HTMLElement>) => setDownloadMenuAnchor(event.currentTarget);
    const handleDownloadMenuClose = () => setDownloadMenuAnchor(null);
    const handleDownloadExcel = async () => {
        try {
            const allShifts = shifts;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Shift Master");
            const headers = shiftResponseHeaders.filter((header) => header !== "id" && allShifts.some((shift) => header in shift));
            worksheet.addRow(headers);
            allShifts.forEach((shift) => worksheet.addRow(headers.map((header) => { const value = shift[header as keyof ShiftResponse]; return Array.isArray(value) ? value.join(", ") : value ?? ""; })));
            const headerRow = worksheet.getRow(1);
            headerRow.height = 28;
            headerRow.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
                cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.border = { bottom: { style: "thin", color: { argb: "FF808080" } } };
            });
            headers.forEach((header, index) => { worksheet.getColumn(index + 1).width = Math.max(header.length + 4, 16); });
            worksheet.views = [{ state: "frozen", ySplit: 1 }];
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
            handleDownloadMenuClose();
        } catch {
            handleDownloadMenuClose();
            await showTimedAlert("Error!", "Failed to export shift data.", "error");
        }
    };
    const handleDownloadTemplate = async () => {
        try {
            const response = await downloadShiftTemplate();
            const backendWorkbook = new ExcelJS.Workbook();
            await backendWorkbook.xlsx.load(response.data);
            const backendWorksheet = backendWorkbook.getWorksheet("Shift Template");
            if (!backendWorksheet) throw new Error("Shift Template worksheet not found");
            const rowValues = backendWorksheet.getRow(1).values as (string | number | boolean | null | undefined)[];
            const headers: string[] = rowValues.slice(1).map((header) => String(header ?? ""));
            const mandatoryHeaders = new Set<string>(["shiftCode", "shiftName", "shiftType", "startTime", "endTime"]);
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Shift Template");
            worksheet.addRow(headers.map((header) => mandatoryHeaders.has(header) ? "MANDATORY" : "OPTIONAL"));
            worksheet.addRow(headers);
            worksheet.addRow(["M0001", "M-abc1", "Morning", "General", "09:00", "18:00", "13:00", "14:00", 10, 10, true, false, false, "#4CAF50", "MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY", "Demo shift", "", "Sample data", true]);
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
            headerRow.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF000000" } };
                cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.border = { bottom: { style: "thin", color: { argb: "FF808080" } } };
            });
            headers.forEach((header: string, index: number) => {
                worksheet.getColumn(index + 1).width = Math.max(header.length + 4, 15);
            });
            worksheet.views = [{ state: "frozen", ySplit: 2 }];
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "Shift_Master_Template.xlsx";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            handleDownloadMenuClose();
            await showTimedAlert("Success!", "Excel template downloaded successfully.", "success");
        } catch (error) {
            console.error("Failed to download Excel template:", error);
            handleDownloadMenuClose();
            await showTimedAlert("Error!", "Failed to download Excel template.", "error");
        }
    };
    const handleSelectExcelFile = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".xlsx")) {
            void showTimedAlert("Invalid File!", "Please select an Excel file with the .xlsx extension.", "error");
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            void showTimedAlert("File Too Large!", "Please select an Excel file smaller than 20 MB.", "error");
            return;
        }
        try {
            const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                void showTimedAlert("Invalid File!", "The selected Excel file does not contain a worksheet.", "error");
                return;
            }
            const worksheet = workbook.Sheets[sheetName];
            const allRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", blankrows: false });
            if (allRows.length === 0) {
                void showTimedAlert("Empty File!", "The selected Excel file does not contain any records.", "error");
                return;
            }
            const hasMandatoryRow = (allRows[0] ?? []).some((cell) => String(cell ?? "").trim().toUpperCase() === "MANDATORY");
            const headerRowIndex = hasMandatoryRow ? 1 : 0;
            const dataStartRow = headerRowIndex + 2;
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { range: headerRowIndex, defval: "", blankrows: false })
                .filter((row) => Object.values(row).some((value) => String(value ?? "").trim() !== ""));
            if (rows.length === 0) {
                void showTimedAlert("Empty File!", "No shift records were found below the Excel headers. Fill in at least one row and upload again.", "error");
                return;
            }
            const allowedDays = new Set(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]);
            const codeCounts = new Map<string, number>();
            const nameCounts = new Map<string, number>();
            const normalizedRows = rows.map((row) => normalizeExcelRow(row));
            normalizedRows.forEach((row) => {
                const code = String(row.shiftCode ?? "").trim().toLowerCase();
                const name = String(row.shiftName ?? "").trim().toLowerCase();
                if (code) codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
                if (name) nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
            });
            const preparedRows: { rowNumber: number; data: Record<string, unknown>; errors: string[]; validatedData: Record<string, unknown> }[] = [];
            for (let index = 0; index < normalizedRows.length; index++) {
                const row = normalizedRows[index];
                const errors: string[] = [];
                const suppliedDays = Array.isArray(row.applicableDays) ? row.applicableDays : String(row.applicableDays ?? "").split(/[,;]+/).map((day) => day.trim()).filter(Boolean);
                const invalidDays = suppliedDays.map((day) => String(day).trim().toUpperCase().replace(/\s+/g, "")).filter((day) => day && !allowedDays.has(day));
                if (invalidDays.length > 0) {
                    errors.push(`applicableDays: Invalid weekday name(s): ${[...new Set(invalidDays)].join(", ")}`);
                }
                let validatedShift: Record<string, unknown> = row;
                try {
                    validatedShift = await shiftValidationSchema.validate(row, { abortEarly: false }) as Record<string, unknown>;
                } catch (error: unknown) {
                    if (error && typeof error === "object" && "inner" in error) {
                        const validationError = error as { inner?: { path?: string; message: string }[]; message?: string };
                        if (validationError.inner?.length) {
                            errors.push(...validationError.inner.map((item) => `${item.path || "Validation"}: ${item.message}`));
                        } else {
                            errors.push(validationError.message ?? "Validation failed.");
                        }
                    } else {
                        errors.push(error instanceof Error ? error.message : "Failed to validate this record.");
                    }
                }
                const code = String(row.shiftCode ?? "").trim().toLowerCase();
                const name = String(row.shiftName ?? "").trim().toLowerCase();
                if (code && (codeCounts.get(code) ?? 0) > 1) {
                    errors.push("shiftCode: Shift code already exists in the uploaded Excel file.");
                }
                if (name && (nameCounts.get(name) ?? 0) > 1) {
                    errors.push("shiftName: Shift name already exists in the uploaded Excel file.");
                }
                preparedRows.push({
                    rowNumber: index + dataStartRow,
                    data: row,
                    errors: [...new Set(errors)],
                    validatedData: {
                        ...validatedShift,
                        shiftCode: String(validatedShift.shiftCode ?? "").trim(),
                        shiftName: String(validatedShift.shiftName ?? "").trim(),
                        displayName: validatedShift.displayName || null,
                        breakStart: validatedShift.breakStart || null,
                        breakEnd: validatedShift.breakEnd || null,
                        shiftColor: validatedShift.shiftColor || null,
                        applicableDays: normalizeApplicableDays(validatedShift.applicableDays),
                        description: validatedShift.description || null,
                        attachment: validatedShift.attachment || null,
                        remarks: validatedShift.remarks || null
                    }
                });
            }
            const response = await validateMultipleShifts(preparedRows.map((item) => item.data));
            const backendResults = Array.isArray(response.data) ? response.data as { rowNumber: number; errors: string[] }[] : [];
            const backendErrorsByRow = new Map<number, string[]>();
            for (const result of backendResults) {
                backendErrorsByRow.set(result.rowNumber, result.errors ?? []);
            }
            const validRows: Record<string, unknown>[] = [];
            const invalidRows: { rowNumber: number; data: Record<string, unknown>; errors: string[] }[] = [];
            preparedRows.forEach((item, index) => {
                const backendErrors = backendErrorsByRow.get(index + 2) ?? [];
                const allErrors = [...new Set([...item.errors, ...backendErrors])];
                if (allErrors.length > 0) {
                    invalidRows.push({ rowNumber: item.rowNumber, data: item.data, errors: allErrors });
                } else {
                    validRows.push(item.validatedData);
                }
            });
            setExcelValidRows(validRows);
            setExcelInvalidRows(invalidRows);
            setExcelDialogOpen(true);
        } catch (error) {
            console.error("Failed to read or validate Excel file:", error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            void showTimedAlert("Validation Failed!", axiosError.response?.data?.message ?? "Failed to read or validate the Excel file.", "error");
        }
    };

    const handleSaveExcelRows = async () => {
        if (excelValidRows.length === 0) { void showTimedAlert("No Valid Records!", "There are no valid records available to save.", "error"); return; }
        try {
            const payload: Record<string, unknown>[] = excelValidRows.map((shift) => ({
                ...shift,
                displayName: shift.displayName || null,
                breakStart: shift.breakStart || null,
                breakEnd: shift.breakEnd || null,
                shiftColor: shift.shiftColor || null,
                applicableDays: Array.isArray(shift.applicableDays) ? shift.applicableDays : [],
                description: shift.description || null,
                attachment: shift.attachment || null,
                remarks: shift.remarks || null
            }));
            const response = await saveMultipleShifts(payload);
            const savedCount = payload.length;
            const activeDelta = payload.filter((shift) => shift.status === true).length;
            const inactiveDelta = payload.filter((shift) => shift.status === false).length;
            const nightDelta = payload.filter((shift) => shift.nightShift === true).length;
            setSummaryCountsUpdate((previous) => ({
                ...previous,
                version: previous.version + 1,
                totalDelta: savedCount,
                activeDelta,
                inactiveDelta,
                nightDelta
            }));
            window.dispatchEvent(new Event("shift-notification-update"));
            setExcelDialogOpen(false);
            setExcelValidRows([]);
            setExcelInvalidRows([]);
            await refreshShiftData();
            await showTimedAlert("Success!", response.data?.message ?? "Valid shifts saved successfully.", "success");
        } catch (error) {
            console.error("Failed to save Excel records:", error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            await showTimedAlert("Error!", axiosError.response?.data?.message ?? "Failed to save valid Excel records.", "error");
        }
    };
    const pagination: MRT_PaginationState = { pageIndex: paginationModel.page, pageSize: paginationModel.pageSize };
    const sorting: MRT_SortingState = sortModel.map((item) => ({ id: item.field, desc: item.sort === "desc" }));
    return (<>
        <Box className="dashboard-layout">
            <Sidebar activePage={activePage} onPageChange={onPageChange} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <Box component="main" className="dashboard-main" sx={{ ml: sidebarOpen ? "240px" : 0, width: sidebarOpen ? "calc(100% - 240px)" : "100%", transition: "all 0.3s ease" }}>
                <Header username={username} role={role} anchorEl={profileAnchorEl} onProfileClick={handleProfileClick} onProfileClose={handleProfileClose} onLogout={onLogout} onMenuClick={() => setSidebarOpen((previous) => !previous)} />
                <Box className="dashboard-content">
                    {activePage === "dashboard" ? (
                        <>
                            <Paper elevation={0} sx={{ p: 2, mb: 2, border: "1px solid #e2e8f0", borderRadius: 3, backgroundColor: "#fff" }}>
                                <Typography variant="h5" sx={{ fontWeight: 800 }}>Shift Master</Typography>
                                <Typography variant="body2" color="text.secondary">Manage shift details, operational status and records</Typography>
                            </Paper>
                            <ShiftSearchForm onSearch={handleSearch} totalRows={totalRows} refreshSummaryCounts={summaryCountsRefresh} summaryCountsUpdate={summaryCountsUpdate} />
                            <Box className="shift-table-card" sx={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
                                <Box className="shift-table-card-content">
                                    <Table<ShiftResponse>
                                        data={shifts}
                                        columns={shiftColumns.map((column) => ({
                                            ...column,
                                            Cell: column.accessorKey === "shiftCode"
                                                ? ({ row }) => (
                                                    <Typography
                                                        component="button"
                                                        onClick={() => handleViewHistory(row.original.id)}
                                                        sx={{
                                                            border: 0,
                                                            background: "transparent",
                                                            padding: 0,
                                                            color: "#1976d2",
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            fontFamily: "inherit",
                                                            fontSize: "inherit",
                                                            textAlign: "left",
                                                            "&:hover": { textDecoration: "underline" }
                                                        }}
                                                    >
                                                        {row.original.shiftCode}
                                                    </Typography>
                                                )
                                                : ({ row }) => renderShiftValue(row.original, column.accessorKey as keyof ShiftResponse)
                                        }))}
                                        getRowId={(row) => String(row.id)}
                                        recordCount={totalRows}
                                        countText={`Total: ${totalRows}`}
                                        emptyMessage="No shifts found"
                                        enableRowActions
                                        renderRowActions={(shift) => (
                                            <Box className="shift-table-actions" sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 0.5 }}>
                                                {role === "ADMIN" && (
                                                    <>
                                                        {shift.status && !shift.isDeleted && (<Tooltip title="Delete">
                                                            <IconButton size="small" className="shift-delete-button" onClick={() => handleDelete(shift)}> <DeleteIcon fontSize="small" /> </IconButton>
                                                        </Tooltip>
                                                        )}
                                                        <Tooltip title="Edit">
                                                            <IconButton size="small" className="shift-edit-button" onClick={() => handleEdit(shift.id)}> <EditIcon fontSize="small" /> </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                                <Tooltip title="View">
                                                    <IconButton size="small" className="shift-view-button" onClick={() => handleViewHistory(shift.id)}> <VisibilityIcon fontSize="small" /> </IconButton>
                                                </Tooltip>
                                            </Box>
                                        )}
                                        maxHeight="60vh"
                                        tableOptions={{
                                            manualPagination: true,
                                            manualSorting: true,
                                            rowCount: totalRows,
                                            displayColumnDefOptions: { "mrt-row-actions": { header: "Action", size: 150, minSize: 150 } },
                                            onPaginationChange: (updater) => {
                                                const nextPagination = typeof updater === "function" ? updater(pagination) : updater;
                                                setPaginationModel({ page: nextPagination.pageIndex, pageSize: nextPagination.pageSize });
                                            },
                                            onSortingChange: (updater) => {
                                                const nextSorting = typeof updater === "function" ? updater(sorting) : updater;
                                                setSortModel(nextSorting.map((item) => ({ field: item.id, sort: item.desc ? "desc" : "asc" })));
                                            },
                                            state: { pagination, sorting },
                                            muiTablePaperProps: { elevation: 0, className: "shift-table-grid-wrapper", sx: { backgroundColor: "#ffffff", boxShadow: "none", width: "100%", maxWidth: "100%", overflow: "hidden", "&:fullscreen": { width: "100%", height: "100%", maxWidth: "100%", backgroundColor: "#ffffff", display: "flex", flexDirection: "column" }, "&:fullscreen .MuiTableContainer-root": { flex: "1 1 auto", minHeight: 0, maxHeight: "none" } } },
                                            muiTableContainerProps: { sx: { maxHeight: "60vh", overflow: "auto", position: "relative", isolation: "isolate", scrollbarWidth: "auto", "&::-webkit-scrollbar": { width: "12px", height: "12px" }, "&::-webkit-scrollbar-track": { backgroundColor: "#e5e7eb" }, "&::-webkit-scrollbar-thumb": { backgroundColor: "#6b7280", borderRadius: "6px" }, "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "#374151" }, "& thead th": { paddingTop: "6px", paddingBottom: "6px" } } },
                                            muiTableProps: { className: "shift-data-grid", stickyHeader: true, sx: { minWidth: 1400, borderCollapse: "separate", borderSpacing: 0 } },
                                            muiTableHeadCellProps: { sx: { fontSize: "0.78rem", fontWeight: 700, color: "#ffffff", backgroundColor: "#111111", borderBottom: "none", whiteSpace: "nowrap", "& .Mui-TableHeadCell-Content": { color: "#ffffff" }, "& .MuiTableSortLabel-root": { color: "#ffffff !important", opacity: 1 }, "& .MuiTableSortLabel-root:hover": { color: "#ffffff !important" }, "& .MuiTableSortLabel-icon": { color: "#ffffff !important", opacity: 1, visibility: "visible" }, "& .MuiTableSortLabel-root.Mui-active .MuiTableSortLabel-icon": { color: "#ffffff !important", opacity: 1, visibility: "visible" }, "& .MuiButtonBase-root": { color: "#ffffff" } } },
                                            muiTableBodyRowProps: { hover: true, sx: { "&:hover": { backgroundColor: "#f3f4f6" } } },
                                            muiTableBodyCellProps: { sx: { whiteSpace: "nowrap" } }
                                        }}
                                    />
                                </Box>
                            </Box>
                            {historyShiftId !== null && <ShiftHistory shiftId={historyShiftId} shiftCode={historyShiftCode} onClose={handleCloseHistory} />}
                            <Dialog open={excelDialogOpen} onClose={() => setExcelDialogOpen(false)} fullWidth maxWidth="xl" sx={{ "& .MuiDialog-paper": { borderRadius: 2, overflow: "hidden", maxHeight: "90vh", display: "flex" } }}>
                                <DialogTitle sx={{ backgroundColor: "#111827", color: "#ffffff", fontWeight: 700, py: 2 }}>Excel Import Preview</DialogTitle>
                                <DialogContent sx={{ p: 2.5, backgroundColor: "#ffffff", overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
                                    <Typography variant="h6" sx={{ mb: 0, fontWeight: 700 }}>Valid Records ({excelValidRows.length})</Typography>
                                    <Table<Record<string, unknown>>
                                        data={excelValidRows}
                                        columns={excelPreviewColumns}
                                        getRowId={(row) => String(row.shiftCode ?? "")}
                                        emptyMessage="No valid records found"
                                        maxHeight="35vh"
                                        tableOptions={{ enableGlobalFilter: false, enableSorting: false, enableColumnActions: false, muiTablePaperProps: { elevation: 0, sx: { borderRadius: 0 } }, muiTableHeadCellProps: { sx: { backgroundColor: "#334155", color: "#ffffff", fontWeight: 700, whiteSpace: "nowrap" } }, muiTableContainerProps: { sx: { overflow: "auto", "&::-webkit-scrollbar": { width: 10, height: 10 }, "&::-webkit-scrollbar-thumb": { backgroundColor: "#94a3b8", borderRadius: 5 } } } }}
                                    />
                                    <Typography variant="h6" sx={{ mt: 1, mb: 0, fontWeight: 700 }}>Invalid Records ({excelInvalidRows.length})</Typography>
                                    <Table<Record<string, unknown>>
                                        data={excelInvalidRows.map((item) => ({
                                            rowNumber: item.rowNumber,
                                            ...item.data,
                                            reason: item.errors,
                                            invalidFields: item.errors.map((error) => {
                                                const lowerError = error.toLowerCase();
                                                if (lowerError.startsWith("duplicate shift code")) return "shiftCode";
                                                if (lowerError.startsWith("duplicate shift name")) return "shiftName";
                                                const field = error.split(":")[0].trim();
                                                return field.split(".")[0].split("[")[0].trim();
                                            })
                                        }))}
                                        columns={[
                                            {
                                                accessorKey: "reason", header: "Reason", size: 380, minSize: 320, enableSorting: false, Cell: ({ cell }) => {
                                                    const reasons = cell.getValue<string[]>();
                                                    return <Box sx={{ whiteSpace: "normal", minWidth: 280, py: 0.5 }}>{(Array.isArray(reasons) ? reasons : [String(reasons ?? "")]).map((reason, index) => <Typography key={`${index}-${reason}`} component="div" variant="body2" sx={{ lineHeight: 1.5 }}>{index + 1}. {reason}</Typography>)}</Box>;
                                                }
                                            }, ...excelPreviewColumns.map((column) => ({
                                                ...column,
                                                enableSorting: false,
                                                Cell: ({ row, cell }: { row: { original: Record<string, unknown> }; cell: { getValue: () => unknown } }) => {
                                                    const invalidFields = Array.isArray(row.original.invalidFields) ? row.original.invalidFields as string[] : [];
                                                    const isInvalid = invalidFields.some((field) => field.toLowerCase() === String(column.accessorKey).toLowerCase());
                                                    const cellValue = cell.getValue();
                                                    const value = column.accessorKey === "applicableDays" && Array.isArray(cellValue) ? cellValue.join(", ") : cellValue;
                                                    return <Box component="span" sx={{ display: "inline-block", backgroundColor: isInvalid ? "#fff0b3" : "transparent", color: "inherit", padding: isInvalid ? "2px 8px" : 0, borderRadius: "4px" }}>{String(value ?? "")}</Box>;
                                                }
                                            }))
                                        ]}
                                        getRowId={(row) => String(row.rowNumber ?? "")}
                                        emptyMessage="No incorrect records found"
                                        maxHeight="35vh"
                                        tableOptions={{ enableGlobalFilter: false, enableSorting: false, enableColumnActions: false, muiTablePaperProps: { elevation: 0, sx: { borderRadius: 0 } }, muiTableHeadCellProps: { sx: { backgroundColor: "#334155", color: "#ffffff", fontWeight: 700, whiteSpace: "nowrap" } }, muiTableContainerProps: { sx: { overflow: "auto", "&::-webkit-scrollbar": { width: 10, height: 10 }, "&::-webkit-scrollbar-thumb": { backgroundColor: "#94a3b8", borderRadius: 5 } } } }}
                                    />
                                </DialogContent>
                                <DialogActions sx={{ px: 2.5, py: 2, borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff", flexShrink: 0 }}>
                                    <Button variant="text" color="inherit" onClick={() => setExcelDialogOpen(false)}>Cancel</Button>
                                    <Button variant="contained" disabled={excelValidRows.length === 0} onClick={handleSaveExcelRows}>Save {excelValidRows.length} Valid Records</Button>
                                </DialogActions>
                            </Dialog>
                            <Dialog open={deleteDialogOpen} onClose={() => handleDelete(undefined, "cancel")} maxWidth="xs" fullWidth>
                                <DialogTitle>Confirm Delete</DialogTitle>
                                <DialogContent>
                                    <DialogContentText>Are you sure you want to delete shift <strong>{shiftToDelete?.shiftCode}</strong> ({shiftToDelete?.shiftName})?</DialogContentText>
                                </DialogContent>
                                <DialogActions sx={{ p: 2, gap: 1 }}>
                                    <Button variant="outlined" onClick={() => handleDelete(undefined, "cancel")}>Cancel</Button>
                                    <Button variant="contained" color="error" onClick={() => handleDelete(undefined, "confirm")} autoFocus>Yes, Delete</Button>
                                </DialogActions>
                            </Dialog>
                        </>
                    ) : (
                        <Dashboard />
                    )}
                </Box>
                {activePage === "dashboard" && !showForm && (
                    <Box onMouseEnter={() => setFabHovered(true)} onMouseLeave={() => setFabHovered(false)} sx={{ position: "fixed", right: 24, bottom: 24, zIndex: 1400, width: 44, height: 180 }}>
                        <Tooltip title="Download Excel" placement="left">
                            <IconButton aria-label="Download Excel" onClick={handleDownloadMenuOpen} className="fab-action" sx={{ position: "absolute", right: 0, bottom: 120, width: 44, height: 44, minWidth: 44, p: 0, borderRadius: "50%", color: "#fff", backgroundColor: "#16a34a", boxShadow: "0 3px 8px rgba(0,0,0,0.25)", opacity: fabHovered ? 1 : 0, visibility: fabHovered ? "visible" : "hidden", pointerEvents: fabHovered ? "auto" : "none", transform: fabHovered ? "translateY(0)" : "translateY(8px)", transition: "opacity 180ms ease, transform 180ms ease, background-color 180ms ease", "&:hover": { backgroundColor: "#15803d" } }}>
                                <FileDownloadOutlinedIcon />
                            </IconButton>
                        </Tooltip>
                        <Menu anchorEl={downloadMenuAnchor} open={Boolean(downloadMenuAnchor)} onClose={handleDownloadMenuClose} anchorOrigin={{ vertical: "top", horizontal: "left" }} transformOrigin={{ vertical: "bottom", horizontal: "right" }}>
                            <MenuItem onClick={() => { handleDownloadMenuClose(); void handleDownloadExcel(); }}>Export All Shift Data</MenuItem>
                            <MenuItem onClick={handleDownloadTemplate}>Download Excel Template</MenuItem>
                        </Menu>
                        <input ref={excelFileInputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={handleSelectExcelFile} />
                        <Tooltip title="Upload Excel" placement="left">
                            <IconButton aria-label="Upload Excel" onClick={() => excelFileInputRef.current?.click()} className="fab-action" sx={{ position: "absolute", right: 0, bottom: 60, width: 44, height: 44, minWidth: 44, p: 0, borderRadius: "50%", color: "#fff", backgroundColor: "#0284c7", boxShadow: "0 3px 8px rgba(0,0,0,0.25)", opacity: fabHovered ? 1 : 0, visibility: fabHovered ? "visible" : "hidden", pointerEvents: fabHovered ? "auto" : "none", transform: fabHovered ? "translateY(0)" : "translateY(8px)", transition: "opacity 180ms ease, transform 180ms ease, background-color 180ms ease", "&:hover": { backgroundColor: "#0369a1" } }}>
                                <FileUploadOutlinedIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Add Shift" placement="left">
                            <Button variant="contained" onClick={handleAddShift} className="dashboard-add-button" sx={{ position: "absolute", right: 0, bottom: 0, minWidth: 44, width: 44, height: 44, p: 0, borderRadius: "50%", backgroundColor: "#1976d2", color: "#fff", boxShadow: "0 3px 8px rgba(0,0,0,0.25)", "&:hover": { backgroundColor: "#1565c0" } }}>
                                <AddIcon />
                            </Button>
                        </Tooltip>
                    </Box>
                )}
                {activePage === "dashboard" && (
                    <Drawer anchor="right" open={showForm} onClose={handleBackToList} className="shift-form-drawer">
                        <div className="shift-form-drawer-content">
                            {editShiftId === null ? <ShiftForm onError={handleFormError} onSuccess={handleFormSuccess} onBack={handleBackToList} /> : <EditForm editShiftId={editShiftId} onError={handleFormError} onSuccess={handleFormSuccess} onBack={handleBackToList} />}
                        </div>
                    </Drawer>
                )}
            </Box>
        </Box>
    </>
    );
}
export default Activityboard;