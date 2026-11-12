package com.masterservice.controller;

import com.masterservice.dto.DropdownOptionsDto.DropdownOptionDto;
import com.masterservice.service.DropdownService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class DropdownController {

    private final DropdownService dropdownService;

    @GetMapping("/dropdown/days")
    public Map<String, List<DropdownOptionDto>> getDays() {
        return dropdownService.getDays();
    }

    @GetMapping("/dropdown/rules")
    public Map<String, List<DropdownOptionDto>> getRules() {
        return dropdownService.getRules();
    }

    @GetMapping("/dropdown/types")
    public Map<String, List<DropdownOptionDto>> getTypes() {
        return dropdownService.getTypes();
    }
}