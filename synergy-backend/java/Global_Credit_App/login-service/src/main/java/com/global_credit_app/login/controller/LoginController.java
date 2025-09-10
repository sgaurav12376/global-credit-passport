package com.global_credit_app.login.controller;

import com.global_credit_app.login.dto.*;
import com.global_credit_app.login.service.LoginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class LoginController {

    @Autowired
    private LoginService loginService;

    @PostMapping(value = "/login", produces = "application/json")
    public ResponseEntity<ApiResponse<LoginResponseDTO>> login(@RequestBody LoginRequestDTO loginRequest) {
        return loginService.login(loginRequest);
    }

    @PostMapping(value = "/signup", produces = "application/json")
    public ResponseEntity<ApiResponse<SignupResponseDTO>> signup(@RequestBody SignupRequestDTO signupRequest) {
        return loginService.signup(signupRequest);
    }
}
