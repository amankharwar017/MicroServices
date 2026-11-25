package com.shiftmaster.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
public class ShiftResponseDto implements Serializable {

    private Long id;
    private String shiftCode;
    private String shiftName;
    private String displayName;
    private String shiftType;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalTime breakStart;
    private LocalTime breakEnd;
    private BigDecimal workingHours;
    private Integer graceIn;
    private Integer graceOut;
    private boolean overtimeAllowed;
    private boolean nightShift;
    private boolean weeklyOff;
    private String shiftColor;
    private Set<DayOfWeek> applicableDays;
    private String description;
    private String attachment;
    private String remarks;
    private boolean status;
    @JsonProperty("isDeleted")
    private boolean isDeleted;
    private Long createdBy;
    private LocalDateTime createdAt;
    private Long updatedBy;
    private LocalDateTime updatedAt;

    
}