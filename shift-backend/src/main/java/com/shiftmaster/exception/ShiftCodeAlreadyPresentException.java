package com.shiftmaster.exception;

public class ShiftCodeAlreadyPresentException extends RuntimeException {
    public ShiftCodeAlreadyPresentException(String msg) {
        super(msg);
    }

}
