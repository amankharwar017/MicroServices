
package com.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponseDto {
    private String username;
    private String role;
    private String token;
    private String tokenType;
}
