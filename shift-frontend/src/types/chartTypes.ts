export type ChartEngine = "recharts" | "amcharts" | "apexcharts";

export type ChartValueField = {
    field: string;
    name: string;
    color?: string | number;
};

export type TableBreakdownRow = Record<string, string | number | boolean | null | undefined>;

export type DrilldownPayload = {
    source: "tile" | "trends" | "organization" | "status" | "type" | "night";
    title: string;
    label: string;
    value: string;
    count?: number;
    field?: string;
};

export type ShiftAnalytics = {
    total: number;
    active: number;
    inactive: number;
    creationTrends: { month: string; count: number }[];
    shiftsByType: { name: string; count: number; active: number; inactive: number }[];
    nightDistribution: { name: string; count: number }[];
};
