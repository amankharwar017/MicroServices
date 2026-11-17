package com.shiftmaster.controller;

import com.shiftmaster.dto.ApiResponseDto;
import com.shiftmaster.dto.ShiftHistoryResponseDto;
import com.shiftmaster.dto.ShiftRequestDto;
import com.shiftmaster.dto.ShiftResponseDto;
import com.shiftmaster.dto.ShiftSearchRequestDto;
import com.shiftmaster.service.DropdownService;
import com.shiftmaster.service.ShiftHistoryService;
import com.shiftmaster.service.ShiftNotificationService;
import com.shiftmaster.service.ShiftService;
import jakarta.validation.Valid;
import com.shiftmaster.dto.DropdownOptionsDto;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;


@RequiredArgsConstructor
@RestController
@RequestMapping("shift")
public class ShiftController {

    private final ShiftService shiftService;
    private final ShiftHistoryService shiftHistoryService;
    private final ShiftNotificationService shiftNotificationService;
    private final DropdownService dropdownService;

    @PostMapping("save-multiple")
    public ResponseEntity<ApiResponseDto> saveMultipleShifts(@RequestBody List<@Valid ShiftRequestDto> requests) {
        return shiftService.saveMultipleShifts(requests);
    }


    @DeleteMapping("delete/{shiftId}")
    public ResponseEntity<ApiResponseDto> deleteShift(@PathVariable Long shiftId) {
        return shiftService.deleteShift(shiftId);
    }

    @GetMapping("list")
    public ResponseEntity<Page<ShiftResponseDto>> getAllShifts(@ParameterObject @PageableDefault(page = 0, size = 10) Pageable pageable) {
        return ResponseEntity.ok(shiftService.getAllShifts(pageable));
    }

    @GetMapping("{id}")
    public ResponseEntity<ShiftResponseDto> getShiftById(@PathVariable Long id) {
        return ResponseEntity.ok(shiftService.getShiftById(id));
    }

    @PostMapping("search")
    public ResponseEntity<Page<ShiftResponseDto>> searchShifts(@ParameterObject @ModelAttribute ShiftSearchRequestDto request, @ParameterObject @PageableDefault(page = 0, size = 10) Pageable pageable) {
        return ResponseEntity.ok(shiftService.searchShifts(request, pageable));
    }

    @GetMapping("history/{shiftId}")
    public ResponseEntity<List<ShiftHistoryResponseDto>> getShiftHistory(@PathVariable Long shiftId) {
        return ResponseEntity.ok(shiftHistoryService.getHistory(shiftId));
    }

    @GetMapping("/notifications")
    public ResponseEntity<Map<String, Object>> getNotifications(@PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(shiftNotificationService.getNotificationData(pageable));
    }


    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<Map<String, String>> markNotificationAsRead(@PathVariable Long id) {
        shiftNotificationService.markAsRead(id);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PatchMapping("/notifications/read-all")
    public ResponseEntity<Map<String, String>> markAllNotificationsAsRead() {
        shiftNotificationService.markAllAsRead();
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @GetMapping("dropdown-options")
    public ResponseEntity<DropdownOptionsDto> getDropdownOptions() {
        return ResponseEntity.ok(dropdownService.getDropdownOptions());
    }


    @GetMapping("creation-trends")
    public ResponseEntity<List<Map<String, Object>>> getCreationTrends(@RequestParam String level) {
        return ResponseEntity.ok(shiftService.getCreationTrends(level));
    }


    @PostMapping("/internal/validate")
    public ResponseEntity<List<String>> validateShift(
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(shiftService.validateSingleShift(request));
    }

}