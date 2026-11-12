package com.shiftmaster.client;

import com.shiftmaster.dto.DropdownOptionsDto.DropdownOptionDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;
import java.util.Map;

@FeignClient(name = "master-service")
public interface DropdownClient {

    @GetMapping("/dropdown/days")
    Map<String, List<DropdownOptionDto>> getDays();

    @GetMapping("/dropdown/rules")
    Map<String, List<DropdownOptionDto>> getRules();

    @GetMapping("/dropdown/types")
    Map<String, List<DropdownOptionDto>> getTypes();
}