package com.synergyresources.gcp.passport.setu;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;
import okhttp3.Request;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfSystemProperty(
    named = "setu.live.check",
    matches = "true"
)
class SetuLiveConnectivityTest {

    @Test
    void authenticateAndRetrieveFips() throws Exception {

        Properties props = new Properties();

        try (InputStream input = Files.newInputStream(
                Path.of("application-local.properties"))) {
            props.load(input);
        }

        String clientId = required(props, "setu.client-id");
        String secret = required(props, "setu.client-secret");
        String product = required(props, "setu.product-id");

        String mode = required(props, "setu.network.mode");

        assertEquals(
            "SOCKS5",
            mode.trim().toUpperCase(),
            "Local live diagnostics require SOCKS5 mode"
        );

        String host = props.getProperty(
            "setu.proxy.host", "127.0.0.1"
        );

        int port = Integer.parseInt(
            props.getProperty("setu.proxy.port", "1080")
        );

        String expectedIp = System.getProperty(
            "setu.expected.egress.ip", ""
        ).trim();

        assertFalse(
            expectedIp.isBlank(),
            "Expected Mumbai EC2 public IP must be supplied"
        );

        ObjectMapper json = new ObjectMapper();

        var http = SetuHttpClient.create(mode, host, port);

        System.out.println("\n--- Java Mumbai egress ---");
        System.out.println("Network mode: " + mode);

        Request ipRequest = new Request.Builder()
            .url("https://checkip.amazonaws.com")
            .get()
            .build();

        try (var response =
                 http.newCall(ipRequest).execute()) {

            assertTrue(
                response.isSuccessful(),
                "Java egress check failed"
            );

            String ip = response.body().string().trim();

            System.out.println("Java public IP: " + ip);

            assertEquals(
                expectedIp,
                ip,
                "Java egress does not match Mumbai EC2"
            );
        }

        System.out.println("Mumbai egress verified: YES");

        SandboxGateway gateway = new SandboxGateway(
            json,
            clientId,
            secret,
            product,
            "",
            "",
            mode,
            host,
            port
        );

        System.out.println("\n--- Java Setu authentication and FIP API ---");

        var result = gateway.request("fips", null);

        assertNotNull(result, "Missing FIP response");

        var records = result.path("data");

        assertTrue(
            records.isArray(),
            "Expected FIP data array"
        );

        assertTrue(
            records.size() > 0,
            "No financial institutions returned"
        );

        System.out.println("Authentication: SUCCESS");
        System.out.println("FIP API: SUCCESS");
        System.out.println("Financial institutions: "
            + records.size());

        System.out.println(
            "\nSETU JAVA LIVE CONNECTIVITY CHECK: PASSED"
        );
    }

    private static String required(
            Properties props, String key) {

        String value = props.getProperty(key, "").trim();

        assertFalse(
            value.isBlank(),
            "Missing configuration: " + key
        );

        return value;
    }
}
