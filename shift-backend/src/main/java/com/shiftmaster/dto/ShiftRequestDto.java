package com.shiftmaster.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
public class ShiftRequestDto {

    private Long id;

    @NotBlank(message = "Shift code is required")
    @Size(max = 20, message = "Shift code cannot exceed 20 characters")
    private String shiftCode;

    @NotBlank(message = "Shift name is required")
    @Size(max = 100, message = "Shift name cannot exceed 100 characters")
    private String shiftName;

    @Size(max = 150, message = "Display name cannot exceed 150 characters")
    private String displayName;

    @NotNull(message = "Shift type is required")
    @Schema(description = "Shift Type", allowableValues = {"General", "Morning", "Evening", "Night", "Rotational"}, example = "General")
    private String shiftType;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    private LocalTime breakStart;

    private LocalTime breakEnd;

    @Min(value = 0, message = "Grace in time cannot be negative")
    @Max(value = 999, message = "Grace in time cannot exceed 999 minutes")
    private Integer graceIn;

    @Min(value = 0, message = "Grace out time cannot be negative")
    @Max(value = 999, message = "Grace out time cannot exceed 999 minutes")
    private Integer graceOut;

    private boolean overtimeAllowed;

    private boolean nightShift;

    private boolean weeklyOff;

    @Pattern(regexp = "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", message = "Shift color must be a valid HEX color")
    private String shiftColor;

    private Set<DayOfWeek> applicableDays;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    private String attachment;

    @Size(max = 1000, message = "Remarks cannot exceed 1000 characters")
    private String remarks;

    @NotNull(message = "Status is required")
    private Boolean status;


}