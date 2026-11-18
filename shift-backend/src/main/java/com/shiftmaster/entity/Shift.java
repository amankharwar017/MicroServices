package com.shiftmaster.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalTime;

@Entity
@Getter
@Setter
public class Shift extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 20, nullable = false, unique = true)
    private String shiftCode;

    @Column(length = 100, nullable = false, unique = true)
    private String shiftName;

    @Column(length = 150)
    private String displayName;

    @Column(length = 50, nullable = false)
    private String shiftType;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    private LocalTime breakStart;

    private LocalTime breakEnd;

    @Column(precision = 5, scale = 2)
    private BigDecimal workingHours;

    private Integer graceIn;

    private Integer graceOut;

    private boolean overtimeAllowed;

    private boolean nightShift;

    private boolean weeklyOff;

    @Column(length = 20)
    private String shiftColor;

    @Column(columnDefinition = "JSON")
    private String applicableDays;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String attachment;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    private boolean status;

    private boolean isDeleted;
}