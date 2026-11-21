package com.synergyresources.gcp.passport.crs;
import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import org.junit.jupiter.api.Test;
class CrsTransUnionNormalizerTest {
  @Test void normalizesSyntheticDocumentedShape() throws Exception {try(InputStream in=getClass().getResourceAsStream("/fixtures/crs-transunion-synthetic.json")){var report=new CrsTransUnionNormalizer().normalize(new ObjectMapper().readTree(in),"fixture");assertEquals("TRANSUNION",report.bureau());assertEquals(751,report.creditScore());assertEquals(3,report.summary().totalAccounts());assertEquals(2,report.tradelines().size());assertFalse(report.scoreFactors().isEmpty());}}
}
