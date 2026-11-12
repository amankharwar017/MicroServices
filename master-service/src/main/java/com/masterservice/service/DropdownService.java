package com.masterservice.service;

import com.masterservice.dto.DropdownOptionsDto.DropdownOptionDto;
import com.masterservice.repository.ApplicableDayOptionRepository;
import com.masterservice.repository.NightShiftOptionRepository;
import com.masterservice.repository.OvertimeOptionRepository;
import com.masterservice.repository.ShiftStatusOptionRepository;
import com.masterservice.repository.ShiftTypeOptionRepository;
import com.masterservice.repository.WeeklyOffOptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DropdownService {

    private final ApplicableDayOptionRepository applicableDayOptionRepository;
    private final NightShiftOptionRepository nightShiftOptionRepository;
    private final OvertimeOptionRepository overtimeOptionRepository;
    private final ShiftStatusOptionRepository shiftStatusOptionRepository;
    private final ShiftTypeOptionRepository shiftTypeOptionRepository;
    private final WeeklyOffOptionRepository weeklyOffOptionRepository;

    @Cacheable("dropdownDays")
    public Map<String, List<DropdownOptionDto>> getDays() {
        return Map.of("applicableDays", applicableDayOptionRepository.findAllByActiveTrue().stream().map(a -> new DropdownOptionDto(a.getId(), a.getName())).toList(),
                "weeklyOffs", weeklyOffOptionRepository.findAllByActiveTrue().stream().map(w -> new DropdownOptionDto(w.getId(), w.getName())).toList()
        );
    }

    @Cacheable("dropdownRules")
    public Map<String, List<DropdownOptionDto>> getRules() {
        return Map.of("nightShifts", nightShiftOptionRepository.findAllByActiveTrue().stream().map(n -> new DropdownOptionDto(n.getId(), n.getName())).toList(),
                "overtimes", overtimeOptionRepository.findAllByActiveTrue().stream().map(o -> new DropdownOptionDto(o.getId(), o.getName())).toList());
    }

    @Cacheable("dropdownTypes")
    public Map<String, List<DropdownOptionDto>> getTypes() {
        return Map.of("shiftTypes", shiftTypeOptionRepository.findAllByActiveTrue().stream().map(s -> new DropdownOptionDto(s.getId(), s.getName())).toList(),
                "shiftStatuses", shiftStatusOptionRepository.findAllByActiveTrue().stream().map(s -> new DropdownOptionDto(s.getId(), s.getName())).toList());
    }
}