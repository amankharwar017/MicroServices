package com.shiftmaster.repository;

import com.shiftmaster.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long>, JpaSpecificationExecutor<Shift> {

    List<Shift> findByShiftCodeOrShiftName(String shiftCode, String shiftName);

    List<Shift> findByShiftCodeAndIdNotOrShiftNameAndIdNot(String shiftCode, Long codeId, String shiftName, Long nameId);



    @Query(value = """
            SELECT DATE_FORMAT(created_at, '%Y') AS period, COUNT(*) AS count
            FROM shift
            WHERE (:dateFrom IS NULL OR created_at >= :dateFrom)
              AND (:dateTo IS NULL OR created_at < DATE_ADD(:dateTo, INTERVAL 1 DAY))
            GROUP BY DATE_FORMAT(created_at, '%Y')
            ORDER BY DATE_FORMAT(created_at, '%Y')
            """, nativeQuery = true)
    List<CreationTrend> getYearlyCreationTrends(@Param("dateFrom") LocalDate dateFrom, @Param("dateTo") LocalDate dateTo);

    @Query(value = """
            SELECT DATE_FORMAT(created_at, '%Y-%m') AS period,
                   COUNT(*) AS count
            FROM shift
            WHERE (:dateFrom IS NULL OR created_at >= :dateFrom)
              AND (:dateTo IS NULL OR created_at < DATE_ADD(:dateTo, INTERVAL 1 DAY))
            GROUP BY DATE_FORMAT(created_at, '%Y')
            ORDER BY DATE_FORMAT(created_at, '%Y')
            """, nativeQuery = true)
    List<CreationTrend> getMonthlyCreationTrends(@Param("dateFrom") LocalDate dateFrom, @Param("dateTo") LocalDate dateTo);

    @Query(value = """
            SELECT CONCAT(DATE_FORMAT(created_at, '%x'), '-W', DATE_FORMAT(created_at, '%v')) AS period,
                   COUNT(*) AS count
            FROM shift
            WHERE (:dateFrom IS NULL OR created_at >= :dateFrom)
              AND (:dateTo IS NULL OR created_at < DATE_ADD(:dateTo, INTERVAL 1 DAY))
            GROUP BY YEAR(created_at), WEEK(created_at, 1)
            ORDER BY YEAR(created_at), WEEK(created_at, 1)
            """, nativeQuery = true)
    List<CreationTrend> getWeeklyCreationTrends(@Param("dateFrom") LocalDate dateFrom, @Param("dateTo") LocalDate dateTo);

    @Query(value = """
            SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS period,
                   COUNT(*) AS count
            FROM shift
            WHERE (:dateFrom IS NULL OR created_at >= :dateFrom)
              AND (:dateTo IS NULL OR created_at < DATE_ADD(:dateTo, INTERVAL 1 DAY))
           GROUP BY DATE_FORMAT(created_at, '%Y')
            ORDER BY DATE_FORMAT(created_at, '%Y')
            """, nativeQuery = true)
    List<CreationTrend> getDailyCreationTrends(@Param("dateFrom") LocalDate dateFrom, @Param("dateTo") LocalDate dateTo);

    interface CreationTrend {
        String getPeriod();

        Long getCount();
    }
}
