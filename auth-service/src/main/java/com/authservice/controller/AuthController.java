package com.authservice.controller;

import com.authservice.dto.TokenRequestDto;
import com.authservice.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final JwtService jwtService;

    @PostMapping("/token")
    public ResponseEntity<Map<String, String>> generateToken(@RequestBody TokenRequestDto request) {
        String token = jwtService.generateToken(request.getUsername(), request.getRole() , request.getUserId());
        return ResponseEntity.ok(Map.of("token", token, "tokenType", "Bearer"));
    }
}