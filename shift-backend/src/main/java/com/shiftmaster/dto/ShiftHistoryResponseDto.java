package com.shiftmaster.dto;

import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
public class ShiftHistoryResponseDto {
    private Long id;
    private Long shiftId;
    private String shiftCode;
    private String operation;
    private LocalDateTime operationAt;
    private ShiftResponseDto oldValues;
    private ShiftResponseDto newValues;
    private String createdByUsername;
    private String updatedByUsername;
}