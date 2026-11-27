package com.synergyresources.gcp.passport.setu;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;

final class SetuHttpClient {

    private SetuHttpClient() {
    }

    static OkHttpClient create(
            String networkMode,
            String proxyHost,
            int proxyPort) {

        if (networkMode == null || networkMode.isBlank()) {
            throw new IllegalArgumentException(
                "Setu network mode must be configured"
            );
        }

        String mode = networkMode.trim()
                .toUpperCase(Locale.ROOT);

        OkHttpClient.Builder builder =
            new OkHttpClient.Builder()
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .callTimeout(20, TimeUnit.SECONDS)
                .retryOnConnectionFailure(false)
                .followRedirects(false)
                .followSslRedirects(false);

        switch (mode) {

            case "DIRECT":
                builder.proxy(Proxy.NO_PROXY);
                break;

            case "SOCKS5":

                if (proxyHost == null ||
                    proxyHost.isBlank() ||
                    proxyPort < 1 ||
                    proxyPort > 65535) {

                    throw new IllegalArgumentException(
                        "Invalid Setu SOCKS5 proxy configuration"
                    );
                }

                builder.proxy(
                    new Proxy(
                        Proxy.Type.SOCKS,
                        new InetSocketAddress(
                            proxyHost,
                            proxyPort
                        )
                    )
                );
                break;

            default:
                throw new IllegalArgumentException(
                    "Unsupported Setu network mode"
                );
        }

        return builder.build();
    }
}
