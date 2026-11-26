package com.shiftmaster.repository;

import com.shiftmaster.dto.ShiftAnalyticsDto;
import com.shiftmaster.entity.Shift;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class ShiftAnalyticsRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public ShiftAnalyticsDto getShiftAnalytics(LocalDate dateFrom, LocalDate dateTo) {

        CriteriaBuilder cb = entityManager.getCriteriaBuilder();

        LocalDateTime from = dateFrom != null
                ? dateFrom.atStartOfDay()
                : null;

        LocalDateTime to = dateTo != null
                ? dateTo.plusDays(1).atStartOfDay()
                : null;

        long total = getTotal(cb, from, to);

        Map<String, Long> shiftsByType =
                getCountByType(cb, from, to);

        Map<String, Long> activeByType =
                getCountByTypeAndStatus(cb, from, to, "ACTIVE");

        Map<String, Long> inactiveByType =
                getCountByTypeAndStatus(cb, from, to, "INACTIVE");

        long active = activeByType.values()
                .stream()
                .mapToLong(Long::longValue)
                .sum();

        long inactive = inactiveByType.values()
                .stream()
                .mapToLong(Long::longValue)
                .sum();

        long nightShift =
                getNightShiftCount(cb, from, to);

        return new ShiftAnalyticsDto(
                total,
                active,
                inactive,
                nightShift,
                shiftsByType,
                activeByType,
                inactiveByType
        );
    }

    private long getTotal(
            CriteriaBuilder cb,
            LocalDateTime from,
            LocalDateTime to
    ) {
        CriteriaQuery<Long> query =
                cb.createQuery(Long.class);

        Root<Shift> root =
                query.from(Shift.class);

        query.select(cb.count(root));

        query.where(
                buildDatePredicate(cb, root, from, to)
        );

        return entityManager
                .createQuery(query)
                .getSingleResult();
    }

    private Map<String, Long> getCountByType(
            CriteriaBuilder cb,
            LocalDateTime from,
            LocalDateTime to
    ) {
        CriteriaQuery<Object[]> query =
                cb.createQuery(Object[].class);

        Root<Shift> root =
                query.from(Shift.class);

        query.multiselect(
                root.get("shiftType"),
                cb.count(root)
        );

        query.where(
                buildDatePredicate(cb, root, from, to)
        );

        query.groupBy(
                root.get("shiftType")
        );

        return toMap(
                entityManager
                        .createQuery(query)
                        .getResultList()
        );
    }

    private Map<String, Long> getCountByTypeAndStatus(
            CriteriaBuilder cb,
            LocalDateTime from,
            LocalDateTime to,
            String status
    ) {
        CriteriaQuery<Object[]> query =
                cb.createQuery(Object[].class);

        Root<Shift> root =
                query.from(Shift.class);

        query.multiselect(
                root.get("shiftType"),
                cb.count(root)
        );

        query.where(
                cb.and(
                        buildDatePredicate(cb, root, from, to),
                        cb.equal(
                                root.get("status"),
                                status
                        )
                )
        );

        query.groupBy(
                root.get("shiftType")
        );

        return toMap(
                entityManager
                        .createQuery(query)
                        .getResultList()
        );
    }

    private long getNightShiftCount(
            CriteriaBuilder cb,
            LocalDateTime from,
            LocalDateTime to
    ) {
        CriteriaQuery<Long> query =
                cb.createQuery(Long.class);

        Root<Shift> root =
                query.from(Shift.class);

        query.select(
                cb.count(root)
        );

        query.where(
                cb.and(
                        buildDatePredicate(
                                cb,
                                root,
                                from,
                                to
                        ),
                        cb.isTrue(
                                root.get("nightShift")
                        )
                )
        );

        return entityManager
                .createQuery(query)
                .getSingleResult();
    }

    private Predicate buildDatePredicate(
            CriteriaBuilder cb,
            Root<Shift> root,
            LocalDateTime from,
            LocalDateTime to
    ) {
        Predicate predicate =
                cb.conjunction();

        if (from != null) {
            predicate = cb.and(
                    predicate,
                    cb.greaterThanOrEqualTo(
                            root.get("createdAt"),
                            from
                    )
            );
        }

        if (to != null) {
            predicate = cb.and(
                    predicate,
                    cb.lessThan(
                            root.get("createdAt"),
                            to
                    )
            );
        }

        return predicate;
    }

    private Map<String, Long> toMap(
            List<Object[]> rows
    ) {
        Map<String, Long> result =
                new LinkedHashMap<>();

        for (Object[] row : rows) {
            result.put(
                    String.valueOf(row[0]),
                    ((Number) row[1]).longValue()
            );
        }

        return result;
    }
}