package com.shiftmaster.dto;

import java.util.Map;

public record ShiftAnalyticsDto(
        long total,
        long active,
        long inactive,
        long nightShift,
        Map<String, Long> shiftsByType,
        Map<String, Long> activeByType,
        Map<String, Long> inactiveByType
) {}