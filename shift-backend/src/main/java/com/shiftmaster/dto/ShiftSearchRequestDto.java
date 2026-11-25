package com.shiftmaster.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@ToString
@NoArgsConstructor
public class ShiftSearchRequestDto {

    private String shiftCode;

    private String shiftName;

    @Schema(description = "Shift Types", allowableValues = {"General", "Morning", "Evening", "Night", "Rotational"})
    private List<String> shiftType;

    private Boolean nightShift;

    private Boolean status;

    private LocalDate createdDateFrom;

    private LocalDate createdDateTo;
}