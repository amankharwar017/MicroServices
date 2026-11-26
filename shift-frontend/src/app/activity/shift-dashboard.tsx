import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isCancel } from "axios";
import { Alert, Box, CircularProgress, Typography, Stack, ToggleButton, ToggleButtonGroup, Card, IconButton, Tooltip, Chip, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ColumnChart from "../../components/ColumnChart";
import PieChart from "../../components/PieChart";
import GaugeChart from "../../components/GaugeChart";
import DashboardChartCard from "../../components/DashboardChartCard";
import DashboardStatTiles from "../../components/DashboardStatTiles";
import ShiftDrilldownDialog from "./ShiftDrilldownDialog";
import DashboardFilterBar from "./dashboard-filter";
import { getDashboardCounts, getShiftAnalytics, searchShifts, getCreationTrends } from "../shift-api";
import type { CreationTrendsResponse, ShiftTrendFilters } from "../shift-api";
import type { ShiftResponse } from "../../types/shift";
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


type TrendLevel = "yearly" | "monthly" | "weekly" | "daily";

function getTrendDateRange(period: string): { from: string; to: string } | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
        const formatted = dayjs(period).format("YYYY-MM-DD");
        return { from: formatted, to: formatted };
    }
    if (/^\d{4}-\d{2}$/.test(period)) {
        const month = dayjs(`${period}-01`);
        return { from: month.startOf("month").format("YYYY-MM-DD"), to: month.endOf("month").format("YYYY-MM-DD") };
    }
    if (/^\d{4}$/.test(period)) {
        const year = dayjs(`${period}-01-01`);
        return { from: year.startOf("year").format("YYYY-MM-DD"), to: year.endOf("year").format("YYYY-MM-DD") };
    }

    const weeklyMatch = /^(\d{4})-W(\d{2})$/.exec(period);
    if (weeklyMatch) {
        const year = Number(weeklyMatch[1]);
        const week = Number(weeklyMatch[2]);
        const fourthJanuary = dayjs(`${year}-01-04`);
        const firstIsoWeekStart = fourthJanuary.subtract((fourthJanuary.day() + 6) % 7, "day");
        const weekStart = firstIsoWeekStart.add(week - 1, "week");
        return { from: weekStart.format("YYYY-MM-DD"), to: weekStart.add(6, "day").format("YYYY-MM-DD") };
    }

    return null;
}

