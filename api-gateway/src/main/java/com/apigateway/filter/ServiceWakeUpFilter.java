package com.apigateway.filter;

import com.apigateway.config.RenderServiceProperties;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Component
public class ServiceWakeUpFilter implements GlobalFilter, Ordered {

    private final WebClient webClient;
    private final DiscoveryClient discoveryClient;
    private final RenderServiceProperties properties;

    public ServiceWakeUpFilter(
            DiscoveryClient discoveryClient,
            RenderServiceProperties properties) {
        this.webClient = WebClient.builder().build();
        this.discoveryClient = discoveryClient;
        this.properties = properties;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {

        String path = exchange.getRequest().getURI().getPath();
        String targetService = getService(path);

        if (targetService == null) {
            return chain.filter(exchange);
        }

        Mono<Void> wakeTarget = ensureService(targetService);

        if (!targetService.equals("AUTH-SERVICE")
                && !path.equals("/user/login")
                && !path.equals("/user/register")) {
            return ensureService("AUTH-SERVICE")
                    .then(wakeTarget)
                    .then(chain.filter(exchange));
        }

        return wakeTarget.then(chain.filter(exchange));
    }

    private Mono<Void> ensureService(String serviceId) {

        if (!discoveryClient.getInstances(serviceId).isEmpty()) {
            return Mono.empty();
        }

        String renderUrl = properties.getServices()
                .get(serviceId.toLowerCase().replace("-service", "-service"));

        if (renderUrl == null) {
            return Mono.error(new IllegalStateException(
                    "Render URL not found for " + serviceId));
        }

        return webClient.get()
                .uri(renderUrl)
                .exchangeToMono(response -> response.releaseBody())
                .onErrorResume(exception -> Mono.empty())
                .then(waitForRegistration(serviceId, 24));
    }

    private Mono<Void> waitForRegistration(String serviceId, int attempts) {

        if (!discoveryClient.getInstances(serviceId).isEmpty()) {
            return Mono.empty();
        }

        if (attempts == 0) {
            return Mono.error(new IllegalStateException(
                    serviceId + " did not register in Eureka"));
        }

        return Mono.delay(Duration.ofSeconds(5))
                .then(waitForRegistration(serviceId, attempts - 1));
    }

    private String getService(String path) {

        if (path.startsWith("/auth/")) return "AUTH-SERVICE";
        if (path.startsWith("/user/")) return "USER-SERVICE";
        if (path.startsWith("/shift/")) return "SHIFT-SERVICE";
        if (path.startsWith("/master/")) return "MASTER-SERVICE";
        if (path.startsWith("/common/")) return "COMMON-SERVICE";

        return null;
    }

    @Override
    public int getOrder() {
        return -2;
    }
}