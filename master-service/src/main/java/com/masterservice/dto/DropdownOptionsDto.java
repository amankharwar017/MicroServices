package com.masterservice.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.io.Serializable;
import java.util.List;

@Getter
@AllArgsConstructor
public class DropdownOptionsDto implements Serializable {

    private List<DropdownOptionDto> applicableDays;
    private List<DropdownOptionDto> nightShifts;
    private List<DropdownOptionDto> overtimes;
    private List<DropdownOptionDto> shiftStatuses;
    private List<DropdownOptionDto> shiftTypes;
    private List<DropdownOptionDto> weeklyOffs;

    @Getter
    @AllArgsConstructor
    public static class DropdownOptionDto implements Serializable {

        private Long id;
        private String name;
    }
}
