package com.synergyresources.gcp.passport.setu;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.ServerSocket;
import java.io.IOException;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SetuHttpClientTest {

    @Test
    void directModeDisablesProxy() {

        OkHttpClient client =
            SetuHttpClient.create("DIRECT", "", 0);

        assertEquals(Proxy.NO_PROXY, client.proxy());
    }

    @Test
    void socks5ModeUsesConfiguredProxy() {

        OkHttpClient client =
            SetuHttpClient.create(
                "SOCKS5", "127.0.0.1", 1080
            );

        assertEquals(
            Proxy.Type.SOCKS,
            client.proxy().type()
        );

        InetSocketAddress address =
            (InetSocketAddress) client.proxy().address();

        assertEquals("127.0.0.1", address.getHostString());
        assertEquals(1080, address.getPort());
    }

    @Test
    void invalidNetworkModeIsRejected() {

        assertThrows(
            IllegalArgumentException.class,
            () -> SetuHttpClient.create(
                "INVALID", "127.0.0.1", 1080
            )
        );
    }

    @Test
    void missingNetworkModeIsRejected() {

        assertThrows(
            IllegalArgumentException.class,
            () -> SetuHttpClient.create(
                "", "127.0.0.1", 1080
            )
        );
    }

    @Test
    void invalidProxyConfigurationIsRejected() {

        assertThrows(
            IllegalArgumentException.class,
            () -> SetuHttpClient.create(
                "SOCKS5", "", 1080
            )
        );

        assertThrows(
            IllegalArgumentException.class,
            () -> SetuHttpClient.create(
                "SOCKS5", "127.0.0.1", 0
            )
        );
    }

    @Test
    void automaticRetriesAndRedirectsAreDisabled() {

        OkHttpClient client =
            SetuHttpClient.create("DIRECT", "", 0);

        assertFalse(client.retryOnConnectionFailure());
        assertFalse(client.followRedirects());
        assertFalse(client.followSslRedirects());
    }

    @Test
    void unavailableProxyFailsRequest() throws IOException {

        int port;

        try (ServerSocket socket = new ServerSocket(0)) {
            port = socket.getLocalPort();
        }

        OkHttpClient client =
            SetuHttpClient.create(
                "SOCKS5", "127.0.0.1", port
            );

        Request request = new Request.Builder()
            .url("http://127.0.0.1:" + port)
            .build();

        assertThrows(IOException.class, () -> {
            try (var response =
                    client.newCall(request).execute()) {
                // An unavailable proxy must fail.
            }
        });
    }
}
