package com.shiftmaster.repository;

import com.shiftmaster.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long>, JpaSpecificationExecutor<Shift> {

    List<Shift> findByShiftCodeOrShiftName(String shiftCode, String shiftName);

    List<Shift> findByShiftCodeAndIdNotOrShiftNameAndIdNot(String shiftCode, Long codeId, String shiftName, Long nameId);

    @Query(value = """
            SELECT YEAR(created_at) AS year, COUNT(*) AS count
            FROM shift
            GROUP BY YEAR(created_at)
            ORDER BY YEAR(created_at)
            """, nativeQuery = true)
    List<Object[]> getYearlyCreationTrends();

    @Query(value = """
            SELECT YEAR(created_at) AS year,
                   MONTH(created_at) AS month,
                   COUNT(*) AS count
            FROM shift
            GROUP BY YEAR(created_at), MONTH(created_at)
            ORDER BY YEAR(created_at), MONTH(created_at)
            """, nativeQuery = true)
    List<Object[]> getMonthlyCreationTrends();

    @Query(value = """
            SELECT YEAR(created_at) AS year,
                   WEEK(created_at, 1) AS week,
                   COUNT(*) AS count
            FROM shift
            GROUP BY YEAR(created_at), WEEK(created_at, 1)
            ORDER BY YEAR(created_at), WEEK(created_at, 1)
            """, nativeQuery = true)
    List<Object[]> getWeeklyCreationTrends();

    @Query(value = """
            SELECT DATE(created_at) AS date,
                   COUNT(*) AS count
            FROM shift
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
            """, nativeQuery = true)
    List<Object[]> getDailyCreationTrends();
}