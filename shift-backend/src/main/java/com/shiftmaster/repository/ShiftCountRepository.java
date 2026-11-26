package com.shiftmaster.repository;

import com.shiftmaster.dto.ShiftDashboardCountDto;
import com.shiftmaster.entity.Shift;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Expression;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ShiftCountRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public ShiftDashboardCountDto getCounts() {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();

        long total = count(cb, false, null);
        long active = count(cb, false, true);
        long inactive = count(cb, false, false);
        long nightShift = count(cb, true, null);

        CriteriaQuery<Object[]> query = cb.createQuery(Object[].class);
        Root<Shift> root = query.from(Shift.class);

        Expression<Long> activeCount = cb.sum(
                cb.<Long>selectCase()
                        .when(cb.isTrue(root.get("status")), 1L)
                        .otherwise(0L)
        );

        Expression<Long> inactiveCount = cb.sum(
                cb.<Long>selectCase()
                        .when(cb.isFalse(root.get("status")), 1L)
                        .otherwise(0L)
        );

        query.multiselect(
                root.get("shiftType"),
                cb.count(root),
                activeCount,
                inactiveCount
        );

        query.where(cb.isFalse(root.get("isDeleted")));
        query.groupBy(root.get("shiftType"));
        query.orderBy(cb.asc(root.get("shiftType")));

        List<ShiftDashboardCountDto.ShiftTypeCountDto> shiftsByType =
                entityManager.createQuery(query)
                        .getResultList()
                        .stream()
                        .map(row -> new ShiftDashboardCountDto.ShiftTypeCountDto(
                                row[0] == null ? "Unspecified" : row[0].toString(),
                                ((Number) row[1]).longValue(),
                                ((Number) row[2]).longValue(),
                                ((Number) row[3]).longValue()
                        ))
                        .toList();

        long dayShift = Math.max(0, total - nightShift);

        List<ShiftDashboardCountDto.NightDistributionDto> nightDistribution = List.of(
                new ShiftDashboardCountDto.NightDistributionDto("Night Shift", nightShift),
                new ShiftDashboardCountDto.NightDistributionDto("Day Shift", dayShift)
        );

        return new ShiftDashboardCountDto(
                total,
                active,
                inactive,
                nightShift,
                shiftsByType,
                nightDistribution
        );
    }

    private long count(
            CriteriaBuilder cb,
            boolean night,
            Boolean status
    ) {
        CriteriaQuery<Long> query = cb.createQuery(Long.class);
        Root<Shift> root = query.from(Shift.class);

        query.select(cb.count(root));

        var predicates = cb.and(cb.isFalse(root.get("isDeleted")));

        if (night) {
            predicates = cb.and(
                    predicates,
                    cb.isTrue(root.get("nightShift"))
            );
        }

        if (status != null) {
            predicates = cb.and(
                    predicates,
                    status
                            ? cb.isTrue(root.get("status"))
                            : cb.isFalse(root.get("status"))
            );
        }

        query.where(predicates);

        return entityManager.createQuery(query).getSingleResult();
    }
}