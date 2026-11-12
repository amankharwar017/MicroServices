package com.shiftmaster.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException exception) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", HttpStatus.BAD_REQUEST.value());
        response.put("message", "Validation failed");
        Map<String, String> errors = new HashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error -> {
            errors.put(error.getField(), error.getDefaultMessage());
        });
        response.put("data", null);
        response.put("error", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(ShiftCodeAlreadyPresentException.class)
    public ResponseEntity<Map<String, Object>> handleShiftCodeException(ShiftCodeAlreadyPresentException exception) {
        return createErrorResponse(HttpStatus.CONFLICT, exception.getMessage());
    }


    @ExceptionHandler(ShiftNameAlreadyPresentException.class)
    public ResponseEntity<Map<String, Object>> handleShiftNameException(ShiftNameAlreadyPresentException exception) {
        return createErrorResponse(HttpStatus.CONFLICT, exception.getMessage());
    }


    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(IllegalArgumentException exception) {
        return createErrorResponse(HttpStatus.BAD_REQUEST, exception.getMessage());
    }


    private ResponseEntity<Map<String, Object>> createErrorResponse(HttpStatus status, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", status.value());
        response.put("message", message);
        response.put("data", null);
        response.put("error", message);
        return ResponseEntity.status(status).body(response);

    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleHttpMessageNotReadableException(HttpMessageNotReadableException exception) {
        return createErrorResponse(HttpStatus.BAD_REQUEST, "Invalid request data. Grace time must be a numeric value");
    }
}