import { useRef, useState, useEffect } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Box, Button, Card, CardContent, Chip, Grid, IconButton, Paper, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import NightlightIcon from "@mui/icons-material/Nightlight";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import TextField from "../../components/TextField";
import MultiselectAutoComplete from "../../components/MultiselectAutoComplete";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";
import { searchShifts } from "../shift-api";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch } from "../../redux/store";
import { fetchShiftDropdownOptions, selectFreshDropdownOptions, } from "../../redux/cacheSlice";

interface ShiftSearchFormProps {
  totalRows: number;
  refreshSummaryCounts: number;
  summaryCountsUpdate?: { version: number; activeDelta: number; inactiveDelta: number; nightDelta: number };
  onSearch: (searchData: Record<string, any>) => void;
  onFiltersChange?: (filters: SearchData, removeFilter: (key: string, value?: string) => void) => void;
  showSearchText?: boolean;
  dashboardLayout?: boolean;
}

type SearchData = Record<string, any>;

function ShiftSearchForm({ onSearch, onFiltersChange, totalRows, refreshSummaryCounts, summaryCountsUpdate, showSearchText = true, dashboardLayout = false }: ShiftSearchFormProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showMoreFilters, setShowMoreFilters] = useState(dashboardLayout);
  const [totalShifts, setTotalShifts] = useState(0);
  const [activeShifts, setActiveShifts] = useState(0);
  const [inactiveShifts, setInactiveShifts] = useState(0);
  const [nightShifts, setNightShifts] = useState(0);
  const [summaryMode, setSummaryMode] = useState<"beginning" | "date">("beginning");

  useEffect(() => {
    if (!summaryCountsUpdate || summaryCountsUpdate.version === 0) return;
    setActiveShifts(count => Math.max(0, count + summaryCountsUpdate.activeDelta));
    setInactiveShifts(count => Math.max(0, count + summaryCountsUpdate.inactiveDelta));
    setNightShifts(count => Math.max(0, count + summaryCountsUpdate.nightDelta));
    setTotalShifts(count => Math.max(0, count + summaryCountsUpdate.activeDelta + summaryCountsUpdate.inactiveDelta));
  }, [summaryCountsUpdate?.version]);

  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    void dispatch(fetchShiftDropdownOptions());
  }, [dispatch]);


  const dropdownOptions = useSelector(selectFreshDropdownOptions);

  const shiftTypeOptions = (dropdownOptions?.shiftTypes ?? [])
    .map(option => option.name)
    .filter(name => name.toLowerCase() !== "all");

  const nightShiftOptions = (dropdownOptions?.nightShiftOptions ?? []).map(
    option => ({
      label: option.name,
      value: option.name.toLowerCase() === "yes" ? "true" : option.name.toLowerCase() === "no" ? "false" : "all",
    })
  );

  const statusOptions = (dropdownOptions?.statusOptions ?? []).map(
    option => ({
      label: option.name,
      value: option.name.toLowerCase() === "active"? "true": option.name.toLowerCase() === "inactive" ? "false" : "all",
    })
  );
  const getDate = (daysAgo = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const initialFormData = {
    searchText: "",
    shiftType: [] as string[],
    nightShift: "all",
    status: true as boolean | null,
    createdDateFrom: getDate(7),
    createdDateTo: getDate()
  };

  const [formData, setFormData] = useState(initialFormData);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  useEffect(() => {
    let cancelled = false;
    const fetchSummaryCounts = async () => {
      try {
        const dateFilters: Record<string, string> = {};
        if (summaryMode === "date") {
          if (formData.createdDateFrom) dateFilters.createdDateFrom = formData.createdDateFrom;
          if (formData.createdDateTo) dateFilters.createdDateTo = formData.createdDateTo;
        }
        const [activeResponse, inactiveResponse, nightResponse] = await Promise.all([
          searchShifts({ ...dateFilters, status: true }, 0, 1, "id,asc"),
          searchShifts({ ...dateFilters, status: false }, 0, 1, "id,asc"),
          searchShifts({ ...dateFilters, nightShift: true }, 0, 1, "id,asc")
        ]);
        if (cancelled) return;
        const activeCount = activeResponse.data?.totalElements ?? 0;
        const inactiveCount = inactiveResponse.data?.totalElements ?? 0;
        setActiveShifts(activeCount);
        setInactiveShifts(inactiveCount);
        setTotalShifts(activeCount + inactiveCount);
        setNightShifts(nightResponse.data?.totalElements ?? 0);
      } catch (error) {
        console.error("Failed to fetch shift summary counts:", error);
      }
    };
    void fetchSummaryCounts();
    return () => {
      cancelled = true;
    };
  }, [refreshSummaryCounts, summaryMode, formData.createdDateFrom, formData.createdDateTo]);

  const filterLabels: Record<string, string> = {
    searchText: "Search",
    shiftCode: "Shift Code",
    shiftName: "Shift Name",
    shiftType: "Shift Type",
    status: "Status",
    nightShift: "Night Shift",
    overtimeAllowed: "Overtime",
    weeklyOff: "Weekly Off",
    createdDateFrom: "Created From",
    createdDateTo: "Created To",
    createdAtFrom: "Created From",
    createdAtTo: "Created To",
    startTime: "Start Time",
    endTime: "End Time",
    applicableDays: "Applicable Days"
  };

  const formatFilterValue = (value: unknown): string => {
    if (typeof value === "boolean") return value ? "Active" : "Inactive";
    if (Array.isArray(value)) return value.join(", ");
    if (value instanceof Set) return [...value].join(", ");
    return String(value);
  };

  const buildFilters = (data: typeof formData, mode = summaryMode): SearchData => {
    const filters: SearchData = {};
    if (data.searchText.trim()) filters.searchText = data.searchText.trim();
    if (mode === "date") {
      if (data.createdDateFrom) filters.createdDateFrom = data.createdDateFrom;
      if (data.createdDateTo) filters.createdDateTo = data.createdDateTo;
    }
    if (data.shiftType.length > 0) filters.shiftType = [...data.shiftType];
    if (data.nightShift !== "all") filters.nightShift = data.nightShift === "true";
    if (data.status !== null) filters.status = data.status;
    return filters;
  };

  const handleRemoveFilter = (key: string, value?: string) => {
    const nextFormData = { ...formDataRef.current };
    if (key === "shiftType" && value !== undefined) nextFormData.shiftType = nextFormData.shiftType.filter(type => type !== value);
    else if (key === "searchText") nextFormData.searchText = "";
    else if (key === "createdDateFrom") nextFormData.createdDateFrom = initialFormData.createdDateFrom;
    else if (key === "createdDateTo") nextFormData.createdDateTo = initialFormData.createdDateTo;
    else if (key === "nightShift") nextFormData.nightShift = "all";
    else if (key === "status") nextFormData.status = null;
    formDataRef.current = nextFormData;
    setFormData(nextFormData);
    const nextFilters = buildFilters(nextFormData);
    onFiltersChange?.(nextFilters, handleRemoveFilter);
    onSearch(nextFilters);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const today = getDate();
    if ((name === "createdDateFrom" || name === "createdDateTo") && value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value > today) return;
    const nextFormData = { ...formData, [name]: value };
    formDataRef.current = nextFormData;
    setFormData(nextFormData);
    onFiltersChange?.(buildFilters(nextFormData), handleRemoveFilter);
  };

  const handleDateChange = (name: "createdDateFrom" | "createdDateTo", value: Dayjs | null) => {
    const dateValue = value && value.isValid() ? value.format("YYYY-MM-DD") : "";
    const today = getDate();
    if (dateValue && dateValue > today) return;
    if (name === "createdDateTo" && dateValue && formDataRef.current.createdDateFrom && dateValue < formDataRef.current.createdDateFrom) return;
    const nextFormData = { ...formDataRef.current, [name]: dateValue };
    formDataRef.current = nextFormData;
    setFormData(nextFormData);
    onFiltersChange?.(buildFilters(nextFormData, "date"), handleRemoveFilter);
  };

  const lastSearchRef = useRef<string | null>(null);
  const searchIfChanged = (filters: SearchData) => {
    const key = JSON.stringify(filters);
    if (lastSearchRef.current === key) return;
    lastSearchRef.current = key;
    onSearch(filters);
  };
 const handleSearch = () => {
  if (formDataRef.current.createdDateFrom && formDataRef.current.createdDateTo && formDataRef.current.createdDateFrom > formDataRef.current.createdDateTo) return;
  const searchData = buildFilters(formDataRef.current, "date");
  const searchKey = JSON.stringify(searchData);
  if (lastSearchRef.current === searchKey) return;
  onFiltersChange?.(searchData, handleRemoveFilter);
  searchIfChanged(searchData);
  if (!dashboardLayout) setShowMoreFilters(false);
};


  const handleSummaryModeChange = (mode: "beginning" | "date") => {
    setSummaryMode(mode);
    const nextData = { ...formDataRef.current, status: true, nightShift: "all", shiftType: [] };
    formDataRef.current = nextData;
    setFormData(nextData);
    const nextFilters = buildFilters(nextData, mode);
    onFiltersChange?.(buildFilters(nextData, "date"), handleRemoveFilter);
    searchIfChanged(nextFilters);
  };

  const activeFilters = Object.entries(buildFilters(formData, "date"))
    .filter(([, value]) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0))
    .flatMap(([key, value]) => {
      const label = filterLabels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, letter => letter.toUpperCase());
      if (Array.isArray(value)) return value.map(item => ({ key, itemValue: String(item), label, value: String(item) }));
      return [{ key, label, value: formatFilterValue(value) }];
    });

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  };

  const handleReset = () => {
    const resetData = { ...initialFormData, createdDateFrom: getDate(7), createdDateTo: getDate() };
    const resetFilters = buildFilters(resetData, summaryMode);
    formDataRef.current = resetData;
    setFormData(resetData);
    selectedSummaryRef.current = "active";
    onFiltersChange?.(buildFilters(resetData, "date"), handleRemoveFilter);
    setShowMoreFilters(false);
    searchIfChanged(resetFilters);
  };

  const selectedSummaryRef = useRef<string>("active");
  const handleSummaryClick = (filter: "all" | "active" | "inactive" | "night") => {
    if (selectedSummaryRef.current === filter) return;
    selectedSummaryRef.current = filter;
    const nextFormData = { ...formDataRef.current, status: filter === "active" ? true : filter === "inactive" ? false : null, nightShift: filter === "night" ? "true" : "all" };
    formDataRef.current = nextFormData;
    setFormData(nextFormData);
    const displayFilters = buildFilters(nextFormData, "date");
    const apiFilters = buildFilters(nextFormData, summaryMode);
    onFiltersChange?.(displayFilters, handleRemoveFilter);
    searchIfChanged(apiFilters);
  };

  const updateFilter = (nextFormData: typeof formData) => {
    formDataRef.current = nextFormData;
    setFormData(nextFormData);
    onFiltersChange?.(buildFilters(nextFormData), handleRemoveFilter);
  };

  const handleClearSearch = () => {
    updateFilter({ ...formData, searchText: "" });
    searchInputRef.current?.focus();
  };

  const handleShiftTypeChange = (value: string | string[]) => {
    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const nextShiftTypes = selectedValues.includes("All") ? formData.shiftType.length === shiftTypeOptions.length ? [] : shiftTypeOptions : selectedValues.filter(type => shiftTypeOptions.includes(type));
    updateFilter({ ...formData, shiftType: nextShiftTypes });
  };

  const handleNightShiftChange = (value: string | string[]) => {
    updateFilter({ ...formData, nightShift: String(Array.isArray(value) ? value[0] ?? "all" : value) });
  };

  const handleStatusChange = (value: string | string[]) => {
    const selectedValue = Array.isArray(value) ? value[0] : value;
    updateFilter({ ...formData, status: selectedValue === "all" ? null : selectedValue === "true" });
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper className="dashboard-search-summary" elevation={1} sx={{ display: "flex", flexDirection: "column", gap: 0.5, alignItems: "stretch", width: "100%", p: 0.5, mb: 0.5, border: "1px solid #e2e8f0", borderRadius: "8px", backgroundColor: "#ffffff" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: dashboardLayout ? "1fr" : { xs: "1fr", lg: "1.2fr 1fr" }, gap: 2, alignItems: "start", width: "100%" }}>
          <Card elevation={0} className="shift-search-card" sx={{ backgroundColor: "#ffffff !important" }}>
            <CardContent
              className="shift-search-card-content"
              sx={{
                backgroundColor: "#ffffff !important",
                p: dashboardLayout ? "0 !important" : undefined
              }}
            >
              <Box className="shift-search-header">
                <Typography variant="h6" className="shift-search-title">Search Filters</Typography>
              </Box>
              <Card elevation={0} className="shift-search-card" sx={{ backgroundColor: "#ffffff !important", m: 0, p: 0 }}>
                <CardContent className="shift-search-card-content" sx={{ backgroundColor: "#ffffff !important", p: dashboardLayout ? "0 !important" : undefined }}>
                  <Box sx={{ display: dashboardLayout ? "grid" : "block", gridTemplateColumns: dashboardLayout ? "repeat(5, minmax(0, 1fr))" : undefined, gap: dashboardLayout ? 1.5 : undefined, alignItems: "end" }}>
                    <Box className="shift-search-fields" sx={{ position: "relative", display: dashboardLayout ? "contents" : undefined }} onKeyDown={handleKeyDown}>
                      {showSearchText && (
                        <TextField label="Shift Code / Shift Name" name="searchText" value={formData.searchText} onChange={handleChange} inputRef={searchInputRef} endIcon={formData.searchText ? (
                          <IconButton size="small" onClick={handleClearSearch} aria-label="Clear search">
                            <CloseIcon sx={{ color: "#041321" }} />
                          </IconButton>
                        ) : (
                          <SearchIcon onClick={() => searchInputRef.current?.focus()} sx={{ color: "#f8fcff", bgcolor: "#01070c", borderRadius: "50%", padding: "3px", cursor: "pointer" }} />
                        )} />
                      )}
                      <Box className="shift-search-date-field">
                        <Typography className="shift-search-date-label">From Date</Typography>
                        <DatePicker value={formData.createdDateFrom ? dayjs(formData.createdDateFrom) : null} onChange={value => handleDateChange("createdDateFrom", value)} maxDate={dayjs(getDate())} format="DD-MM-YYYY" slotProps={{ actionBar: { actions: ["today"] }, textField: { size: "small", fullWidth: true } }} />
                      </Box>
                      <Box className="shift-search-date-field">
                        <Typography className="shift-search-date-label">To Date</Typography>
                        <DatePicker value={formData.createdDateTo ? dayjs(formData.createdDateTo) : null} onChange={value => handleDateChange("createdDateTo", value)} minDate={formData.createdDateFrom ? dayjs(formData.createdDateFrom) : undefined} maxDate={dayjs(getDate())} format="DD-MM-YYYY" slotProps={{ actionBar: { actions: ["today"] }, textField: { size: "small", fullWidth: true } }} />
                      </Box>
                    </Box>
                    {showMoreFilters && (
                      <Box className="shift-search-more-filters" onKeyDown={handleKeyDown} sx={dashboardLayout ? { display: "contents" } : undefined}>
                        <MultiselectAutoComplete label="Shift Type" name="shiftType" value={formData.shiftType} multiple options={[
                          { label: "All", value: "All" },
                          ...shiftTypeOptions.map(type => ({ label: type, value: type }))
                        ]} onChange={handleShiftTypeChange} />
                        <Box className="shift-search-options" sx={{ display: "flex", gap: 1, flexWrap: "nowrap", minWidth: 0 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <MultiselectAutoComplete label="Night Shift" name="nightShift" value={formData.nightShift} multiple={false} disableClearable options={nightShiftOptions} onChange={handleNightShiftChange} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <MultiselectAutoComplete label="Status" name="status" value={formData.status === null ? "all" : formData.status ? "true" : "false"} multiple={false} disableClearable options={statusOptions} onChange={handleStatusChange} />
                          </Box>
                        </Box>
                      </Box>
                    )}
                    <Box
                      className="shift-search-actions"
                      sx={dashboardLayout ? {
                        gridColumn: "1 / -1",
                        display: "flex",
                        justifyContent: "flex-end !important"
                      } : undefined}
                    >
                      <Button variant="contained" onClick={handleSearch} className="shift-search-button">Search</Button>
                      {!dashboardLayout && (
                        <Box className="shift-search-more-filter-button">
                          <Button variant="text" startIcon={<FilterListIcon />} onClick={() => setShowMoreFilters(previous => !previous)}>{showMoreFilters ? "Hide Filters" : "More Filters"}</Button>
                        </Box>
                      )}
                      <Button type="button" variant="contained" size="small" onClick={handleReset} sx={{ backgroundColor: "#eab308", color: "#111827", "&:hover": { backgroundColor: "#ca8a04" }, fontSize: "0.7rem", minWidth: "auto", padding: "6px 12px" }}>Reset</Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
          <Box sx={{ minWidth: 0 }}>

            <Box sx={{ display: "flex", gap: 3, mb: 1, borderBottom: "1px solid #e2e8f0" }}>
              <Button onClick={() => handleSummaryModeChange("beginning")} sx={{ borderRadius: 0, textTransform: "none", fontWeight: summaryMode === "beginning" ? 700 : 500, color: summaryMode === "beginning" ? "#0f172a" : "#64748b", borderBottom: summaryMode === "beginning" ? "2px solid #1976d2" : "2px solid transparent" }}>Since Beginning</Button>
              <Button onClick={() => handleSummaryModeChange("date")} sx={{ borderRadius: 0, textTransform: "none", fontWeight: summaryMode === "date" ? 700 : 500, color: summaryMode === "date" ? "#0f172a" : "#64748b", borderBottom: summaryMode === "date" ? "2px solid #1976d2" : "2px solid transparent" }}>By Chosen Date</Button>
            </Box>

            <Grid container spacing={1} sx={{ marginBottom: 1 }}>
              {[
                { title: "Total Shifts", value: totalShifts, icon: <AccessTimeIcon />, className: "summary-total", filter: "all" as const },
                { title: "Active Shifts", value: activeShifts, icon: <CheckCircleIcon />, className: "summary-active", filter: "active" as const },
                { title: "Inactive Shifts", value: inactiveShifts, icon: <CancelIcon />, className: "summary-inactive", filter: "inactive" as const },
                { title: "Night Shifts", value: nightShifts, icon: <NightlightIcon />, className: "summary-night", filter: "night" as const }
              ].map(card => (
                <Grid size={{ xs: 12, sm: 6, md: dashboardLayout ? 3 : 6 }} key={card.title}>
                  <Card elevation={0} className={`summary-card ${card.className}`} onClick={() => handleSummaryClick(card.filter)} sx={{ cursor: "pointer" }}>
                    <CardContent>
                      <Box className="summary-card-content">
                        <Box>
                          <Typography variant="body2" className="summary-card-title">{card.title}</Typography>
                          <Typography variant="h4" className="summary-card-value">{card.value}</Typography>
                        </Box>
                        <Box className="summary-card-icon">{card.icon}</Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, px: 1.5, py: 1.25, width: "100%", boxSizing: "border-box", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "4px" }}>
          <FilterListIcon sx={{ color: "#64748b", fontSize: 19 }} />
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>Active Filters:</Typography>
          {activeFilters.length === 0 ? (
            <Typography sx={{ fontSize: "0.8rem", color: "#64748b", fontStyle: "italic" }}>All records showing (No filters active)</Typography>
          ) : activeFilters.map((filter, index) => (
            <Chip key={`${filter.key}-${filter.value}-${index}`} size="small" variant="outlined" label={`${filter.label}: ${filter.value}`} {...((filter.key === "createdDateFrom" && filter.value === initialFormData.createdDateFrom) || (filter.key === "createdDateTo" && filter.value === initialFormData.createdDateTo) ? {} : { onDelete: () => handleRemoveFilter(filter.key, "itemValue" in filter ? String(filter.itemValue) : undefined) })} sx={{ height: 25, fontSize: "0.73rem", backgroundColor: "#f8fafc", borderColor: "#cbd5e1", color: "#475569" }} />
          ))}
          <Typography sx={{ fontSize: "0.75rem", color: "#475569", whiteSpace: "nowrap", ml: "auto" }}>{totalRows} records found</Typography>
        </Box>
      </Paper>
    </LocalizationProvider>
  );
}

export default ShiftSearchForm;