export default function ShiftDashboard() {
    const [engine, setEngine] = useState<ChartEngine>("recharts");
    const [analytics, setAnalytics] = useState<ShiftAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [summaryCounts, setSummaryCounts] = useState<{ total: number; active: number; inactive: number; night: number; } | null>(null);
    const dispatch = useDispatch<AppDispatch>();
    const dropdownOptions = useSelector(selectFreshDropdownOptions);
    const [filters, setFilters] = useState<ShiftDashboardFilters>(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<ShiftDashboardFilters>(defaultFilters);
    const [creationTrendsLevel, setCreationTrendsLevel] = useState<TrendLevel>("monthly");
    const [creationTrendsData, setCreationTrendsData] = useState<CreationTrendsResponse | null>(null);
    const [creationTrendsLoading, setCreationTrendsLoading] = useState(false);
    const [creationTrendsError, setCreationTrendsError] = useState<string | null>(null);
    const [weeklySelectedMonth, setWeeklySelectedMonth] = useState<string>("");
    const trendAbortRef = useRef<AbortController | null>(null);
    const [drilldown, setDrilldown] = useState<DrilldownPayload | null>(null);
    const [drilldownShifts, setDrilldownShifts] = useState<ShiftResponse[]>([]);
    const [drilldownLoading, setDrilldownLoading] = useState(false);
    const [drilldownOpen, setDrilldownOpen] = useState(false);
    const [drilldownTotalCount, setDrilldownTotalCount] = useState(0);
    const [drilldownPage, setDrilldownPage] = useState(0);
    const [drilldownPageSize, setDrilldownPageSize] = useState(10);
    const [drilldownSearchParams, setDrilldownSearchParams] = useState<Record<string, unknown>>({});
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        void dispatch(fetchShiftDropdownOptions());
    }, [dispatch]);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        (creationTrendsData?.trends ?? []).forEach(item => {
            if (/^\d{4}-\d{2}/.test(item.period)) {
                months.add(item.period.slice(0, 7));
            }
        });
        if (appliedFilters.createdDateFrom) {
            months.add(appliedFilters.createdDateFrom.slice(0, 7));
        }
        if (appliedFilters.createdDateTo) {
            months.add(appliedFilters.createdDateTo.slice(0, 7));
        }
        if (months.size === 0) {
            months.add(dayjs().format("YYYY-MM"));
        }
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [creationTrendsData, appliedFilters.createdDateFrom, appliedFilters.createdDateTo]);
    const currentMonth = useMemo(
        () => availableMonths[0] ?? dayjs().format("YYYY-MM"),
        [availableMonths]
    );

    const buildTrendFilters = useCallback((filterObj: ShiftDashboardFilters): ShiftTrendFilters => {
        const statusVal = filterObj.status.length === 1 ? filterObj.status[0] === "Active" : undefined;
        const nightShiftVal = filterObj.nightShift.length === 1 ? filterObj.nightShift[0] === "Yes" : undefined;
        return {
            shiftType: filterObj.shiftTypes.length ? filterObj.shiftTypes : undefined,
            status: statusVal,
            nightShift: nightShiftVal,
            createdDateFrom: filterObj.createdDateFrom || undefined,
            createdDateTo: filterObj.createdDateTo || undefined
        };
    }, []);

    // ---- API 2: Creation Trends ----
    const fetchCreationTrends = useCallback(async (
        level: TrendLevel,
        filterObj: ShiftDashboardFilters,
        signal: AbortSignal,
        month?: string
    ) => {
        setCreationTrendsLoading(true);
        setCreationTrendsError(null);
        const searchReq = buildTrendFilters(filterObj);
        if (level === "weekly" && month) {
            const [year, monthNum] = month.split("-").map(Number);
            const startOfMonth = dayjs().year(year).month(monthNum - 1).startOf("month");
            const endOfMonth = dayjs().year(year).month(monthNum - 1).endOf("month");
            searchReq.createdDateFrom = startOfMonth.format("YYYY-MM-DD");
            searchReq.createdDateTo = endOfMonth.format("YYYY-MM-DD");
        }
        try {
            const response = await getCreationTrends(level, searchReq, signal);
            if (signal.aborted) return;
            setCreationTrendsData(response.data);
        } catch (err) {
            if (!isCancel(err) && !signal.aborted) {
                setCreationTrendsError("Failed to load creation trends");
            }
        } finally {
            if (!signal.aborted) {
                setCreationTrendsLoading(false);
            }
        }
    }, [buildTrendFilters]);

    // ---- API 1: Dashboard Counts (tiles only) ----
    const fetchDashboardCounts = useCallback(async () => {
        try {
            const response = await getDashboardCounts();
            const data = response.data;
            setSummaryCounts({
                total: data.total,
                active: data.active,
                inactive: data.inactive,
                night: data.nightShift
            });
        } catch (err) {
            if (!isCancel(err)) {
                console.error("Failed to load dashboard counts:", err);
            }
        }
    }, []);

    // ---- API 3: Dashboard Analytics ----
    const fetchAnalytics = useCallback(async (activeFilters: ShiftDashboardFilters) => {
        try {
            const response = await getShiftAnalytics(
                activeFilters.createdDateFrom,
                activeFilters.createdDateTo
            );

            const data = response.data;

            const shiftsByType = Object.keys(data.shiftsByType ?? {}).map(name => ({
                name,
                count: data.shiftsByType[name] ?? 0,
                active: data.activeByType?.[name] ?? 0,
                inactive: data.inactiveByType?.[name] ?? 0
            }));

            const nightCount = data.nightShift ?? 0;
            const total = data.total ?? 0;

            setAnalytics(prev => ({
                total,
                active: data.active ?? 0,
                inactive: data.inactive ?? 0,
                shiftsByType,
                nightDistribution: [
                    { name: "Night Shift", count: nightCount },
                    { name: "Day Shift", count: total - nightCount }
                ],
                creationTrends: prev?.creationTrends ?? []
            }));
        } catch (err) {
            if (!isCancel(err)) {
                console.error("Failed to load analytics:", err);
            }
        }
    }, []);

    // Dashboard entry = 3 API calls: dashboard-counts + creation-trends + search
    const loadInitialDashboard = useCallback(async (activeFilters: ShiftDashboardFilters) => {
        setLoading(true);
        setFailed(false);

        try {
            await Promise.all([
                fetchDashboardCounts(),
                fetchAnalytics(activeFilters)
            ]);
        } catch (err) {
            if (!isCancel(err)) {
                console.error("Failed to load dashboard:", err);
                setFailed(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [fetchDashboardCounts, fetchAnalytics]);

    // Run the initial Dashboard load only once when this component is mounted.
    useEffect(() => {
        const def = defaultFilters();
        setFilters(def);
        setAppliedFilters(def);
        void loadInitialDashboard(def);

        return () => {
            abortControllerRef.current?.abort();
            trendAbortRef.current?.abort();
        };
    }, [loadInitialDashboard]);

    useEffect(() => {
        if (trendAbortRef.current) {
            trendAbortRef.current.abort();
        }
        const controller = new AbortController();
        trendAbortRef.current = controller;
        const month = creationTrendsLevel === "weekly" ? (weeklySelectedMonth || currentMonth) : undefined;
        void fetchCreationTrends(creationTrendsLevel, appliedFilters, controller.signal, month);
        return () => controller.abort();
    }, [creationTrendsLevel, appliedFilters, weeklySelectedMonth, currentMonth, fetchCreationTrends]);

    const handleApplyFilters = () => {
        const nextFilters = { ...filters };
        setLoading(true);
        setAppliedFilters(nextFilters);
        void fetchAnalytics(nextFilters).finally(() => { setLoading(false); });
    };

    const handleResetFilters = () => {
        const def = defaultFilters();
        setLoading(true);
        setFilters(def);
        setAppliedFilters(def);

        void fetchAnalytics(def).finally(() => { setLoading(false); });
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

        trendAbortRef.current?.abort();
        const trendController = new AbortController();
        trendAbortRef.current = trendController;
        const month = creationTrendsLevel === "weekly" ? (weeklySelectedMonth || currentMonth) : undefined;
        void fetchCreationTrends(creationTrendsLevel, def, trendController.signal, month);
    };

    // ----------------- Drilldown (View Table) with Server-Side Pagination -----------------
    const fetchDrilldownPage = useCallback(async (params: Record<string, unknown>, page: number, pageSize: number) => {
        setDrilldownLoading(true);
        try {
            const response = await searchShifts(params, page, pageSize, "id,asc");
            const pageData = response.data;
            setDrilldownShifts(pageData?.content ?? []);
            setDrilldownTotalCount(pageData?.totalElements ?? 0);
            setDrilldownPage(page);
            setDrilldownPageSize(pageSize);
        } catch (err) {
            if (!isCancel(err)) {
                console.error("Failed to fetch drilldown data:", err);
                setDrilldownShifts([]);
                setDrilldownTotalCount(0);
            }
        } finally {
            setDrilldownLoading(false);
        }
    }, []);

    const handleDrilldown = useCallback(async (payload: DrilldownPayload) => {
        setDrilldown(payload);
        setDrilldownShifts([]);
        setDrilldownOpen(true);

        const searchParams: Record<string, unknown> = {};

        // Carry forward applied date filters
        if (appliedFilters.createdDateFrom) searchParams.createdDateFrom = appliedFilters.createdDateFrom;
        if (appliedFilters.createdDateTo) searchParams.createdDateTo = appliedFilters.createdDateTo;

        if (payload.source === "status") {
            const isActive = String(payload.value).toLowerCase() === "active";
            searchParams.status = isActive;
        } else if (payload.source === "type") {
            searchParams.shiftType = [payload.value];
            if (payload.field === "active") {
                searchParams.status = true;
            } else if (payload.field === "inactive") {
                searchParams.status = false;
            }
        } else if (payload.source === "night") {
            const isNight = payload.value === "Night Shift";
            searchParams.nightShift = isNight;
        } else if (payload.source === "trends") {
            const dateRange = getTrendDateRange(String(payload.value ?? ""));
            if (dateRange) {
                searchParams.createdDateFrom = dateRange.from;
                searchParams.createdDateTo = dateRange.to;
            }
        }

        setDrilldownSearchParams(searchParams);
        // Start from page 0, default page size 10
        await fetchDrilldownPage(searchParams, 0, 10);
    }, [appliedFilters, fetchDrilldownPage]);

    const handleDrilldownPageChange = useCallback((page: number, pageSize: number) => {
        void fetchDrilldownPage(drilldownSearchParams, page, pageSize);
    }, [drilldownSearchParams, fetchDrilldownPage]);

    // ----------------- Format Table Data for Cards -----------------
    // 1. Shift Creation Trends Table Data
    const trendsTableData: TableBreakdownRow[] = useMemo(() => {
        return creationTrendsData?.trends?.map(item => ({ category: item.period, count: item.count })) ?? [];
    }, [creationTrendsData]);

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
                        <Chip label={`From: ${appliedFilters.createdDateFrom ? dayjs(appliedFilters.createdDateFrom).format("DD-MM-YYYY") : "Start"}  To: ${appliedFilters.createdDateTo ? dayjs(appliedFilters.createdDateTo).format("DD-MM-YYYY") : "Now"}`} size="small" sx={{ fontWeight: 600, bgcolor: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1" }} />
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
            {/* KPI Stat Tiles — counts from dashboard-counts API only */}
            <DashboardStatTiles
                total={summaryCounts?.total ?? 0}
                active={summaryCounts?.active ?? 0}
                inactive={summaryCounts?.inactive ?? 0}
                night={summaryCounts?.night ?? 0}
                activeStatusFilter={activeTileStatus}
                onTileClick={type => {
                    if (type === "total") {
                        void handleDrilldown({ source: "tile", title: "All Shifts", label: "Total", value: "total", count: summaryCounts?.total ?? 0 });
                    } else if (type === "active") {
                        void handleDrilldown({ source: "status", title: "Active Shifts", label: "Active", value: "Active", count: summaryCounts?.active ?? 0 });
                    } else if (type === "inactive") {
                        void handleDrilldown({ source: "status", title: "Inactive Shifts", label: "Inactive", value: "Inactive", count: summaryCounts?.inactive ?? 0 });
                    } else if (type === "night") {
                        void handleDrilldown({ source: "night", title: "Night Shift Records", label: "Night Shift", value: "Night Shift", count: summaryCounts?.night ?? 0 });
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
                    {/* Chart 1: Creation Trends - API Driven */}
                    <DashboardChartCard
                        title="Shift Creation Trends"
                        subtitle="Growth trajectory and timeline distribution"
                        tableColumns={[
                            { key: "category", label: "Period" },
                            { key: "count", label: "Shifts Created", isCount: true }
                        ]}
                        tableData={trendsTableData}
                        onCountClick={row => { void handleDrilldown({ source: "trends", title: `Shifts Created in ${row.category}`, label: String(row.category), value: String(row.category), count: Number(row.count ?? 0) }); }}
                    >
                        <Box sx={{ width: "100%" }}>
                            <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700, color: "text.secondary" }}> Granularity </Typography>
                                <ToggleButtonGroup size="small" exclusive value={creationTrendsLevel} onChange={(_, nextLevel: TrendLevel | null) => { if (nextLevel) setCreationTrendsLevel(nextLevel); }}>
                                    <ToggleButton value="yearly" sx={{ px: 1.5, py: 0.25, fontSize: "0.75rem" }}>Yearly</ToggleButton>
                                    <ToggleButton value="monthly" sx={{ px: 1.5, py: 0.25, fontSize: "0.75rem" }}>Monthly</ToggleButton>
                                    <ToggleButton value="weekly" sx={{ px: 1.5, py: 0.25, fontSize: "0.75rem" }}>Weekly</ToggleButton>
                                    <ToggleButton value="daily" sx={{ px: 1.5, py: 0.25, fontSize: "0.75rem" }}>Daily</ToggleButton>
                                </ToggleButtonGroup>
                                {creationTrendsLevel === "weekly" && (
                                    <FormControl size="small" sx={{ minWidth: 140 }}>
                                        <InputLabel sx={{ fontSize: "0.8rem" }}>Month</InputLabel>
                                        <Select value={weeklySelectedMonth || currentMonth} label="Month" sx={{ fontSize: "0.8rem" }} onChange={event => setWeeklySelectedMonth(event.target.value)}>
                                            {availableMonths.map(item => (
                                                <MenuItem key={item} value={item} sx={{ fontSize: "0.8rem" }}>
                                                    {dayjs(item).format("MMMM YYYY")}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                )}
                            </Box>
                            {creationTrendsLoading ? (
                                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 10 }}>
                                    <CircularProgress size={48} sx={{ color: "#17324d" }} />
                                </Box>
                            ) : creationTrendsError ? (
                                <Typography color="error" sx={{ textAlign: "center", py: 5 }}> {creationTrendsError} </Typography>
                            ) : !creationTrendsData?.trends?.length ? (
                                <Typography color="text.secondary" sx={{ textAlign: "center", py: 5 }}> No creation trend data available for the selected period. </Typography>
                            ) : (
                                <ColumnChart
                                    title="Shift Creation Trends"
                                    data={creationTrendsData.trends.map(t => ({ date: t.period, count: t.count }))}
                                    categoryField="date"
                                    valueFields={[{ field: "count", name: "Shifts", color: "#1976d2" }]}
                                    engine={engine}
                                    onBarClick={cat => { void handleDrilldown({ source: "trends", title: `Shifts Created in ${cat}`, label: cat, value: cat }); }}
                                />
                            )}
                        </Box>
                    </DashboardChartCard>
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2.5 }}>
                        {/* Chart 2: Shifts by Type — from search API data */}
                        <DashboardChartCard
                            title="Shifts by Type"
                            subtitle="Distribution across shift classifications"
                            tableColumns={[
                                { key: "category", label: "Shift Type" },
                                { key: "count", label: "Shift Count", isCount: true },
                                { key: "percentage", label: "Share" }
                            ]}
                            tableData={typeTableData}
                            onCountClick={row => { void handleDrilldown({ source: "type", title: `Shifts — ${row.category}`, label: String(row.category), value: String(row.category), count: Number(row.count ?? 0) }); }}
                        >
                            <ColumnChart
                                title="Shifts by Type"
                                data={analytics.shiftsByType.map(item => ({ category: item.name, count: item.count }))}
                                categoryField="category"
                                valueFields={[{ field: "count", name: "Shifts", color: "#2563eb" }]}
                                engine={engine}
                                onBarClick={cat => { void handleDrilldown({ source: "type", title: `Shifts — ${cat}`, label: cat, value: cat }); }}
                            />
                        </DashboardChartCard>
                        <DashboardChartCard
                            title="Overall Active Percentage"
                            subtitle="Active vs inactive shift ratio"
                            tableColumns={[{ key: "category", label: "Category" }, { key: "count", label: "Count", isCount: true }, { key: "percentage", label: "Percentage" }]}
                            tableData={statusTableData}
                            onCountClick={row => { void handleDrilldown({ source: "status", title: `${row.category} Shifts`, label: String(row.category), value: String(row.category), count: Number(row.count ?? 0) }); }}
                        >
                            <GaugeChart
                                title="Active Share"
                                value={analytics.total ? (analytics.active / analytics.total) * 100 : 0}
                                max={100}
                                suffix="% Active"
                                engine={engine}
                                onClick={() => { void handleDrilldown({ source: "status", title: "Active Shifts", label: "Active", value: "Active", count: analytics.active }); }}
                            />
                        </DashboardChartCard>
                        {/* Chart 4: Active vs Inactive by Shift Type — from search API data */}
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
                                void handleDrilldown({ source: "type", title: `${isTot ? "All" : isAct ? "Active" : "Inactive"} Shifts in ${row.category}`, label: String(row.category), value: String(row.category), field: isTot ? undefined : fieldKey, count: Number(row[fieldKey] ?? 0) });
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
                                onBarClick={(cat, field) => { void handleDrilldown({ source: "type", title: `${field === "inactive" ? "Inactive" : "Active"} Shifts in ${cat}`, label: cat, value: cat, field }); }}
                            />
                        </DashboardChartCard>
                        {/* Chart 5: Night Shift Distribution — from search API data */}
                        <DashboardChartCard
                            title="Night Shift Distribution"
                            subtitle="Night and day shift share"
                            tableColumns={[
                                { key: "category", label: "Category" },
                                { key: "count", label: "Shift Count", isCount: true },
                                { key: "percentage", label: "Share" }
                            ]}
                            tableData={nightTableData}
                            onCountClick={row => { void handleDrilldown({ source: "night", title: `${row.category} Records`, label: String(row.category), value: String(row.category), count: Number(row.count ?? 0) }); }}
                        >
                            <PieChart
                                title="Night Shift Distribution"
                                data={analytics.nightDistribution.map(item => ({
                                    category: item.name, count: item.count
                                }))}
                                categoryField="category"
                                valueField="count"
                                engine={engine}
                                onSliceClick={cat => { void handleDrilldown({ source: "night", title: `${cat} Records`, label: cat, value: cat }); }}
                            />
                        </DashboardChartCard>
                    </Box>
                </Box>
            ) : null}
            {/* Drilldown Records Dialog — with server-side pagination */}
            <ShiftDrilldownDialog
                open={drilldownOpen}
                onClose={() => setDrilldownOpen(false)}
                title={drilldown?.title ?? "Shift Records"}
                subtitle={drilldown ? `Filtered by ${drilldown.label}` : undefined}
                shifts={drilldownShifts}
                loading={drilldownLoading}
                totalCount={drilldownTotalCount}
                page={drilldownPage}
                pageSize={drilldownPageSize}
                onPageChange={handleDrilldownPageChange}
            />
        </>
    );
}