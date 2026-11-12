package com.shiftmaster.client;

import com.shiftmaster.dto.UserResponseDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service", configuration = UserServiceFeignConfig.class)
public interface UserServiceClient {

    @GetMapping("/auth/user/{id}")
    UserResponseDto getUserById(@PathVariable("id") Long id);
}