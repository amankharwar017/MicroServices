package com.shiftmaster.repository;

import com.shiftmaster.entity.ShiftHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ShiftHistoryRepository extends JpaRepository<ShiftHistory, Long> {
    List<ShiftHistory> findByShiftIdOrderByOperationAtDesc(Long shiftId);
}