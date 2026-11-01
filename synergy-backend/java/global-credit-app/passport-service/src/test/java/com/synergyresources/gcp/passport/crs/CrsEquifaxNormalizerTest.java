package com.synergyresources.gcp.passport.crs;
import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
class CrsEquifaxNormalizerTest {
  @Test void normalizesDocumentedFixtureEnvelope() throws Exception {
    var json = new ObjectMapper().readTree("""
        {"pdfReportId":"sample","data":{"creditScore":742,"summary":{"totalAccounts":6,"activeAccounts":4,"totalBalance":18400,"totalCreditLimit":62000,"creditHistoryMonths":54,"recentInquiries":1}}}
        """);
    var report=new CrsEquifaxNormalizer().normalize(json,"sample");
    assertEquals("EQUIFAX",report.bureau()); assertEquals(742,report.creditScore());
    assertEquals(6,report.summary().totalAccounts()); assertEquals(4,report.summary().activeAccounts());
    assertEquals(54,report.summary().creditHistoryMonths()); assertEquals(1,report.summary().recentEnquiries());
  }
}
