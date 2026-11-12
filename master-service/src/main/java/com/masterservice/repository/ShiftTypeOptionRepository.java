package com.masterservice.repository;

import com.masterservice.entity.ShiftTypeOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShiftTypeOptionRepository extends JpaRepository<ShiftTypeOption, Long> {

    List<ShiftTypeOption> findAllByActiveTrue();
}