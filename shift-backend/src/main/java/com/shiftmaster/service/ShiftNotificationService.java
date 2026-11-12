
package com.shiftmaster.service;

import com.shiftmaster.entity.ShiftNotification;
import com.shiftmaster.repository.ShiftNotificationRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class ShiftNotificationService {

    private final ShiftNotificationRepository notificationRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ShiftNotificationService(ShiftNotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void createNotification(String title, String message, String type, Long shiftId) {
        ShiftNotification notification = new ShiftNotification();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setShiftId(shiftId);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());
        entityManager.persist(notification);
    }


    public Map<String, Object> getNotificationData(Pageable pageable) {
        Pageable sortedPageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id")));
        Page<ShiftNotification> notificationPage = notificationRepository.findAll(sortedPageable);
        long unreadCount = notificationRepository.countByIsReadFalse();
        return Map.of(
                "notifications", notificationPage.getContent(),
                "unreadCount", unreadCount,
                "totalElements", notificationPage.getTotalElements(),
                "totalPages", notificationPage.getTotalPages(),
                "currentPage", notificationPage.getNumber(),
                "pageSize", notificationPage.getSize()
        );
    }

    @Transactional
    public void markAsRead(Long id) {
        ShiftNotification notification = entityManager.find(ShiftNotification.class, id);
        if (notification == null) throw new IllegalArgumentException("Notification not found with id: " + id);
        notification.setRead(true);
    }

    @Transactional
    public void markAllAsRead() {
        entityManager.createQuery("UPDATE ShiftNotification n SET n.isRead = true WHERE n.isRead = false").executeUpdate();
    }
}
