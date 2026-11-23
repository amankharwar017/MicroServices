package com.apigateway.security;

import org.jspecify.annotations.NonNull;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Map;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final WebClient.Builder webClientBuilder;

    public JwtAuthenticationFilter(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, @NonNull GatewayFilterChain chain) {

        String path = exchange.getRequest().getURI().getPath();
        if (path.equals("/user/login") || path.equals("/user/register")) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }


        return webClientBuilder
                .build()
                .post()
                .uri("http://AUTH-SERVICE/auth/validate")
                .header("Authorization", authHeader)
                .retrieve()
                .bodyToMono(
                        new ParameterizedTypeReference<Map<String, Object>>() {
                        }
                ).flatMap(authResponse -> {

                    Object usernameObject = authResponse.get("username");
                    Object roleObject = authResponse.get("role");
                    Object userIdObject = authResponse.get("userId");

                    if (usernameObject == null || roleObject == null || userIdObject == null) {
                        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                        return exchange.getResponse().setComplete();
                    }

                    String username = String.valueOf(usernameObject);

                    String role = String.valueOf(roleObject);

                    String userId = String.valueOf(userIdObject);


                    ServerWebExchange modifiedExchange =
                            exchange.mutate().request(request -> request.headers(headers -> {
                                        headers.set("X-Username", username);
                                        headers.set("X-Role", role);
                                        headers.set("X-User-Id", userId);
                                    })
                            ).build();
                    return chain.filter(modifiedExchange);
                })
                .onErrorResume(exception -> {
                    exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                    return exchange.getResponse().setComplete();
                });
    }

    @Override
    public int getOrder() {
        return -1;
    }
}