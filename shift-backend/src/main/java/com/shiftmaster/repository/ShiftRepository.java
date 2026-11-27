package com.shiftmaster.repository;

import com.shiftmaster.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long>, JpaSpecificationExecutor<Shift> {

    List<Shift> findByShiftCodeOrShiftName(String shiftCode, String shiftName);

    List<Shift> findByShiftCodeAndIdNotOrShiftNameAndIdNot(String shiftCode, Long codeId, String shiftName, Long nameId);


}
