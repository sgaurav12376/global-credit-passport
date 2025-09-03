package com.global_credit_app.register_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
		"spring.datasource.url=jdbc:h2:mem:testdb",
		"spring.jpa.hibernate.ddl-auto=none"
})
public class RegisterServiceApplicationTests {

	@Test
	void contextLoads() {
		// No DB interaction needed for this basic context load test
	}
}
