import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import TextField from "../../components/TextField";
import MultiselectAutoComplete from "../../components/MultiselectAutoComplete";
import dayjs from "dayjs";

export type ShiftDashboardFilters = {
    search?: string;
    shiftTypes: string[];
    status: string[];
    nightShift: string[];
    createdDateFrom: string;
    createdDateTo: string;
};

type Option = { id?: number | string; name: string };

type DashboardFilterBarProps = {
    filters: ShiftDashboardFilters;
    appliedFilters: ShiftDashboardFilters;
    setFilters: Dispatch<SetStateAction<ShiftDashboardFilters>>;
    setAppliedFilters: Dispatch<SetStateAction<ShiftDashboardFilters>>;
    onApply: () => void;
    onReset: () => void;
    optionsData: { shiftTypes?: Option[] } | null;
};

export default function DashboardFilterBar({
    filters,
    appliedFilters,
    setFilters,
    setAppliedFilters,
    onApply,
    onReset,
    optionsData
}: DashboardFilterBarProps) {
    const chips: { label: string; type: string; value?: string }[] = [];

    appliedFilters.shiftTypes.forEach(value => {
        chips.push({ label: `Shift Type: ${value}`, type: "shiftType", value });
    });

    appliedFilters.status.forEach(value => {
        chips.push({ label: `Status: ${value}`, type: "status", value });
    });

    appliedFilters.nightShift.forEach(value => {
        chips.push({ label: `Night Shift: ${value}`, type: "nightShift", value });
    });

    if (appliedFilters.createdDateFrom) {
        chips.push({ label: `From: ${appliedFilters.createdDateFrom}`, type: "createdDateFrom", value: appliedFilters.createdDateFrom });
    }

    if (appliedFilters.createdDateTo) {
        chips.push({ label: `To: ${appliedFilters.createdDateTo}`, type: "createdDateTo", value: appliedFilters.createdDateTo });
    }

    const today = dayjs().format("YYYY-MM-DD");
    const sevenDaysAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");
    const removeFilter = (type: string, value?: string) => {
        if (type === "shiftType") {
            const shiftTypes = appliedFilters.shiftTypes.filter(item => item !== value);
            setFilters(prev => ({ ...prev, shiftTypes }));
            setAppliedFilters(prev => ({ ...prev, shiftTypes }));
        }

        if (type === "status") {
            const status = appliedFilters.status.filter(item => item !== value);
            setFilters(prev => ({ ...prev, status }));
            setAppliedFilters(prev => ({ ...prev, status }));
        }

        if (type === "nightShift") {
            const nightShift = appliedFilters.nightShift.filter(item => item !== value);
            setFilters(prev => ({ ...prev, nightShift }));
            setAppliedFilters(prev => ({ ...prev, nightShift }));
        }

        if (type === "createdDateFrom") {
            setFilters(prev => ({ ...prev, createdDateFrom: "" }));
            setAppliedFilters(prev => ({ ...prev, createdDateFrom: "" }));
        }

        if (type === "createdDateTo") {
            setFilters(prev => ({ ...prev, createdDateTo: "" }));
            setAppliedFilters(prev => ({ ...prev, createdDateTo: "" }));
        }
    };

    return (
        <Paper elevation={0} sx={{ p: 2, mb: 2.5, border: "1px solid #e2e8f0", borderRadius: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2 }}>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Dashboard Filters</Typography>
                    <Typography variant="caption" color="text.secondary">Filter the dashboard and recalculate all cards, charts and tables.</Typography>
                </Box>
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }, gap: 2, "& .MuiInputLabel-root": { fontWeight: 700, color: "#17324d" } }}>
                <TextField
                    size="small"
                    type="date"
                    label="Created From"
                    name="createdDateFrom"
                    value={filters.createdDateFrom}
                    onChange={event => {
                        const value = event.target.value;
                        setFilters(prev => ({ ...prev, createdDateFrom: value }));
                    }}
                    slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                    size="small"
                    type="date"
                    label="Created To"
                    name="createdDateTo"
                    value={filters.createdDateTo}
                    onChange={event => { const value = event.target.value; setFilters(prev => ({ ...prev, createdDateTo: value })); setAppliedFilters(prev => ({ ...prev, createdDateTo: value })); }}
                    slotProps={{ inputLabel: { shrink: true } }}
                />
                <MultiselectAutoComplete
                    label="Shift Type"
                    name="shiftType"
                    value={filters.shiftTypes}
                    options={[{ label: "All", value: "All" }, ...(optionsData?.shiftTypes?.map(item => ({ label: item.name, value: item.name })) ?? [])]}
                    multiple
                    onChange={value => {
                        const selected = Array.isArray(value) ? value : [];
                        const allShiftTypes = optionsData?.shiftTypes?.map(item => item.name) ?? [];
                        setFilters(prev => ({ ...prev, shiftTypes: selected.includes("All") ? selected.length === allShiftTypes.length + 1 ? [] : allShiftTypes : selected }));
                    }}
                />
                <MultiselectAutoComplete
                    label="Status"
                    name="status"
                    value={filters.status}
                    options={[{ label: "Active", value: "Active" }, { label: "Inactive", value: "Inactive" }]}
                    multiple
                    onChange={value => { setFilters(prev => ({ ...prev, status: Array.isArray(value) ? value : [] })); }}
                />
                <MultiselectAutoComplete
                    label="Night Shift"
                    name="nightShift"
                    value={filters.nightShift}
                    options={[{ label: "Yes", value: "Yes" }, { label: "No", value: "No" }]}
                    multiple
                    onChange={value => { setFilters(prev => ({ ...prev, nightShift: Array.isArray(value) ? value : [] })); }}
                />
            </Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
                <Button size="small" variant="outlined" onClick={onReset} sx={{ textTransform: "none" }}>Reset</Button>
                <Button size="small" variant="contained" onClick={onApply} sx={{ textTransform: "none", bgcolor: "#17324d", "&:hover": { bgcolor: "#0f2032" } }}>Apply Filters</Button>
            </Box>
            {chips.length > 0 ? (
                <Paper elevation={0} sx={{ mt: 2, p: 1.5, border: "1px solid #e2e8f0", borderRadius: 3, bgcolor: "#fff" }}>
                    <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#17324d" }}>Applied Filters:</Typography>
                        {chips.map((chip, index) => (
                            <Chip key={`${chip.type}-${chip.value ?? index}`} size="small" label={chip.label} onDelete={() => removeFilter(chip.type, chip.value)} />
                        ))}
                    </Box>
                </Paper>
            ) : null}
        </Paper>
    );
}