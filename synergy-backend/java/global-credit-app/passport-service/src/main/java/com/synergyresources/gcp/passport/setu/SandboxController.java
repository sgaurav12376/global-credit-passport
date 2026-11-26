package com.synergyresources.gcp.passport.setu;

import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import com.synergyresources.gcp.passport.repo.PassportRepo;
import com.synergyresources.gcp.passport.security.CurrentBorrower;

@RestController
@RequestMapping("/v1/passports/{id}/india-account")
@ConditionalOnProperty(name="setu.sandbox.enabled",havingValue="true")
class SandboxController {
  private final PassportRepo passports;
  private final SandboxGateway api;
  private final Map<UUID,SandboxFlow> flows=new HashMap<>();
  private final Map<String,String> dates;
  SandboxController(PassportRepo passports,SandboxGateway api,@Value("${setu.data-from}") String from,
      @Value("${setu.data-to}") String to) {
    if(!Instant.parse(from).isBefore(Instant.parse(to))) throw new IllegalArgumentException("Invalid test date range");
    this.passports=passports; this.api=api; dates=Map.of("from",from,"to",to);
  }
  private synchronized SandboxFlow flow(UUID id) {
    var p=passports.findByIdAndUserId(id,CurrentBorrower.id())
      .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
    if(!"IN".equals(p.getOriginCountry()) || !"IN_PROGRESS".equals(p.getStatus()))
      throw new ResponseStatusException(HttpStatus.CONFLICT);
    if(!flows.containsKey(id) && flows.size()>=256) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
    return flows.computeIfAbsent(id,k->new SandboxFlow());
  }
  @GetMapping SandboxFlow.View status(@PathVariable("id") UUID id){return flow(id).view();}
  @PostMapping("launch") SandboxFlow.View launch(@PathVariable("id") UUID id){return flow(id).start(api,dates);}
  @PostMapping("check") SandboxFlow.View check(@PathVariable("id") UUID id){return flow(id).check(api);}
  @ExceptionHandler({IllegalStateException.class,IllegalArgumentException.class})
  @ResponseStatus(HttpStatus.BAD_GATEWAY) void unavailable(){}
}
