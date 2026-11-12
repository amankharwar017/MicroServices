package com.shiftmaster.service;

import com.shiftmaster.dto.ShiftResponseDto;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShiftEmailService {
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Value("${shift.notification.email}")
    private String recipientEmail;

    @Async
    public void sendShiftNotification(ShiftResponseDto shift, String operation) {
        try {
            byte[] pdf = generateShiftPdf(shift, operation);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(senderEmail);
            helper.setTo(recipientEmail);
            helper.setSubject("Shift Master Notification: " + operation);
            helper.setText("Hello,\n\n" +
                            "A shift operation was completed in Shift Master.\n\n" +
                            "Shift Code: " + shift.getShiftCode() + "\n" +
                            "Shift Name: " + shift.getShiftName() + "\n" +
                            "Operation: " + operation + "\n" +
                            "Date and Time: " + LocalDateTime.now() + "\n\n" +
                            "Please find the complete shift details in the attached PDF.\n\n" +
                            "Regards,\n" +
                            "Shift Master Team"
            );

            String shiftCode = shift.getShiftCode() == null ? "shift" : shift.getShiftCode().replaceAll("[^a-zA-Z0-9._-]", "_");
            String safeOperation = operation.replaceAll("[^a-zA-Z0-9._-]", "_");
            helper.addAttachment("Shift-" + shiftCode + "-" + safeOperation + ".pdf", new ByteArrayResource(pdf));
            mailSender.send(message);
        } catch (MessagingException | DocumentException exception) {
            System.err.println("Shift email notification failed: " + exception.getMessage());
        } catch (RuntimeException exception) {
            System.err.println("Shift email notification failed: " + exception.getMessage());
        }
    }

    private byte[] generateShiftPdf(ShiftResponseDto shift, String operation) throws DocumentException {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 40, 36);
        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();
            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(31, 78, 121));
            Font subTitleFont = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.DARK_GRAY);
            Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);
            Font valueFont = new Font(Font.HELVETICA, 9, Font.NORMAL, Color.BLACK);

            Paragraph title = new Paragraph("SHIFT MASTER - SHIFT DETAILS", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(8);
            document.add(title);

            Paragraph operationText = new Paragraph("Operation: " + operation + "    |    Generated: " + LocalDateTime.now(), subTitleFont);
            operationText.setSpacingAfter(16);
            document.add(operationText);

            PdfPTable table = new PdfPTable(new float[]{1.2f, 2.3f});
            table.setWidthPercentage(100);
            table.setHeaderRows(1);

            addHeaderCell(table, "Field", headerFont);
            addHeaderCell(table, "Value", headerFont);
            addRow(table, "ID", value(shift.getId()), valueFont);
            addRow(table, "Shift Code", value(shift.getShiftCode()), valueFont);
            addRow(table, "Shift Name", value(shift.getShiftName()), valueFont);
            addRow(table, "Display Name", value(shift.getDisplayName()), valueFont);
            addRow(table, "Shift Type", value(shift.getShiftType()), valueFont);
            addRow(table, "Start Time", value(shift.getStartTime()), valueFont);
            addRow(table, "End Time", value(shift.getEndTime()), valueFont);
            addRow(table, "Break Start", value(shift.getBreakStart()), valueFont);
            addRow(table, "Break End", value(shift.getBreakEnd()), valueFont);
            addRow(table, "Working Hours", value(shift.getWorkingHours()), valueFont);
            addRow(table, "Grace In", value(shift.getGraceIn()), valueFont);
            addRow(table, "Grace Out", value(shift.getGraceOut()), valueFont);
            addRow(table, "Overtime Allowed", yesNo(shift.isOvertimeAllowed()), valueFont);
            addRow(table, "Night Shift", yesNo(shift.isNightShift()), valueFont);
            addRow(table, "Weekly Off", yesNo(shift.isWeeklyOff()), valueFont);
            addRow(table, "Shift Color", value(shift.getShiftColor()), valueFont);
            addRow(table, "Applicable Days", formatDays(shift.getApplicableDays()), valueFont);
            addRow(table, "Description", value(shift.getDescription()), valueFont);
            addRow(table, "Attachment", value(shift.getAttachment()), valueFont);
            addRow(table, "Remarks", value(shift.getRemarks()), valueFont);
            addRow(table, "Status", shift.isStatus() ? "Active" : "Inactive", valueFont);
            addRow(table, "Deleted", yesNo(shift.isDeleted()), valueFont);
            addRow(table, "Created By", value(shift.getCreatedBy()), valueFont);
            addRow(table, "Created At", value(shift.getCreatedAt()), valueFont);
            addRow(table, "Updated By", value(shift.getUpdatedBy()), valueFont);
            addRow(table, "Updated At", value(shift.getUpdatedAt()), valueFont);
            document.add(table);
        } finally {
            if (document.isOpen()) document.close();
        }
        return outputStream.toByteArray();
    }

    private void addHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(31, 78, 121));
        cell.setPadding(8);
        table.addCell(cell);
    }

    private void addRow(PdfPTable table, String field, String value, Font font) {
        PdfPCell fieldCell = new PdfPCell(new Phrase(field, font));
        fieldCell.setPadding(7);
        fieldCell.setBackgroundColor(new Color(240, 245, 250));
        PdfPCell valueCell = new PdfPCell(new Phrase(value, font));
        valueCell.setPadding(7);
        table.addCell(fieldCell);
        table.addCell(valueCell);
    }

    private String value(Object value) {
        return value == null || value.toString().isBlank() ? "N/A" : value.toString();
    }

    private String yesNo(boolean value) {
        return value ? "Yes" : "No";
    }

    private String formatDays(Set<java.time.DayOfWeek> days) {
        if (days == null || days.isEmpty()) return "N/A";
        return days.stream().map(Enum::name).sorted().collect(Collectors.joining(", "));
    }
}
