package com.shiftmaster.repository;

import com.shiftmaster.entity.ShiftNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShiftNotificationRepository extends JpaRepository<ShiftNotification, Long> {
    long countByIsReadFalse();
}