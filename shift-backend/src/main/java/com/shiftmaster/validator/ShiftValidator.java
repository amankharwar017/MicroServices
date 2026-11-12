package com.shiftmaster.validator;

import com.shiftmaster.dto.ShiftRequestDto;
import com.shiftmaster.entity.Shift;
import com.shiftmaster.exception.ShiftCodeAlreadyPresentException;
import com.shiftmaster.exception.ShiftNameAlreadyPresentException;
import com.shiftmaster.repository.ShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ShiftValidator {
    private final ShiftRepository shiftRepository;

    public void validateShiftForSave(ShiftRequestDto request) {
        List<Shift> existingShifts = shiftRepository.findByShiftCodeOrShiftName(request.getShiftCode(), request.getShiftName());
        for (Shift shift : existingShifts) {
            if (StringUtils.hasText(shift.getShiftCode()) && shift.getShiftCode().equalsIgnoreCase(request.getShiftCode())) {
                throw new ShiftCodeAlreadyPresentException("Shift with code already exists");
            }
            if (StringUtils.hasText(shift.getShiftName()) && shift.getShiftName().equalsIgnoreCase(request.getShiftName())) {
                throw new ShiftNameAlreadyPresentException("Shift with Name already exists");
            }
        }
        validateStartAndBreakTime(request);
    }

    public void validateShiftForUpdate(Long id, ShiftRequestDto request) {
        List<Shift> existingShifts = shiftRepository.findByShiftCodeAndIdNotOrShiftNameAndIdNot(request.getShiftCode(), id, request.getShiftName(), id);
        for (Shift existingShift : existingShifts) {
            if (StringUtils.hasText(existingShift.getShiftCode()) && existingShift.getShiftCode().equalsIgnoreCase(request.getShiftCode())) {
                throw new ShiftCodeAlreadyPresentException("Shift with code already exists");
            }
            if (StringUtils.hasText(existingShift.getShiftName()) && existingShift.getShiftName().equalsIgnoreCase(request.getShiftName())) {
                throw new ShiftNameAlreadyPresentException("Shift with name already exists");
            }
        }
        validateStartAndBreakTime(request);
    }

    public void validateStartAndBreakTime(ShiftRequestDto request) {
        if (request.getStartTime().equals(request.getEndTime())) {
            throw new IllegalArgumentException("Start time and end time cannot be same");
        }
        if (request.getBreakStart() != null && request.getBreakEnd() != null && !request.getBreakEnd().isAfter(request.getBreakStart())) {
            throw new IllegalArgumentException("Break end time must be greater than break start time");
        }
    }
}
