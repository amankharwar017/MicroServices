package com.masterservice.repository;

import com.masterservice.entity.ShiftStatusOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftStatusOptionRepository extends JpaRepository<ShiftStatusOption, Long> {

    List<ShiftStatusOption> findAllByActiveTrue();
}