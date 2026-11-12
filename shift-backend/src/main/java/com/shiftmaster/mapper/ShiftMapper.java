package com.shiftmaster.mapper;

import com.shiftmaster.dto.ShiftResponseDto;
import com.shiftmaster.entity.Shift;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.time.DayOfWeek;
import java.util.Collections;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class ShiftMapper {

    private final ObjectMapper objectMapper;

    public ShiftResponseDto toResponse(Shift shift) {
        ShiftResponseDto response = new ShiftResponseDto();
        BeanUtils.copyProperties(shift, response);
        response.setShiftType(shift.getShiftType());
        try {
            if (shift.getApplicableDays() != null) {
                response.setApplicableDays(objectMapper.readValue(shift.getApplicableDays(), new TypeReference<Set<DayOfWeek>>() {}));
            } else {
                response.setApplicableDays(Collections.emptySet());
            }
        } catch (Exception e) {
            response.setApplicableDays(Collections.emptySet());
        }
        return response;
    }
}