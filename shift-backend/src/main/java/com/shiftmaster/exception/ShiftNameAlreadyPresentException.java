package com.shiftmaster.exception;

public class ShiftNameAlreadyPresentException extends RuntimeException {
    public ShiftNameAlreadyPresentException(String msg) {
        super(msg);
    }
}
