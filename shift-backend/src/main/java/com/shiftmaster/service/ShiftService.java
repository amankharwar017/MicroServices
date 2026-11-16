package com.shiftmaster.service;

import com.shiftmaster.dto.ApiResponseDto;
import com.shiftmaster.dto.ShiftRequestDto;
import com.shiftmaster.dto.ShiftResponseDto;
import com.shiftmaster.dto.ShiftSearchRequestDto;
import com.shiftmaster.entity.Shift;
import com.shiftmaster.mapper.ShiftMapper;
import com.shiftmaster.repository.ShiftRepository;
import com.shiftmaster.util.ShiftUtil;
import com.shiftmaster.validator.ShiftValidator;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.BeanUtils;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ShiftService {
    private final ShiftRepository shiftRepository;
    private final ShiftMapper shiftMapper;
    private final ShiftValidator shiftValidator;
    private final ShiftUtil shiftUtil;
    private final ShiftHistoryService shiftHistoryService;
    private final ObjectMapper objectMapper;
    private final Validator beanValidator;
    private final ShiftEmailService shiftEmailService;
    private final ShiftNotificationService shiftNotificationService;


    @Transactional
    @CacheEvict(value = "shiftList", allEntries = true)
    public ResponseEntity<ApiResponseDto> saveMultipleShifts(List<ShiftRequestDto> requests) {
        if (requests == null || requests.isEmpty())
            throw new IllegalArgumentException("At least one shift is required");
        List<ShiftResponseDto> savedShifts = requests.stream().map(request -> {
            boolean isNew = request.getId() == null;
            Shift shift = isNew ? new Shift() : shiftRepository.findById(request.getId()).orElseThrow(() -> new IllegalArgumentException("Shift not found with id: " + request.getId()));
            ShiftResponseDto oldValues = isNew ? null : shiftMapper.toResponse(shift);
            String operation = isNew ? "CREATE" : !oldValues.isStatus() && Boolean.TRUE.equals(request.getStatus()) ? "REACTIVATED" : "UPDATE";
            if (isNew)
                shiftValidator.validateShiftForSave(request);
            else
                shiftValidator.validateShiftForUpdate(request.getId(), request);
            BeanUtils.copyProperties(request, shift);
            if (Boolean.TRUE.equals(request.getStatus())) shift.setDeleted(false);
            shiftUtil.setApplicableDays(request, shift);
            shift.setWorkingHours(shiftUtil.calculateWorkingHours(request.getStartTime(), request.getEndTime()));
            Shift savedShift = shiftRepository.save(shift);
            ShiftResponseDto response = shiftMapper.toResponse(savedShift);
            shiftHistoryService.recordHistory(savedShift.getId(), savedShift.getShiftCode(), operation, oldValues, response);
            sendEmailAfterCommit(response, operation);
            String notificationTitle = "CREATE".equals(operation) ? "Shift Created" : "REACTIVATED".equals(operation) ? "Shift Reactivated" : "Shift Updated";
            String notificationMessage = "Shift " + savedShift.getShiftCode() + " (" + savedShift.getShiftName() + ") was " + ("CREATE".equals(operation) ? "created" : "REACTIVATED".equals(operation) ? "reactivated" : "updated") + " successfully.";
            shiftNotificationService.createNotification(notificationTitle, notificationMessage, operation, savedShift.getId());
            return response;
        }).toList();
        boolean hasUpdate = requests.stream().anyMatch(request -> request.getId() != null);
        String operation = requests.size() == 1 && hasUpdate && !savedShifts.get(0).isStatus() ? "UPDATE" : requests.size() == 1 && hasUpdate && savedShifts.get(0).isStatus() ? "REACTIVATED" : "UPDATE";
        if (requests.size() == 1 && hasUpdate) {
            return ResponseEntity.ok(new ApiResponseDto(HttpStatus.OK.value(), "REACTIVATED".equals(operation) ? "Shift reactivated successfully" : "Shift updated successfully"));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiResponseDto(HttpStatus.CREATED.value(), savedShifts.size() + " shifts saved successfully"));
    }


    @Transactional
    @CacheEvict(value = "shiftList", allEntries = true)
    public ResponseEntity<ApiResponseDto> deleteShift(Long id) {
        Shift shift = shiftRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Shift not found with id: " + id));
        if (shift.isDeleted()) throw new IllegalArgumentException("Shift is already deleted");
        ShiftResponseDto oldValues = shiftMapper.toResponse(shift);
        shift.setStatus(false);
        Shift deletedShift = shiftRepository.save(shift);
        shiftHistoryService.recordHistory(deletedShift.getId(), deletedShift.getShiftCode(), "DELETE", oldValues, shiftMapper.toResponse(deletedShift));
        sendEmailAfterCommit(shiftMapper.toResponse(deletedShift), "DELETE");
        shiftNotificationService.createNotification("Shift Deleted", "Shift " + deletedShift.getShiftCode() + " (" + deletedShift.getShiftName() + ") was deactivated successfully.", "DELETE", deletedShift.getId());
        return ResponseEntity.ok(new ApiResponseDto(HttpStatus.OK.value(), "Shift deactivated and deleted successfully with id: " + id));
    }

    private void sendEmailAfterCommit(ShiftResponseDto shift, String operation) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                shiftEmailService.sendShiftNotification(shift, operation);
            }
        });
    }

    @Cacheable(value = "shiftList", key = "#pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort.toString()")
    public Page<ShiftResponseDto> getAllShifts(Pageable pageable) {
        Page<Shift> shifts = shiftRepository.findAll(pageable);
        return shifts.map(shiftMapper::toResponse);
    }

    @Cacheable(value = "shiftById", key = "#id")
    public ShiftResponseDto getShiftById(Long id) {
        Shift shift = shiftRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Shift not found with id: " + id));
        return shiftMapper.toResponse(shift);
    }

    @Cacheable(value = "shiftList", key = "#request.toString() + '-' + #pageable.pageNumber + '-' + #pageable.pageSize + '-' + #pageable.sort.toString()")
    public Page<ShiftResponseDto> searchShifts(ShiftSearchRequestDto request, Pageable pageable) {
        Page<Shift> shifts = shiftRepository.findAll(shiftUtil.createShiftSearchSpecification(request), pageable);
        return shifts.map(shiftMapper::toResponse);
    }

    public List<String> validateSingleShift(Map<String, Object> row) {
        Set<String> errors = new LinkedHashSet<>();

        if (row == null) {
            errors.add("Record: Record is required");
            return new ArrayList<>(errors);
        }
        String shiftCode = row.get("shiftCode") == null ? "" : String.valueOf(row.get("shiftCode")).trim();
        String shiftName = row.get("shiftName") == null ? "" : String.valueOf(row.get("shiftName")).trim();

        if (!shiftCode.isEmpty() || !shiftName.isEmpty()) {
            List<Shift> existingShifts = shiftRepository.findByShiftCodeOrShiftName(shiftCode.isEmpty() ? null : shiftCode, shiftName.isEmpty() ? null : shiftName);
            for (Shift existing : existingShifts) {
                if (!shiftCode.isEmpty() && existing.getShiftCode() != null && existing.getShiftCode().equalsIgnoreCase(shiftCode)) {
                    errors.add("shiftCode: Shift with code already exists in database");
                }
                if (!shiftName.isEmpty() && existing.getShiftName() != null && existing.getShiftName().equalsIgnoreCase(shiftName)) {
                    errors.add("shiftName: Shift with name already exists in database");
                }
            }
        }

        try {
            ShiftRequestDto request = objectMapper.convertValue(row, ShiftRequestDto.class);
            Set<ConstraintViolation<ShiftRequestDto>> violations = beanValidator.validate(request);
            for (ConstraintViolation<ShiftRequestDto> violation : violations) {
                errors.add(violation.getPropertyPath() + ": " + violation.getMessage());
            }
            if (request.getStartTime() != null && request.getEndTime() != null) {
                try {
                    shiftValidator.validateStartAndBreakTime(request);
                } catch (IllegalArgumentException exception) {
                    String message = exception.getMessage();
                    if ("Start time and end time cannot be same".equals(message)) {
                        errors.add("startTime: " + message);
                        errors.add("endTime: " + message);
                    } else {
                        errors.add("breakStart: " + message);
                        errors.add("breakEnd: " + message);
                    }
                }
            }
        } catch (RuntimeException exception) {
            errors.add("Backend validation: Invalid field format or value");
        }
        return new ArrayList<>(errors);
    }



}

