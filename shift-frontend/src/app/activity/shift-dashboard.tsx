import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isCancel } from "axios";
import { Alert, Box, CircularProgress, Typography, Stack, ToggleButton, ToggleButtonGroup, Card, IconButton, Tooltip, Chip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ColumnChart from "../../components/ColumnChart";
import PieChart from "../../components/PieChart";
import GaugeChart from "../../components/GaugeChart";
import DashboardChartCard from "../../components/DashboardChartCard";
import DashboardStatTiles from "../../components/DashboardStatTiles";
import DashboardFilterBar from "./dashboard-filter";
import ShiftDrilldownDialog from "../../components/ShiftDrilldownDialog";
import { getShiftDropdownOptions, getShiftList, searchShifts } from "../shift-api";
import type { ShiftDropdownOptionsResponse, ShiftResponse } from "../../types/shift";
import type { ChartEngine, TableBreakdownRow, DrilldownPayload, ShiftAnalytics } from "../../types/chartTypes";
import type { ShiftDashboardFilters } from "./dashboard-filter";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const defaultFilters = (): ShiftDashboardFilters => ({
    search: "",
    shiftTypes: [],
    status: [],
    nightShift: [],
    createdDateFrom: "",
    createdDateTo: ""
});

export default function ShiftDashboard() {
    const [engine, setEngine] = useState<ChartEngine>("recharts");
    const [analytics, setAnalytics] = useState<ShiftAnalytics | null>(null);
    const [allShifts, setAllShifts] = useState<ShiftResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [dropdownOptions, setDropdownOptions] = useState<ShiftDropdownOptionsResponse | null>(null);
    const [filters, setFilters] = useState<ShiftDashboardFilters>(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<ShiftDashboardFilters>(defaultFilters);
    const [drilldown, setDrilldown] = useState<DrilldownPayload | null>(null);
    const [drilldownShifts, setDrilldownShifts] = useState<ShiftResponse[]>([]);
    const [drilldownOpen, setDrilldownOpen] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const loadDropdownOptions = async () => {
            try {
                const res = await getShiftDropdownOptions();
                setDropdownOptions(res.data);
            } catch (err) {
                console.log("Failed to fetch shift dropdown options:", err);
            }
        };
        loadDropdownOptions();
    }, []);

    // Load Dashboard Data
    const fetchDashboardData = useCallback(async (activeFilters: ShiftDashboardFilters, _signal?: AbortSignal) => {
        setFailed(false);
        try {
            const statusVal = activeFilters.status.length === 1 ? activeFilters.status[0] === "Active" : undefined;
            const nightShiftVal = activeFilters.nightShift.length === 1 ? activeFilters.nightShift[0] === "Yes" : undefined;
            const countFilters: Record<string, unknown> = {};
            if (activeFilters.createdDateFrom) {
                countFilters.createdDateFrom = activeFilters.createdDateFrom;
            }
            if (activeFilters.createdDateTo) {
                countFilters.createdDateTo = activeFilters.createdDateTo;
            }
            if (activeFilters.shiftTypes && activeFilters.shiftTypes.length > 0) {
                countFilters.shiftType = activeFilters.shiftTypes;
            }
            const [activeResponse, inactiveResponse, nightResponse, totalResponse] = await Promise.all([
                searchShifts({ ...countFilters, status: true }, 0, 1, "id,asc"),
                searchShifts({ ...countFilters, status: false }, 0, 1, "id,asc"),
                searchShifts({ ...countFilters, nightShift: true }, 0, 1, "id,asc"),
                Object.keys(countFilters).length > 0 ? searchShifts(countFilters, 0, 1, "id,asc") : getShiftList(0, 1, "id,asc")
            ]);
            const activeCount = activeResponse.data?.totalElements ?? 0;
            const inactiveCount = inactiveResponse.data?.totalElements ?? 0;
            const totalCount = totalResponse.data?.totalElements ?? (activeCount + inactiveCount);
            const nightCount = nightResponse.data?.totalElements ?? 0;
            const searchParams: Record<string, unknown> = { ...countFilters };
            if (statusVal !== undefined) {
                searchParams.status = statusVal;
            }
            if (nightShiftVal !== undefined) {
                searchParams.nightShift = nightShiftVal;
            }
            const hasActiveFilter = Object.keys(searchParams).length > 0;
            let targetTotal = totalCount;
            if (statusVal !== undefined) {
                targetTotal = statusVal ? activeCount : inactiveCount;
            } else if (nightShiftVal !== undefined) {
                targetTotal = nightShiftVal ? nightCount : Math.max(0, totalCount - nightCount);
            }
            let shiftList: ShiftResponse[] = [];
            const fetchSize = Math.min(Math.max(targetTotal, 1), totalCount);
            if (targetTotal > 0) {
                const response = hasActiveFilter ? await searchShifts(searchParams, 0, fetchSize, "id,asc") : await getShiftList(0, fetchSize, "id,asc");
                shiftList = response.data?.content ?? [];
                const totalPages = response.data?.totalPages ?? 1;
                if (totalPages > 1 && shiftList.length < targetTotal) {
                    for (let page = 1; page < totalPages && page < 10; page++) {
                        const nextRes = hasActiveFilter ? await searchShifts(searchParams, page, fetchSize, "id,asc") : await getShiftList(page, fetchSize, "id,asc");
                        shiftList.push(...(nextRes.data?.content ?? []));
                    }
                }
            }
            setAllShifts(shiftList);
            // Group by creation trends (YYYY-MM-DD)
            const trendsMap = new Map<string, number>();
            shiftList.forEach(s => {
                if (s.createdAt) {
                    const dateStr = s.createdAt.slice(0, 10);
                    trendsMap.set(dateStr, (trendsMap.get(dateStr) ?? 0) + 1);
                }
            });

            // Group by Shift Type
            const typeMap = new Map<string, { name: string; count: number; active: number; inactive: number }>();
            shiftList.forEach(s => {
                const rawType = (s.shiftType || "Unspecified").trim().toLowerCase();
                const type = rawType.charAt(0).toUpperCase() + rawType.slice(1);

                const isActive = Boolean(s.status) && !Boolean(s.isDeleted);
                const entry = typeMap.get(type) ?? { name: type, count: 0, active: 0, inactive: 0 };
                entry.count += 1;
                if (isActive) entry.active += 1;
                else entry.inactive += 1;
                typeMap.set(type, entry);
            });
            const dayCount = Math.max(0, totalCount - nightCount);
            const computedAnalytics: ShiftAnalytics = {
                total: totalCount,
                active: activeCount,
                inactive: inactiveCount,
                creationTrends: Array.from(trendsMap.entries()).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
                shiftsByType: Array.from(typeMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
                nightDistribution: [{ name: "Night Shift", count: nightCount }, { name: "Day Shift", count: dayCount }]
            };
            setAnalytics(computedAnalytics);
        } catch (err) {
            if (!isCancel(err)) {
                console.error("Failed to load shift dashboard data:", err);
                setFailed(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        let ignore = false;
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;
        Promise.resolve().then(() => {
            if (!ignore) {
                void fetchDashboardData(appliedFilters, controller.signal);
            }
        });
        return () => { ignore = true; controller.abort(); };
    }, [fetchDashboardData, appliedFilters]);

    const handleApplyFilters = () => { setLoading(true); setAppliedFilters({ ...filters }); };

    const handleResetFilters = () => {
        setLoading(true);
        const def = defaultFilters();
        setFilters(def);
        setAppliedFilters(def);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        const def = defaultFilters();
        setFilters(def);
        setAppliedFilters(def);
        setDrilldown(null);
        setDrilldownOpen(false);
        getShiftDropdownOptions().then(res => setDropdownOptions(res.data)).catch(() => { });
        void fetchDashboardData(def);
    };

    // ----------------- Drilldown Click Handlers -----------------
    const handleDrilldown = useCallback((payload: DrilldownPayload) => {
        setDrilldown(payload);
        let filtered = [...allShifts];
        if (payload.source === "tile") {
            if (payload.value === "active") {
                filtered = filtered.filter(s => Boolean(s.status) && !Boolean(s.isDeleted));
            } else if (payload.value === "inactive") {
                filtered = filtered.filter(s => !Boolean(s.status) || Boolean(s.isDeleted));
            }
        } else if (payload.source === "status") {
            const isAct = String(payload.value).toLowerCase() === "active";
            filtered = filtered.filter(s => isAct ? Boolean(s.status) : !Boolean(s.status));
        } else if (payload.source === "type") {
            filtered = filtered.filter(s => (s.shiftType || "Unspecified") === payload.value);
            if (payload.field === "active") {
                filtered = filtered.filter(s => Boolean(s.status) && !Boolean(s.isDeleted));
            } else if (payload.field === "inactive") {
                filtered = filtered.filter(s => !Boolean(s.status) || Boolean(s.isDeleted));
            }
        } else if (payload.source === "night") {
            const isNight = payload.value === "Night Shift";
            filtered = filtered.filter(s => isNight ? Boolean(s.nightShift) : !Boolean(s.nightShift));
        } else if (payload.source === "trends") {
            const dateStr = String(payload.value ?? "");
            filtered = filtered.filter(s => s.createdAt && s.createdAt.startsWith(dateStr));
        }
        setDrilldownShifts(filtered);
        setDrilldownOpen(true);
    }, [allShifts]);

    // ----------------- Format Table Data for Cards -----------------
    // 1. Shift Creation Trends Table Data
    const trendsTableData: TableBreakdownRow[] = useMemo(() => {
        if (!analytics?.creationTrends) return [];
        return analytics.creationTrends.map(item => ({ category: item.month, count: item.count }));
    }, [analytics]);

    // 2. Shifts by Type Table Data
    const typeTableData: TableBreakdownRow[] = useMemo(() => {
        if (!analytics?.shiftsByType) return [];
        const totalShifts = analytics.total || 1;
        return analytics.shiftsByType.map(item => ({ category: item.name, count: item.count, percentage: `${((item.count / totalShifts) * 100).toFixed(1)}%` }));
    }, [analytics]);

    // 3. Active Share / Overall Status Table Data
    const statusTableData: TableBreakdownRow[] = useMemo(() => {
        if (!analytics) return [];
        const total = analytics.total || 1;
        return [
            { category: "Active", count: analytics.active, percentage: `${((analytics.active / total) * 100).toFixed(1)}%` },
            { category: "Inactive", count: analytics.inactive, percentage: `${((analytics.inactive / total) * 100).toFixed(1)}%` }
        ];
    }, [analytics]);

    // 4. Active vs Inactive by Shift Type Table Data
    const typeStatusTableData: TableBreakdownRow[] = useMemo(() => {
        if (!analytics?.shiftsByType) return [];
        return analytics.shiftsByType.map(item => ({ category: item.name, active: item.active, inactive: item.inactive, count: item.active + item.inactive }));
    }, [analytics]);

    // 5. Night Shift Distribution Table Data
    const nightTableData: TableBreakdownRow[] = useMemo(() => {
        if (!analytics?.nightDistribution) return [];
        const totalShifts = analytics.total || 1;
        return analytics.nightDistribution.map(item => ({ category: item.name, count: item.count, percentage: `${((item.count / totalShifts) * 100).toFixed(1)}%` }));
    }, [analytics]);

    // Active status filter for tile selection highlight
    const activeTileStatus = appliedFilters.status.length === 1 ? appliedFilters.status[0] === "Active" : undefined;

    return (
        <>
            {/* Top Bar matching reference */}
            <Card elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 2.5, borderRadius: 3, border: "1px solid #e2e8f0", background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)", display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { xs: "flex-start", md: "center" }, justifyContent: "space-between", gap: 2 }} >
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Box sx={{ width: 46, height: 46, borderRadius: 2.5, bgcolor: "#17324d", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(23, 50, 77, 0.25)" }}>
                        <AssessmentIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", letterSpacing: -0.5 }}>
                            Dashboard
                        </Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
                            Shift analytics, performance trends, and operational breakdown
                        </Typography>
                    </Box>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} useFlexGap sx={{ alignItems: { xs: "flex-start", sm: "center" }, flexWrap: "wrap" }} >
                    {/* Date badge */}
                    {(appliedFilters.createdDateFrom || appliedFilters.createdDateTo) ? (
                        <Chip label={`From: ${appliedFilters.createdDateFrom || "Start"}  To: ${appliedFilters.createdDateTo || "Now"}`} size="small" sx={{ fontWeight: 600, bgcolor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }} />
                    ) : (
                        <Chip label="All Time Records" size="small" sx={{ fontWeight: 600, bgcolor: "#f1f5f9", color: "#334155" }} />
                    )}

                    <Tooltip title="Refresh Dashboard">
                        <IconButton size="small" onClick={handleRefresh} sx={{ border: "1px solid #cbd5e1", bgcolor: "#ffffff", "&:hover": { bgcolor: "#f1f5f9" } }}>
                            <RefreshIcon sx={{ fontSize: 20, color: "#17324d", animation: refreshing ? "spin 1s linear infinite" : "none", "keyframes spin": { "100%": { transform: "rotate(360deg)" } } }} />
                        </IconButton>
                    </Tooltip>
                    {/* Chart Engine Switcher */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: { xs: "none", lg: "inline" } }}>
                            Engine:
                        </Typography>
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={engine}
                            onChange={(_, nextEngine: ChartEngine | null) => { if (nextEngine) setEngine(nextEngine); }}
                            sx={{ height: 34, bgcolor: "#ffffff", "& .MuiToggleButton-root": { px: 1.5, py: 0.5, fontSize: "0.75rem", fontWeight: 700, textTransform: "none", borderColor: "#cbd5e1" }, "& .Mui-selected": { bgcolor: "#17324d !important", color: "#ffffff !important" } }} >
                            <ToggleButton value="recharts">React Charts</ToggleButton>
                            <ToggleButton value="amcharts">AmCharts</ToggleButton>
                            <ToggleButton value="apexcharts">ApexCharts</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Stack>
            </Card>

            {/* Error Banner */}
            {failed && (<Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>Failed to load dashboard data. Please verify your connection or try again. </Alert>)}
            {/* KPI Stat Tiles */}
            <DashboardStatTiles
                total={analytics?.total ?? 0}
                active={analytics?.active ?? 0}
                inactive={analytics?.inactive ?? 0}
                night={analytics?.nightDistribution.find(d => d.name === "Night Shift")?.count ?? 0}
                activeStatusFilter={activeTileStatus}
                onTileClick={type => {
                    if (type === "total") {
                        const totalFilters = defaultFilters();
                        setFilters(totalFilters);
                        setAppliedFilters(totalFilters);
                    } else if (type === "active") {
                        const activeFilters = { ...defaultFilters(), status: ["Active"] };
                        setFilters(activeFilters);
                        setAppliedFilters(activeFilters);
                    } else if (type === "inactive") {
                        const inactiveFilters = { ...defaultFilters(), status: ["Inactive"] };
                        setFilters(inactiveFilters);
                        setAppliedFilters(inactiveFilters)
                    } else if (type === "night") {
                        const nightFilters = { ...defaultFilters(), nightShift: ["Yes"] };
                        setFilters(nightFilters);
                        setAppliedFilters(nightFilters);
                    }
                }}
            />
            {/* Search Filters Card */}
            <DashboardFilterBar
                filters={filters}
                appliedFilters={appliedFilters}
                setFilters={setFilters}
                setAppliedFilters={setAppliedFilters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
                optionsData={dropdownOptions}
            />
            {/* Loading Indicator */}
            {loading && !analytics ? (<Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10 }}><CircularProgress size={48} sx={{ color: "#17324d" }} /> </Box>
            ) : analytics ? (
                <Box sx={{ display: "grid", gap: 2.5 }}>
                    {/* Chart 1: Shift Creation Trends (Full width with Year/Month/Day Drilldown) */}
                    <DashboardChartCard
                        title="Shift Creation Trends"
                        subtitle="Growth trajectory and timeline distribution"
                        tableColumns={[{ key: "category", label: "Date / Period" }, { key: "count", label: "Shifts Created", isCount: true }]}
                        tableData={trendsTableData}
                        onCountClick={row => { handleDrilldown({ source: "trends", title: `Shifts Created on ${row.category}`, label: String(row.category), value: String(row.category), count: Number(row.count ?? 0) }); }}  >
                        <ColumnChart
                            title="Shift Creation Trends"
                            data={analytics.creationTrends}
                            categoryField="month"
                            valueFields={[{ field: "count", name: "Shifts", color: "#1976d2" }]}
                            drillDown
                            engine={engine}
                            onBarClick={cat => { handleDrilldown({ source: "trends", title: `Shifts Created on ${cat}`, label: cat, value: cat }); }}
                        />
                    </DashboardChartCard>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2.5 }}>
                        {/* Chart 2: Shifts by Type */}
                        <DashboardChartCard
                            title="Shifts by Type"
                            subtitle="Distribution across shift classifications"
                            tableColumns={[
                                { key: "category", label: "Shift Type" },
                                { key: "count", label: "Shift Count", isCount: true },
                                { key: "percentage", label: "Share" }
                            ]}
                            tableData={typeTableData}
                            onCountClick={row => { handleDrilldown({ source: "type", title: `Shifts — ${row.category}`, label: String(row.category), value: String(row.category), count: Number(row.count ?? 0) }); }}
                        >
                            <ColumnChart
                                title="Shifts by Type"
                                data={analytics.shiftsByType.map(item => ({ category: item.name, count: item.count }))}
                                categoryField="category"
                                valueFields={[{ field: "count", name: "Shifts", color: "#2563eb" }]}
                                engine={engine}
                                onBarClick={cat => { handleDrilldown({ source: "type", title: `Shifts — ${cat}`, label: cat, value: cat }); }}
                            />
                        </DashboardChartCard>
                        <DashboardChartCard
                            title="Overall Active Percentage"
                            subtitle="Active vs inactive shift ratio"
                            tableColumns={[{ key: "category", label: "Category" }, { key: "count", label: "Count", isCount: true }, { key: "percentage", label: "Percentage" }]}
                            tableData={statusTableData}
                            onCountClick={row => { handleDrilldown({ source: "status", title: `${row.category} Shifts`, label: String(row.category), value: String(row.category), count: Number(row.count ?? 0) }); }}
                        >
                            <GaugeChart
                                title="Active Share"
                                value={analytics.total ? (analytics.active / analytics.total) * 100 : 0}
                                max={100}
                                suffix="% Active"
                                engine={engine}
                                onClick={() => { handleDrilldown({ source: "status", title: "Active Shifts", label: "Active", value: "Active", count: analytics.active }); }}
                            />
                        </DashboardChartCard>
                        {/* Chart 4: Active vs Inactive by Shift Type */}
                        <DashboardChartCard
                            title="Active vs Inactive by Shift Type"
                            subtitle="Operational status distribution for each shift type"
                            tableColumns={[
                                { key: "category", label: "Shift Type" },
                                { key: "active", label: "Active", isCount: true },
                                { key: "inactive", label: "Inactive", isCount: true },
                                { key: "count", label: "Total Shifts", isCount: true }
                            ]}
                            tableData={typeStatusTableData}
                            onCountClick={(row, fieldKey) => {
                                const isAct = fieldKey === "active";
                                const isTot = fieldKey === "count";
                                handleDrilldown({ source: "type", title: `${isTot ? "All" : isAct ? "Active" : "Inactive"} Shifts in ${row.category}`, label: String(row.category), value: String(row.category), field: isTot ? undefined : fieldKey, count: Number(row[fieldKey] ?? 0) });
                            }}
                        >
                            <ColumnChart
                                title="Active vs Inactive by Shift Type"
                                data={analytics.shiftsByType.map(item => ({
                                    category: item.name,
                                    active: item.active,
                                    inactive: item.inactive
                                }))}
                                categoryField="category"
                                valueFields={[
                                    { field: "active", name: "Active", color: "#2e7d32" },
                                    { field: "inactive", name: "Inactive", color: "#d32f2f" }
                                ]}
                                stacked
                                engine={engine}
                                onBarClick={(cat, field) => { handleDrilldown({ source: "type", title: `${field === "inactive" ? "Inactive" : "Active"} Shifts in ${cat}`, label: cat, value: cat, field }); }}
                            />
                        </DashboardChartCard>
                        {/* Chart 5: Night Shift Distribution */}
                        <DashboardChartCard
                            title="Night Shift Distribution"
                            subtitle="Night and day shift share"
                            tableColumns={[
                                { key: "category", label: "Category" },
                                { key: "count", label: "Shift Count", isCount: true },
                                { key: "percentage", label: "Share" }
                            ]}
                            tableData={nightTableData}
                            onCountClick={row => { handleDrilldown({ source: "night", title: `${row.category} Records`, label: String(row.category), value: String(row.category), count: Number(row.count ?? 0) }); }}
                        >
                            <PieChart
                                title="Night Shift Distribution"
                                data={analytics.nightDistribution.map(item => ({
                                    category: item.name, count: item.count
                                }))}
                                categoryField="category"
                                valueField="count"
                                engine={engine}
                                onSliceClick={cat => { handleDrilldown({ source: "night", title: `${cat} Records`, label: cat, value: cat }); }}
                            />
                        </DashboardChartCard>
                    </Box>
                </Box>
            ) : null}
            {/* Drilldown Records Dialog */}
            <ShiftDrilldownDialog
                open={drilldownOpen}
                onClose={() => setDrilldownOpen(false)}
                title={drilldown?.title ?? "Shift Records"}
                subtitle={drilldown ? `Filtered by ${drilldown.label}` : undefined}
                shifts={drilldownShifts}
            />
        </>
    );
}
