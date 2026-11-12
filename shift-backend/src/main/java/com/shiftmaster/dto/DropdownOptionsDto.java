package com.shiftmaster.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DropdownOptionsDto {

    private List<DropdownOptionDto> shiftTypes;
    private List<DropdownOptionDto> applicableDays;
    private List<DropdownOptionDto> overtimeOptions;
    private List<DropdownOptionDto> nightShiftOptions;
    private List<DropdownOptionDto> weeklyOffOptions;
    private List<DropdownOptionDto> statusOptions;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DropdownOptionDto {

        private Long id;
        private String name;
    }
}