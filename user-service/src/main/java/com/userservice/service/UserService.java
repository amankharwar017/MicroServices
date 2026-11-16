
package com.userservice.service;

import com.userservice.client.AuthServiceClient;
import com.userservice.dto.LoginRequestDto;
import com.userservice.dto.LoginResponseDto;
import com.userservice.dto.RegisterRequestDto;
import com.userservice.dto.TokenRequestDto;
import com.userservice.dto.UserResponseDto;
import com.userservice.entity.AppUser;
import com.userservice.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthServiceClient authServiceClient;

    public String register(RegisterRequestDto request) {
        if (appUserRepository.existsByUsername(request.getUsername())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        if (appUserRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already exists");
        }
        AppUser user = new AppUser();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole("USER");
        user.setEnabled(true);
        appUserRepository.save(user);
        return "User registered successfully";
    }

    public LoginResponseDto authenticate(LoginRequestDto request) {
        AppUser user = appUserRepository.findByUsername(request.getUsername()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not a valid user."));
        if (!user.isEnabled()) {throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is inactive. Please contact your administrator.");}
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password.");}
        TokenRequestDto tokenRequest = new TokenRequestDto(user.getUsername(), user.getRole(),user.getId());
        Map<String, String> tokenResponse = authServiceClient.generateToken(tokenRequest);
        return new LoginResponseDto(user.getUsername(), user.getRole(), tokenResponse.get("token"), tokenResponse.get("tokenType"));
    }

    public UserResponseDto getUserById(Long id) {
        AppUser user = appUserRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found with id: " + id));
        UserResponseDto response = new UserResponseDto();
        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setRole(user.getRole());
        return response;
    }
}
