package com.shiftmaster.repository;

import com.shiftmaster.dto.CreationTrendsDto;
import com.shiftmaster.dto.ShiftAnalyticsDto;
import com.shiftmaster.entity.Shift;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
                getCountByTypeAndStatus(cb, from, to, true);

        Map<String, Long> inactiveByType =
                getCountByTypeAndStatus(cb, from, to, false);

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
            boolean status
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

    public List<CreationTrendsDto.TrendPoint> getCreationTrends(
            Specification<Shift> specification,
            String granularity
    ) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<Shift> root = query.from(Shift.class);

        var date = root.get("createdAt");

        var period = switch (granularity.toLowerCase(Locale.ROOT)) {
            case "yearly" -> cb.function("DATE_FORMAT", String.class, date, cb.literal("%Y"));
            case "monthly" -> cb.function("DATE_FORMAT", String.class, date, cb.literal("%Y-%m"));
            case "weekly" -> cb.concat(
                    cb.function("DATE_FORMAT", String.class, date, cb.literal("%x")),
                    cb.concat("-W", cb.function("DATE_FORMAT", String.class, date, cb.literal("%v")))
            );
            case "daily" -> cb.function("DATE_FORMAT", String.class, date, cb.literal("%Y-%m-%d"));
            default -> throw new IllegalArgumentException("Invalid granularity: " + granularity);
        };

        Predicate filterPredicate = specification != null
                ? specification.toPredicate(root, query, cb)
                : cb.conjunction();

        query.select(cb.tuple(period.alias("date"), cb.count(root).alias("count")));
        query.where(filterPredicate != null ? cb.and(filterPredicate, cb.isNotNull(date)) : cb.isNotNull(date));
        query.groupBy(period);
        query.orderBy(cb.asc(period));

        return entityManager.createQuery(query).getResultList().stream()
                .map(row -> new CreationTrendsDto.TrendPoint(
                        row.get("date", String.class),
                        row.get("count", Long.class)
                ))
                .toList();
    }
}