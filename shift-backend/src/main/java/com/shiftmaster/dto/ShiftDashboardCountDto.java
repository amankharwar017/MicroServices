package com.shiftmaster.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftDashboardCountDto {
    private long total;
    private long active;
    private long inactive;
    private long nightShift;
    private List<ShiftTypeCountDto> shiftsByType;
    private List<NightDistributionDto> nightDistribution;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShiftTypeCountDto {
        private String name;
        private long count;
        private long active;
        private long inactive;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NightDistributionDto {
        private String name;
        private long count;
    }
}