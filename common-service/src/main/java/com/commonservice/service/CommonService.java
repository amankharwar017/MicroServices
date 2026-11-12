
package com.commonservice.service;

import com.commonservice.client.ShiftFeignClient;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class CommonService {

    private final ShiftFeignClient shiftFeignClient;

    public byte[] downloadShiftTemplate() throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
             Sheet sheet = workbook.createSheet("Shift Template");

            Row headerRow = sheet.createRow(0);
            String[] headers = {
                    "shiftCode", "shiftName", "displayName", "shiftType", "startTime", "endTime", "breakStart", "breakEnd",
                    "graceIn", "graceOut", "overtimeAllowed", "nightShift", "weeklyOff", "shiftColor", "applicableDays", "description", "attachment", "remarks", "status"
            };

            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
                sheet.autoSizeColumn(i);
            }
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    public List<Map<String, Object>> validateMultipleShifts(List<Map<String, Object>> requests) {
        List<Map<String, Object>> results = new ArrayList<>();
        if (requests == null || requests.isEmpty()) {
            return results;
        }
         results = IntStream.range(0, requests.size()).mapToObj(index -> {Map<String, Object> row = requests.get(index);
                    List<String> errors = row == null ? List.of("Record: Record is required") : shiftFeignClient.validateShift(row);
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("rowNumber", index + 2);
                    result.put("errors", errors);
                    return result;
                }).toList();

        return results;
    }
}
