package com.shiftmaster.controller;

import com.shiftmaster.dto.ApiResponseDto;
import com.shiftmaster.dto.CreationTrendsDto;
import com.shiftmaster.dto.DropdownOptionsDto;
import com.shiftmaster.dto.ShiftAnalyticsDto;
import com.shiftmaster.dto.ShiftDashboardCountDto;
import com.shiftmaster.dto.ShiftHistoryResponseDto;
import com.shiftmaster.dto.ShiftRequestDto;
import com.shiftmaster.dto.ShiftResponseDto;
import com.shiftmaster.dto.ShiftSearchRequestDto;
import com.shiftmaster.service.DropdownService;
import com.shiftmaster.service.ShiftHistoryService;
import com.shiftmaster.service.ShiftNotificationService;
import com.shiftmaster.service.ShiftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

import java.time.LocalDate;
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

    @PreAuthorize("hasAnyRole('ADMIN')")
    @PostMapping("save-multiple")
    public ResponseEntity<ApiResponseDto> saveMultipleShifts(@RequestBody List<@Valid ShiftRequestDto> requests) {
        return shiftService.saveMultipleShifts(requests);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("delete/{shiftId}")
    public ResponseEntity<ApiResponseDto> deleteShift(@PathVariable Long shiftId) {
        return shiftService.deleteShift(shiftId);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @GetMapping("{id}")
    public ResponseEntity<ShiftResponseDto> getShiftById(@PathVariable Long id) {
        return ResponseEntity.ok(shiftService.getShiftById(id));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'USER')")
    @PostMapping("search")
    public ResponseEntity<Page<ShiftResponseDto>> searchShifts(@ParameterObject @ModelAttribute ShiftSearchRequestDto request, @ParameterObject @PageableDefault() Pageable pageable) {
        return ResponseEntity.ok(shiftService.searchShifts(request, pageable));
    }


    @GetMapping("history/{shiftId}")
    public ResponseEntity<List<ShiftHistoryResponseDto>> getShiftHistory(@PathVariable Long shiftId) {
        return ResponseEntity.ok(shiftHistoryService.getHistory(shiftId));
    }


    @GetMapping("/notifications")
    public ResponseEntity<Map<String, Object>> getNotifications(@PageableDefault() Pageable pageable) {
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
    public ResponseEntity<CreationTrendsDto> getCreationTrends(
            @RequestParam String granularity,
            ShiftSearchRequestDto filters) {
        return ResponseEntity.ok(shiftService.getCreationTrends(granularity, filters));
    }


    @PostMapping("/internal/validate")
    public ResponseEntity<List<String>> validateShift(
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(shiftService.validateSingleShift(request));
    }

    @GetMapping("/dashboard-counts")
    public ResponseEntity<ShiftDashboardCountDto> getDashboardCounts() {
        return ResponseEntity.ok(shiftService.getCounts());
    }

    @GetMapping("/analytics")
    public ResponseEntity<ShiftAnalyticsDto> getShiftAnalytics(
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo) {
        return ResponseEntity.ok(shiftService.getShiftAnalytics(dateFrom, dateTo));
    }

}
