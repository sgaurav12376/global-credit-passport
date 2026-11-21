package com.synergyresources.gcp.passport.crs;
import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import org.junit.jupiter.api.Test;
class CrsExperianNormalizerTest {
  @Test void normalizesSyntheticDocumentedShape() throws Exception {try(InputStream in=getClass().getResourceAsStream("/fixtures/crs-experian-synthetic.json")){var report=new CrsExperianNormalizer().normalize(new ObjectMapper().readTree(in),"fixture");assertEquals("EXPERIAN",report.bureau());assertEquals(728,report.creditScore());assertEquals(2,report.summary().totalAccounts());assertEquals(2,report.tradelines().size());assertFalse(report.scoreFactors().isEmpty());}}
}
