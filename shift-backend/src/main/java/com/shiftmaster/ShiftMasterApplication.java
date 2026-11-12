package com.shiftmaster;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableAsync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableAsync
@EnableFeignClients
public class ShiftMasterApplication {

    public static void main(String[] args) {

        SpringApplication.run(ShiftMasterApplication.class, args);
    }

}
