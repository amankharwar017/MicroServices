package com.shiftmaster.util;

import com.shiftmaster.dto.ShiftRequestDto;
import com.shiftmaster.dto.ShiftSearchRequestDto;
import com.shiftmaster.entity.Shift;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ShiftUtil {

    private final ObjectMapper objectMapper;

    public BigDecimal calculateWorkingHours(LocalTime startTime, LocalTime endTime) {
        long minutes;
        if (endTime.isAfter(startTime)) {
            minutes = Duration.between(startTime, endTime).toMinutes();
        } else {
            minutes = Duration.between(startTime, LocalTime.MAX).toMinutes() + Duration.between(LocalTime.MIN, endTime).toMinutes() + 1;
        }
        return BigDecimal.valueOf(minutes).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
    }

    public void setApplicableDays(ShiftRequestDto request, Shift shift) {
        try {
            shift.setApplicableDays(objectMapper.writeValueAsString(request.getApplicableDays()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid applicable days");
        }
    }

    public Specification<Shift> createShiftSearchSpecification(ShiftSearchRequestDto request) {
        Specification<Shift> specification;
        specification = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(request.getShiftCode()))
                predicates.add(cb.like(cb.lower(root.get("shiftCode")), "%" + request.getShiftCode().toLowerCase() + "%"));
            if (StringUtils.hasText(request.getShiftName()))
                predicates.add(cb.like(cb.lower(root.get("shiftName")), "%" + request.getShiftName().toLowerCase() + "%"));
            if (request.getShiftType() != null && !request.getShiftType().isEmpty())
                predicates.add(root.get("shiftType").in(request.getShiftType().stream().map(String::toUpperCase).toList()));
            if (request.getCreatedDateFrom() != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), request.getCreatedDateFrom().atStartOfDay()));
            if (request.getCreatedDateTo() != null)
                predicates.add(cb.lessThan(root.get("createdAt"), request.getCreatedDateTo().plusDays(1).atStartOfDay()));
            if (request.getStatus() != null)
                predicates.add(cb.equal(root.<Boolean>get("status"), request.getStatus()));
            if (request.getNightShift() != null)
                predicates.add(cb.equal(root.<Boolean>get("nightShift"), request.getNightShift()));

            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return specification;
    }

}