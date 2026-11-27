import { Box, Card, CardContent, Typography } from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import NightlightIcon from "@mui/icons-material/Nightlight";

export type TileType = "total" | "active" | "inactive" | "night";

export type DashboardStatTilesProps = {
    total: number;
    active: number;
    inactive: number;
    night?: number;
    activeStatusFilter?: boolean;
    selectedTile?: TileType;
    onTileClick?: (type: TileType) => void;
};

export default function DashboardStatTiles({ total, active, inactive, night, activeStatusFilter, selectedTile, onTileClick}: DashboardStatTilesProps) {
    const tiles = [
        {   type: "total" as const,
            title: "Total Shifts",
            value: total,
            icon: <AccessTimeIcon sx={{ fontSize: 22 }} />,
            className: "summary-total",
            bgColor: "#042352",
            borderColor: "#042352",
            iconBg: "#f2f5f8",
            iconColor: "#121411"
        },
        {
            type: "active" as const,
            title: "Active Shifts",
            value: active,
            icon: <CheckCircleIcon sx={{ fontSize: 22 }} />,
            className: "summary-active",
            bgColor: "#0b8e14",
            borderColor: "#0b8e14",
            iconBg: "#eef5f1",
            iconColor: "#16a34a"
        },
        {
            type: "inactive" as const,
            title: "Inactive Shifts",
            value: inactive,
            icon: <CancelIcon sx={{ fontSize: 22 }} />,
            className: "summary-inactive",
            bgColor: "#ea0b0b",
            borderColor: "#ea0b0b",
            iconBg: "#fee2e2",
            iconColor: "#dc2626"
        },
        {
            type: "night" as const,
            title: "Night Shifts",
            value: night !== undefined ? night : (total ? `${((active / total) * 100).toFixed(1)}%` : "0%"),
            icon: <NightlightIcon sx={{ fontSize: 22 }} />,
            className: "summary-night",
            bgColor: "#3b0d64",
            borderColor: "#7e22ce",
            iconBg: "#fef3c7",
            iconColor: "#d97706"
        }
    ];

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: {  xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 2, mb: 2.5 }} >
            {tiles.map(tile => {
                const isSelected = selectedTile ? tile.type === selectedTile : (tile.type === "active" && activeStatusFilter === true);
                return (
                    <Card
                        key={tile.title}
                        elevation={0}
                        className={`summary-card ${tile.className}`}
                        onClick={() => onTileClick?.(tile.type)}
                        sx={{
                            cursor: onTileClick ? "pointer" : "default",
                            backgroundColor: `${tile.bgColor} !important`,
                            border: `1px solid ${tile.borderColor} !important`,
                            borderRadius: "10px !important",
                            minHeight: "96px",
                            boxShadow: isSelected? `0 0 0 3px #ffffff, 0 8px 20px rgba(0, 0, 0, 0.25) !important`: "0 3px 10px rgba(15, 23, 42, 0.08) !important",
                            transition: "transform 0.2s ease, box-shadow 0.2s ease !important",
                            "&:hover": onTileClick ? { transform: "translateY(-4px) !important", boxShadow: "0 8px 18px rgba(15, 23, 42, 0.2) !important" }: undefined
                        }}
                    >
                        <CardContent sx={{ p: "16px 20px !important", "&:last-child": { pb: "16px !important" } }} >
                            <Box className="summary-card-content" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 64 }} >
                                <Box>
                                    <Typography variant="body2" className="summary-card-title" sx={{ color: "#ffffff !important", fontWeight: 500, fontSize: "0.875rem",  mb: 0.5 }} >
                                        {tile.title}
                                    </Typography>
                                    <Typography  variant="h4"  className="summary-card-value"  sx={{ color: "#ffffff !important", fontWeight: 700, fontSize: "1.65rem",  lineHeight: 1.1  }}>
                                        {tile.value}
                                    </Typography>
                                </Box>
                                <Box className="summary-card-icon" sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 42,  height: 42,  borderRadius: "10px",  backgroundColor: `${tile.iconBg} !important`,  color: `${tile.iconColor} !important`}} >
                                    {tile.icon}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                );
            })}
        </Box>
    );
}
