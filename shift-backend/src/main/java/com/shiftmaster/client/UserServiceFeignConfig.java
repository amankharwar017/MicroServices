package com.shiftmaster.client;

import feign.RequestInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public class UserServiceFeignConfig {

    @Bean
    public RequestInterceptor userServiceRequestInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String username = request.getHeader("X-Username");
                String role = request.getHeader("X-Role");
                String userId = request.getHeader("X-User-Id");
                if (username != null && !username.isBlank()) requestTemplate.header("X-Username", username);
                if (role != null && !role.isBlank()) requestTemplate.header("X-Role", role);
                if (userId != null && !userId.isBlank()) requestTemplate.header("X-User-Id", userId);
            }
        };
    }
}
