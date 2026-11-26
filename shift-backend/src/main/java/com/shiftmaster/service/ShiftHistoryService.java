package com.shiftmaster.service;

import com.shiftmaster.client.UserServiceClient;
import com.shiftmaster.dto.ShiftHistoryResponseDto;
import com.shiftmaster.dto.ShiftResponseDto;
import com.shiftmaster.dto.UserResponseDto;
import com.shiftmaster.entity.ShiftHistory;
import com.shiftmaster.repository.ShiftHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.core.JacksonException;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShiftHistoryService {

    private final ShiftHistoryRepository shiftHistoryRepository;
    private final ObjectMapper objectMapper;
    private final UserServiceClient userServiceClient;

    @Transactional
    public void recordHistory(Long shiftId, String shiftCode, String operation, ShiftResponseDto oldValues, ShiftResponseDto newValues) {
        ShiftHistory history = new ShiftHistory();
        history.setShiftId(shiftId);
        history.setShiftCode(shiftCode);
        history.setOperation(operation);
        try {
            history.setOldValues(oldValues == null ? null : objectMapper.writeValueAsString(oldValues));
            history.setNewValues(newValues == null ? null : objectMapper.writeValueAsString(newValues));
        } catch (JacksonException exception) {
            throw new IllegalStateException("Failed to serialize shift history", exception);
        }
        shiftHistoryRepository.save(history);
    }

    @Transactional(readOnly = true)
    public List<ShiftHistoryResponseDto> getHistory(Long shiftId) {
        return shiftHistoryRepository.findByShiftIdOrderByOperationAtDesc(shiftId).stream().map(this::toResponse).toList();
    }

    private ShiftHistoryResponseDto toResponse(ShiftHistory history) {
        ShiftHistoryResponseDto response = new ShiftHistoryResponseDto();
        response.setId(history.getId());
        response.setShiftId(history.getShiftId());
        response.setShiftCode(history.getShiftCode());
        response.setOperation(history.getOperation());
        response.setOperationAt(history.getOperationAt());
        try {
            if (history.getOldValues() != null) response.setOldValues(objectMapper.readValue(history.getOldValues(), ShiftResponseDto.class));
            if (history.getNewValues() != null) response.setNewValues(objectMapper.readValue(history.getNewValues(), ShiftResponseDto.class));
        } catch (JacksonException exception) {
            throw new IllegalStateException("Failed to read shift history", exception);
        }
        ShiftResponseDto auditValues = response.getNewValues() != null ? response.getNewValues() : response.getOldValues();
        if (auditValues != null) {
            Long createdBy = auditValues.getCreatedBy();
            Long updatedBy = auditValues.getUpdatedBy();
            String createdByUsername = resolveUsername(createdBy);
            response.setCreatedByUsername(createdByUsername);
            if (updatedBy != null) {
                response.setUpdatedByUsername(updatedBy.equals(createdBy) ? createdByUsername : resolveUsername(updatedBy));
            }
        }
        return response;
    }

    private String resolveUsername(Long userId) {
        if (userId == null) {
            return null;
        }
        try {
            UserResponseDto user = userServiceClient.getUserById(userId);
            return user != null ? user.getUsername() : null;
        } catch (Exception e) {
            log.warn("Failed to resolve username for userId {}", userId, e);
            return null;
        }
    }
}
