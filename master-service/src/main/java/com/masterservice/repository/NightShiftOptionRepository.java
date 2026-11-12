package com.masterservice.repository;

import com.masterservice.entity.NightShiftOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NightShiftOptionRepository extends JpaRepository<NightShiftOption, Long> {

    List<NightShiftOption> findAllByActiveTrue();
}