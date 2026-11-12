package com.masterservice.repository;

import com.masterservice.entity.WeeklyOffOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WeeklyOffOptionRepository extends JpaRepository<WeeklyOffOption, Long> {

    List<WeeklyOffOption> findAllByActiveTrue();

    Optional<WeeklyOffOption> findByNameIgnoreCase(String name);
}