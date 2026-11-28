package com.apigateway.filter;

import com.apigateway.config.RenderServiceProperties;
import org.jspecify.annotations.NullMarked;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;

@Component
public class ServiceWakeUpFilter implements GlobalFilter, Ordered {

    private final WebClient.Builder webClientBuilder;
    private final RenderServiceProperties properties;

    public ServiceWakeUpFilter(WebClient.Builder webClientBuilder, RenderServiceProperties properties) {
        this.webClientBuilder = webClientBuilder;
        this.properties = properties;
    }

    @NullMarked
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        String targetService = getService(path);

        if (targetService == null) {
            return chain.filter(exchange);
        }

        String targetUrl = properties.getServices().get(targetService);

        if (targetUrl == null) {
            return chain.filter(exchange);
        }

        Mono<Void> targetWakeUp = wakeUp(targetUrl);

        if (requiresAuthentication(path)) {
            String authUrl = properties.getServices().get("auth-service");

            if (authUrl != null && !"auth-service".equals(targetService)) {
                return targetWakeUp
                        .then(wakeUp(authUrl))
                        .then(chain.filter(exchange));
            }
        }

        return targetWakeUp.then(chain.filter(exchange));
    }

    private Mono<Void> wakeUp(String url) {
        return webClientBuilder.build()
                .get()
                .uri(url)
                .exchangeToMono(response -> {
                    if (response.statusCode().is5xxServerError()) {
                        return Mono.error(new RuntimeException(
                                "Render service is not ready: " + url + " - " + response.statusCode().value()
                        ));
                    }
                    return response.releaseBody();
                })
                .timeout(Duration.ofSeconds(10))
                .retryWhen(
                        Retry.fixedDelay(5, Duration.ofSeconds(3))
                                .onRetryExhaustedThrow((spec, signal) -> signal.failure())
                );
    }
    private String getService(String path) {
        if (path.startsWith("/auth/")) return "auth-service";
        if (path.startsWith("/user/")) return "user-service";
        if (path.startsWith("/shift/")) return "shift-service";
        if (path.startsWith("/master/")) return "master-service";
        if (path.startsWith("/common/")) return "common-service";
        return null;
    }

    private boolean requiresAuthentication(String path) {
        return !path.equals("/user/login")
                && !path.equals("/user/register")
                && !path.equals("/shift/dashboard-counts")
                && !path.equals("/shift/creation-trends")
                && !path.equals("/shift/summary-count");
    }

    @Override
    public int getOrder() {
        return -2;
    }
}