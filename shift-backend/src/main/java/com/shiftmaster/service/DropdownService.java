package com.shiftmaster.service;

import com.shiftmaster.client.DropdownClient;
import com.shiftmaster.dto.DropdownOptionsDto;
import com.shiftmaster.dto.DropdownOptionsDto.DropdownOptionDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DropdownService {

    private final DropdownClient dropdownClient;

    public DropdownOptionsDto getDropdownOptions() {

        Map<String, List<DropdownOptionDto>> days = dropdownClient.getDays();
        Map<String, List<DropdownOptionDto>> rules = dropdownClient.getRules();
        Map<String, List<DropdownOptionDto>> types = dropdownClient.getTypes();

        return new DropdownOptionsDto(types.get("shiftTypes"), days.get("applicableDays"), rules.get("overtimes"), rules.get("nightShifts"), days.get("weeklyOffs"), types.get("shiftStatuses"));
    }
}