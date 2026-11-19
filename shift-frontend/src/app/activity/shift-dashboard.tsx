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
import ShiftDrilldownDialog from "../../components/ShiftDrilldownDialog";
import DashboardFilterBar from "./dashboard-filter";
import { getShiftList, searchShifts, getCreationTrends } from "../shift-api";
import type { ShiftDropdownOptionsResponse, ShiftResponse } from "../../types/shift";
import type { ChartEngine, TableBreakdownRow, DrilldownPayload, ShiftAnalytics } from "../../types/chartTypes";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../redux/store";
import { fetchShiftDropdownOptions, selectFreshDropdownOptions, } from "../../redux/cacheSlice";
import type { ShiftDashboardFilters } from "./dashboard-filter";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const defaultFilters = (): ShiftDashboardFilters => ({
    search: "",
    shiftTypes: [],
    status: [],
    nightShift: [],
    createdDateFrom: dayjs().subtract(7, "day").format("YYYY-MM-DD"),
    createdDateTo: dayjs().format("YYYY-MM-DD")
});

export default function ShiftDashboard() {
    const [engine, setEngine] = useState<ChartEngine>("recharts");
    const [analytics, setAnalytics] = useState<ShiftAnalytics | null>(null);
    const [allShifts, setAllShifts] = useState<ShiftResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [summaryCounts, setSummaryCounts] = useState<{ total: number; active: number; inactive: number; night: number; } | null>(null);
    const dispatch = useDispatch<AppDispatch>();
    const dropdownOptions = useSelector(selectFreshDropdownOptions);
    const [filters, setFilters] = useState<ShiftDashboardFilters>(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<ShiftDashboardFilters>(defaultFilters);
    const [trendLevel, setTrendLevel] = useState<"YEARLY" | "MONTHLY" | "WEEKLY" | "DAILY">("YEARLY");
    const [drilldown, setDrilldown] = useState<DrilldownPayload | null>(null);
    const [drilldownShifts, setDrilldownShifts] = useState<ShiftResponse[]>([]);
    const [drilldownOpen, setDrilldownOpen] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        void dispatch(fetchShiftDropdownOptions());
    }, [dispatch]);

    const fetchCreationTrends = async (level: "YEARLY" | "MONTHLY" | "WEEKLY" | "DAILY", dateFrom = appliedFilters.createdDateFrom, dateTo = appliedFilters.createdDateTo) => {
        const response = await getCreationTrends(level, dateFrom, dateTo);
        setTrendLevel(level);
        setAnalytics(prev => prev ? { ...prev, creationTrends: response.data ?? [] } : prev);
    };

    // Fetch the 3 summary APIs used when Dashboard is opened/refreshed.
    const fetchSummaryCounts = useCallback(async (activeFilters: ShiftDashboardFilters) => {
        const countFilters: Record<string, unknown> = {};

        if (activeFilters.shiftTypes && activeFilters.shiftTypes.length > 0) {
            countFilters.shiftType = activeFilters.shiftTypes;
        }

        const [activeResponse, inactiveResponse, nightResponse] = await Promise.all([
            searchShifts({ ...countFilters, status: true }, 0, 1, "id,asc"),
            searchShifts({ ...countFilters, status: false }, 0, 1, "id,asc"),
            searchShifts({ ...countFilters, nightShift: true }, 0, 1, "id,asc")
        ]);

        const active = activeResponse.data?.totalElements ?? 0;
        const inactive = inactiveResponse.data?.totalElements ?? 0;
        const night = nightResponse.data?.totalElements ?? 0;

        return {
            total: active + inactive,
            active,
            inactive,
            night
        };
    }, []);

    // One API call for the actual dashboard data.
    const fetchDashboardData = useCallback(async (activeFilters: ShiftDashboardFilters, _signal?: AbortSignal, summary?: { total: number; active: number; inactive: number; night: number }) => {
        setFailed(false);
        try {
            const statusVal = activeFilters.status.length === 1 ? activeFilters.status[0] === "Active" : undefined;
            const nightShiftVal = activeFilters.nightShift.length === 1 ? activeFilters.nightShift[0] === "Yes" : undefined;

            const searchParams: Record<string, unknown> = {};
            if (activeFilters.createdDateFrom) {
                searchParams.createdDateFrom = activeFilters.createdDateFrom;
            }
            if (activeFilters.createdDateTo) {
                searchParams.createdDateTo = activeFilters.createdDateTo;
            }
            if (activeFilters.shiftTypes && activeFilters.shiftTypes.length > 0) {
                searchParams.shiftType = activeFilters.shiftTypes;
            }
            if (statusVal !== undefined) {
                searchParams.status = statusVal;
            }
            if (nightShiftVal !== undefined) {
                searchParams.nightShift = nightShiftVal;
            }

            const hasActiveFilter = Object.keys(searchParams).length > 0;

            const fetchSize = summary?.total ?? 10;

            const response = hasActiveFilter
                ? await searchShifts(searchParams, 0, fetchSize, "id,asc")
                : await getShiftList(0, fetchSize, "id,asc");
            const shiftList: ShiftResponse[] = response.data?.content ?? [];
            setAllShifts(shiftList);

            const calculatedActive = shiftList.filter(s => Boolean(s.status) && !Boolean(s.isDeleted)).length;
            const calculatedInactive = shiftList.filter(s => !Boolean(s.status) || Boolean(s.isDeleted)).length;
            const calculatedNight = shiftList.filter(s => Boolean(s.nightShift)).length;

            const totalCount = response.data?.totalElements ?? shiftList.length;
            const activeCount = calculatedActive;
            const inactiveCount = calculatedInactive;
            const nightCount = calculatedNight;



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
                creationTrends: [],
                shiftsByType: Array.from(typeMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
                nightDistribution: [{ name: "Night Shift", count: nightCount }, { name: "Day Shift", count: dayCount }]
            };
            setAnalytics(prev => ({ ...computedAnalytics, creationTrends: prev?.creationTrends ?? [] }));
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

    // Dashboard entry = 3 summary APIs + 1 dashboard data API.
    const loadInitialDashboard = useCallback(async (activeFilters: ShiftDashboardFilters) => {
        setLoading(true);
        setFailed(false);
        try {
            const summary = await fetchSummaryCounts(activeFilters);
            setSummaryCounts(summary);
            await fetchDashboardData(activeFilters, undefined, summary);
            await fetchCreationTrends("YEARLY", activeFilters.createdDateFrom, activeFilters.createdDateTo);
        } catch (err) {
            if (!isCancel(err)) {
                console.error("Failed to load dashboard summary:", err);
                setFailed(true);
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [fetchSummaryCounts, fetchDashboardData]);

    // Run the initial Dashboard load only once when this component is mounted.
    useEffect(() => {
        const def = defaultFilters();
        setFilters(def);
        setAppliedFilters(def);
        void loadInitialDashboard(def);

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [loadInitialDashboard]);

    const handleApplyFilters = () => {
        const nextFilters = { ...filters };
        setLoading(true);
        setAppliedFilters(nextFilters);
        void fetchDashboardData(nextFilters, undefined, summaryCounts ?? undefined);
        void fetchCreationTrends(trendLevel, nextFilters.createdDateFrom, nextFilters.createdDateTo);
    };

    const handleResetFilters = () => {
        const def = defaultFilters();
        setLoading(true);
        setFilters(def);
        setAppliedFilters(def);
        void fetchDashboardData(def, undefined, summaryCounts ?? undefined);
        void fetchCreationTrends(trendLevel, def.createdDateFrom, def.createdDateTo);
    };

    const handleRefresh = () => {
        const def = defaultFilters();
        setRefreshing(true);
        setFilters(def);
        setAppliedFilters(def);
        setDrilldown(null);
        setDrilldownOpen(false);
        void dispatch(fetchShiftDropdownOptions());
        void loadInitialDashboard(def);
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
                total={summaryCounts?.total ?? 0}
                active={summaryCounts?.active ?? 0}
                inactive={summaryCounts?.inactive ?? 0}
                night={summaryCounts?.night ?? 0}
                activeStatusFilter={activeTileStatus}
                onTileClick={type => {
                    let nextFilters: ShiftDashboardFilters = { ...appliedFilters };
                    if (type === "total") nextFilters = { ...nextFilters, status: [], nightShift: [], shiftTypes: [], createdDateFrom: "", createdDateTo: "" };
                    else if (type === "active") nextFilters = { ...nextFilters, status: ["Active"], nightShift: [] };
                    else if (type === "inactive") nextFilters = { ...nextFilters, status: ["Inactive"], nightShift: [] };
                    else if (type === "night") nextFilters = { ...nextFilters, status: [], nightShift: ["Yes"] };
                    setLoading(true);
                    setFilters(nextFilters);
                    setAppliedFilters(nextFilters);
                    void fetchDashboardData(nextFilters, undefined, summaryCounts ?? undefined);
                    if (type === "total") void fetchCreationTrends("YEARLY", "", "");
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
                            onTrendLevelChange={fetchCreationTrends}
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
