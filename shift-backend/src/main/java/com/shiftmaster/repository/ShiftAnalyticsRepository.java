package com.shiftmaster.repository;

import com.shiftmaster.dto.ShiftAnalyticsDto;
import com.shiftmaster.dto.ShiftSearchRequestDto;
import com.shiftmaster.entity.Shift;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Repository
public class ShiftAnalyticsRepository {

    @PersistenceContext
    private EntityManager entityManager;

    public ShiftAnalyticsDto getShiftAnalytics(LocalDate dateFrom, LocalDate dateTo) {
        ShiftSearchRequestDto filters = new ShiftSearchRequestDto();
        filters.setCreatedDateFrom(dateFrom);
        filters.setCreatedDateTo(dateTo);
        return getShiftAnalytics(filters);
    }

    public ShiftAnalyticsDto getShiftAnalytics(ShiftSearchRequestDto filters) {
        ShiftSearchRequestDto safeFilters = filters != null ? filters : new ShiftSearchRequestDto();
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();

        long total = getTotal(cb, safeFilters);

        Map<String, Long> shiftsByType =
                getCountByType(cb, safeFilters);

        Map<String, Long> activeByType =
                getCountByTypeAndStatus(cb, safeFilters, true);

        Map<String, Long> inactiveByType =
                getCountByTypeAndStatus(cb, safeFilters, false);

        long active = activeByType.values()
                .stream()
                .mapToLong(Long::longValue)
                .sum();

        long inactive = inactiveByType.values()
                .stream()
                .mapToLong(Long::longValue)
                .sum();

        long nightShift =
                getNightShiftCount(cb, safeFilters);

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

    public List<Map<String, Object>> getCreationTrends(String level, ShiftSearchRequestDto filters) {
        ShiftSearchRequestDto safeFilters = filters != null ? filters : new ShiftSearchRequestDto();
        String normalizedLevel = level == null ? "" : level.trim().toUpperCase(Locale.ROOT);
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<Shift> root = query.from(Shift.class);

        var date = root.get("createdAt");
        var period = switch (normalizedLevel) {
            case "YEARLY" -> cb.function("DATE_FORMAT", String.class, date, cb.literal("%Y"));
            case "MONTHLY" -> cb.function("DATE_FORMAT", String.class, date, cb.literal("%Y-%m"));
            case "WEEKLY" -> cb.concat(
                    cb.function("DATE_FORMAT", String.class, date, cb.literal("%x")),
                    cb.concat("-W", cb.function("DATE_FORMAT", String.class, date, cb.literal("%v")))
            );
            case "DAILY" -> cb.function("DATE_FORMAT", String.class, date, cb.literal("%Y-%m-%d"));
            default -> throw new IllegalArgumentException("Invalid trend level. Use YEARLY, MONTHLY, WEEKLY or DAILY");
        };

        query.select(cb.tuple(period.alias("month"), cb.count(root).alias("count")));
        query.where(cb.and(buildFilterPredicate(cb, root, safeFilters), cb.isNotNull(date)));
        query.groupBy(period);
        query.orderBy(cb.asc(period));

        return entityManager.createQuery(query).getResultList().stream().map(row -> {
            Map<String, Object> data = new HashMap<>();
            data.put("month", row.get("month", String.class));
            data.put("count", row.get("count", Long.class));
            return data;
        }).toList();
    }

    private long getTotal(
            CriteriaBuilder cb,
            ShiftSearchRequestDto filters
    ) {
        CriteriaQuery<Long> query =
                cb.createQuery(Long.class);

        Root<Shift> root =
                query.from(Shift.class);

        query.select(cb.count(root));

        query.where(
                buildFilterPredicate(cb, root, filters)
        );

        return entityManager
                .createQuery(query)
                .getSingleResult();
    }

    private Map<String, Long> getCountByType(
            CriteriaBuilder cb,
            ShiftSearchRequestDto filters
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
                buildFilterPredicate(cb, root, filters)
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
            ShiftSearchRequestDto filters,
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
                        buildFilterPredicate(cb, root, filters),
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
            ShiftSearchRequestDto filters
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
                        buildFilterPredicate(cb, root, filters),
                        cb.isTrue(
                                root.get("nightShift")
                        )
                )
        );

        return entityManager
                .createQuery(query)
                .getSingleResult();
    }

    private Predicate buildFilterPredicate(
            CriteriaBuilder cb,
            Root<Shift> root,
            ShiftSearchRequestDto filters
    ) {
        Predicate predicate =
                cb.conjunction();

        LocalDateTime from = filters.getCreatedDateFrom() != null
                ? filters.getCreatedDateFrom().atStartOfDay()
                : null;
        LocalDateTime to = filters.getCreatedDateTo() != null
                ? filters.getCreatedDateTo().plusDays(1).atStartOfDay()
                : null;

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

        if (filters.getShiftType() != null && !filters.getShiftType().isEmpty()) {
            predicate = cb.and(
                    predicate,
                    cb.upper(root.get("shiftType")).in(
                            filters.getShiftType().stream().map(String::toUpperCase).toList()
                    )
            );
        }

        if (filters.getStatus() != null) {
            predicate = cb.and(
                    predicate,
                    cb.equal(root.<Boolean>get("status"), filters.getStatus())
            );
        }

        if (filters.getNightShift() != null) {
            predicate = cb.and(
                    predicate,
                    cb.equal(root.<Boolean>get("nightShift"), filters.getNightShift())
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