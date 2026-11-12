package com.shiftmaster.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class ShiftHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long shiftId;
    @Column(nullable = false, length = 20)
    private String shiftCode;
    @Column(nullable = false, length = 20)
    private String operation;
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime operationAt;
    @Column(columnDefinition = "LONGTEXT")
    private String oldValues;
    @Column(columnDefinition = "LONGTEXT")
    private String newValues;
}