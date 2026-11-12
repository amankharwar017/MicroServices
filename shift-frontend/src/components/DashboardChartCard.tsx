import { useState } from "react";
import type { ReactNode } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import type { MRT_ColumnDef } from "material-react-table";
import type { TableBreakdownRow } from "../types/chartTypes";
import Table from "./Table";

type TableColumn = {
    key: string;
    label: string;
    isCount?: boolean;
};

type DashboardChartCardProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    tableColumns?: TableColumn[];
    tableData?: TableBreakdownRow[];
    onCountClick?: (row: TableBreakdownRow, fieldKey: string) => void;
};

export default function DashboardChartCard({ title, subtitle, children, tableColumns = [], tableData = [], onCountClick}: DashboardChartCardProps) {
    const [showTable, setShowTable] = useState(false);
    const columns: MRT_ColumnDef<TableBreakdownRow>[] = tableColumns.map(column => ({
        accessorKey: column.key,
        header: column.label,
        Cell: ({ row }) => {
            const value = row.original[column.key];
            const numericValue = Number(value ?? 0);
            const clickable = Boolean(column.isCount && onCountClick && numericValue > 0);
            if (clickable) {
                return (
                    <Button size="small" onClick={() => onCountClick?.(row.original, column.key)} sx={{ minWidth: 0, p: 0, textTransform: "none", fontWeight: 800 }} >
                        {String(value ?? 0)}
                    </Button>
                );
            }
            return String(value ?? "-");
        }
    }));

    return (
        <Paper elevation={0} sx={{ border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden", minWidth: 0 }} >
            <Box sx={{ px: 2.25, pt: 2, pb: 1.25, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }} >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1"sx={{ fontWeight: 800, color: "#0f172a"}} > {title}
                    </Typography>
                    {subtitle ? ( <Typography variant="caption" sx={{ color: "text.secondary" }}> {subtitle}</Typography>) : null}
                </Box>
                {tableColumns.length > 0 ? (
                    <Button size="small" variant="text" onClick={() => setShowTable(value => !value)} sx={{ textTransform: "none",fontWeight: 700, flexShrink: 0 }} >
                        {showTable ? "Hide Table" : "View Table"}
                    </Button>
                ) : null}
            </Box>
            {showTable && tableColumns.length > 0 ? (
                <Box sx={{ borderTop: "1px solid #e2e8f0" }}>
                    <Table
                        data={tableData}
                        columns={columns}
                        enablePagination={true}
                        maxHeight={300}
                        emptyMessage="No data available"
                    />
                </Box>
            ) : (
                <Box sx={{ px: 1.5, pb: 1.5 }}> {children} </Box>
            )}
        </Paper>
    );
}