package com.userservice.client;

import com.userservice.dto.TokenRequestDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.Map;

@FeignClient(name = "auth-service")
public interface AuthServiceClient {

    @PostMapping("/auth/token")
    Map<String, String> generateToken(@RequestBody TokenRequestDto request);
}
