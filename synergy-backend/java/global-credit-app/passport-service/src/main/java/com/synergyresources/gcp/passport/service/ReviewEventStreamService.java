package com.synergyresources.gcp.passport.service;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class ReviewEventStreamService {
  private static final long STREAM_TIMEOUT_MS = 30L * 60L * 1000L;
  private final ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> borrowerStreams =
      new ConcurrentHashMap<>();
  private final ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> lenderStreams =
      new ConcurrentHashMap<>();

  public SseEmitter subscribeBorrower(UUID passportId) {
    return subscribe(borrowerStreams, passportId);
  }

  public SseEmitter subscribeLender(UUID shareId) {
    return subscribe(lenderStreams, shareId);
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void reviewChanged(ReviewChangedEvent event) {
    send(borrowerStreams, event.passportId(), event);
    send(lenderStreams, event.shareId(), event);
    if ("SHARE_REVOKED".equals(event.eventType())) complete(lenderStreams, event.shareId());
  }

  private SseEmitter subscribe(
      ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> streams, UUID key
  ) {
    SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
    streams.computeIfAbsent(key, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
    Runnable remove = () -> remove(streams, key, emitter);
    emitter.onCompletion(remove);
    emitter.onTimeout(remove);
    emitter.onError(ignored -> remove.run());
    try {
      emitter.send(SseEmitter.event().name("CONNECTED").data("{}"));
    } catch (IOException exception) {
      remove.run();
      emitter.completeWithError(exception);
    }
    return emitter;
  }

  private void send(
      ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> streams,
      UUID key,
      ReviewChangedEvent event
  ) {
    var emitters = streams.get(key);
    if (emitters == null) return;
    for (SseEmitter emitter : emitters) {
      try {
        emitter.send(SseEmitter.event().name("REVIEW_UPDATED").data(event));
      } catch (IOException | IllegalStateException exception) {
        remove(streams, key, emitter);
        emitter.complete();
      }
    }
  }

  private void remove(
      ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> streams,
      UUID key,
      SseEmitter emitter
  ) {
    var emitters = streams.get(key);
    if (emitters == null) return;
    emitters.remove(emitter);
    if (emitters.isEmpty()) streams.remove(key, emitters);
  }

  private void complete(
      ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> streams, UUID key
  ) {
    var emitters = streams.remove(key);
    if (emitters == null) return;
    for (SseEmitter emitter : emitters) emitter.complete();
  }
}
