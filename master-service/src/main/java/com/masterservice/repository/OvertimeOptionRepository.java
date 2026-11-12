package com.masterservice.repository;

import com.masterservice.entity.OvertimeOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OvertimeOptionRepository extends JpaRepository<OvertimeOption, Long> {

    List<OvertimeOption> findAllByActiveTrue();
}