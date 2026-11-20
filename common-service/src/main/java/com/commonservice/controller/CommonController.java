
package com.commonservice.controller;

import com.commonservice.service.CommonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/common")
@RequiredArgsConstructor
public class CommonController {

    private final CommonService commonService;

    @GetMapping("/shift/template")
    public ResponseEntity<byte[]> downloadShiftTemplate() throws IOException {
        byte[] file = commonService.downloadShiftTemplate();
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Shift_Master_Template.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).body(file);
    }

    @PostMapping("/shift/validate-multiple")
    public ResponseEntity<List<Map<String, Object>>> validateMultipleShifts(@RequestBody List<Map<String, Object>> requests) {

        return ResponseEntity.ok(commonService.validateMultipleShifts(requests));
    }
}
