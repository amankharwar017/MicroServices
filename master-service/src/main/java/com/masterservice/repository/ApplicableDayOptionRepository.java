package com.masterservice.repository;

import com.masterservice.entity.ApplicableDayOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApplicableDayOptionRepository extends JpaRepository<ApplicableDayOption, Long> {

    List<ApplicableDayOption> findAllByActiveTrue();
}