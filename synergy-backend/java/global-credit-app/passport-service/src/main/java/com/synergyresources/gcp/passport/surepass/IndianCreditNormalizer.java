package com.synergyresources.gcp.passport.surepass;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class IndianCreditNormalizer {
  private static final Pattern CRIF_DPD = Pattern.compile(",([0-9]{3})/");

  public NormalizedCreditReport normalizeCrif(JsonNode response) {
    JsonNode data = response.path("data");
    JsonNode report = data.path("credit_report");
    JsonNode accountSummary = report.path("ACCOUNTS-SUMMARY");
    JsonNode primary = accountSummary.path("PRIMARY-ACCOUNTS-SUMMARY");
    JsonNode derived = accountSummary.path("DERIVED-ATTRIBUTES");

    List<NormalizedCreditReport.Tradeline> tradelines = new ArrayList<>();
    for (JsonNode wrapper : arrayOrSingleton(report.path("RESPONSES").path("RESPONSE"))) {
      JsonNode loan = wrapper.path("LOAN-DETAILS");
      if (!loan.isObject()) {
        continue;
      }
      tradelines.add(new NormalizedCreditReport.Tradeline(
          mask(loan.path("ACCT-NUMBER").asText(null)),
          text(loan, "ACCT-TYPE"),
          text(loan, "ACCOUNT-STATUS"),
          money(loan, "CURRENT-BAL"),
          firstMoney(loan, "DISBURSED-AMT", "SANCTIONED-AMT"),
          money(loan, "OVERDUE-AMT"),
          money(loan, "WRITE-OFF-AMT"),
          maxCrifDpd(loan.path("COMBINED-PAYMENT-HISTORY").asText("")),
          text(loan, "DISBURSED-DT"),
          text(loan, "DATE-REPORTED")
      ));
    }

    Integer total = integer(primary, "PRIMARY-NUMBER-OF-ACCOUNTS");
    List<String> warnings = new ArrayList<>();
    if (total != null && total != tradelines.size()) {
      warnings.add(
          "Bureau summary reports " + total + " accounts but detailed response contains "
              + tradelines.size() + " tradelines"
      );
    }

    Integer historyMonths = combineYearsMonths(
        integer(derived, "LENGTH-OF-CREDIT-HISTORY-YEAR"),
        integer(derived, "LENGTH-OF-CREDIT-HISTORY-MONTH")
    );

    return new NormalizedCreditReport(
        "CRIF",
        text(data, "client_id"),
        integer(data, "credit_score"),
        300,
        900,
        List.of(),
        new NormalizedCreditReport.Summary(
            total,
            integer(primary, "PRIMARY-ACTIVE-NUMBER-OF-ACCOUNTS"),
            subtract(total, integer(primary, "PRIMARY-ACTIVE-NUMBER-OF-ACCOUNTS")),
            integer(primary, "PRIMARY-OVERDUE-NUMBER-OF-ACCOUNTS"),
            integer(primary, "PRIMARY-SECURED-NUMBER-OF-ACCOUNTS"),
            integer(primary, "PRIMARY-UNSECURED-NUMBER-OF-ACCOUNTS"),
            money(primary, "PRIMARY-CURRENT-BALANCE"),
            money(primary, "PRIMARY-SANCTIONED-AMOUNT"),
            historyMonths,
            integer(derived, "INQURIES-IN-LAST-SIX-MONTHS"),
            maxTradelineDpd(tradelines),
            countWrittenOff(tradelines)
        ),
        List.copyOf(tradelines),
        List.copyOf(warnings)
    );
  }

  public NormalizedCreditReport normalizeExperian(JsonNode response) {
    JsonNode data = response.path("data");
    JsonNode report = data.path("credit_report");
    JsonNode cais = report.path("CAIS_Account");
    JsonNode credit = cais.path("CAIS_Summary").path("Credit_Account");
    JsonNode balances = cais.path("CAIS_Summary").path("Total_Outstanding_Balance");

    List<NormalizedCreditReport.Tradeline> tradelines = new ArrayList<>();
    JsonNode details = cais.path("CAIS_Account_DETAILS");
    if (details.isArray()) {
      for (JsonNode account : details) {
        tradelines.add(new NormalizedCreditReport.Tradeline(
            mask(account.path("Account_Number").asText(null)),
            text(account, "Account_Type"),
            text(account, "Account_Status"),
            money(account, "Current_Balance"),
            money(account, "Highest_Credit_or_Original_Loan_Amount"),
            money(account, "Amount_Past_Due"),
            money(account, "Written_Off_Amt_Total"),
            maxExperianDpd(account.path("CAIS_Account_History")),
            text(account, "Open_Date"),
            text(account, "Date_Reported")
        ));
      }
    }

    Integer total = integer(credit, "CreditAccountTotal");
    List<String> warnings = new ArrayList<>();
    if (total != null && total != tradelines.size()) {
      warnings.add(
          "Bureau summary reports " + total + " accounts but detailed response contains "
              + tradelines.size() + " tradelines"
      );
    }

    return new NormalizedCreditReport(
        "EXPERIAN",
        text(data, "client_id"),
        integer(data, "credit_score"),
        300,
        900,
        List.of(),
        new NormalizedCreditReport.Summary(
            total,
            integer(credit, "CreditAccountActive"),
            integer(credit, "CreditAccountClosed"),
            integer(credit, "CreditAccountDefault"),
            null,
            null,
            money(balances, "Outstanding_Balance_All"),
            null,
            null,
            null,
            maxTradelineDpd(tradelines),
            countWrittenOff(tradelines)
        ),
        List.copyOf(tradelines),
        List.copyOf(warnings)
    );
  }

  public NormalizedCreditReport normalizeCibilPdf(JsonNode response) {
    JsonNode data = response.path("data");
    return new NormalizedCreditReport(
        "CIBIL",
        text(data, "client_id"),
        integer(data, "credit_score"),
        300,
        900,
        List.of(),
        new NormalizedCreditReport.Summary(
            null, null, null, null, null, null,
            null, null, null, null, null, null
        ),
        List.of(),
        List.of("Surepass returned a CIBIL PDF; structured tradelines are not available")
    );
  }

  public NormalizedCreditReport normalizeCibil(JsonNode response) {
    JsonNode data = response.path("data");
    List<JsonNode> reports = arrayOrSingleton(data.path("credit_report"));
    if (reports.isEmpty()) {
      throw new IllegalStateException("Surepass CIBIL response did not include a structured report");
    }
    JsonNode report = reports.get(0);
    JsonNode consumerSummary = report.path("response").path("consumerSummaryresp");
    JsonNode accountSummary = consumerSummary.path("accountSummary");
    JsonNode inquirySummary = consumerSummary.path("inquirySummary");

    List<NormalizedCreditReport.Tradeline> tradelines = new ArrayList<>();
    for (JsonNode account : arrayOrSingleton(report.path("accounts"))) {
      String closedDate = text(account, "dateClosed");
      boolean active = closedDate == null || closedDate.equalsIgnoreCase("NA");
      tradelines.add(new NormalizedCreditReport.Tradeline(
          mask(account.path("accountNumber").asText(null)),
          text(account, "accountType"),
          active ? "Active" : "Closed",
          nonNegativeMoney(account, "currentBalance"),
          nonNegativeMoney(account, "highCreditAmount"),
          nonNegativeMoney(account, "amountOverdue"),
          nonNegativeMoney(account, "woAmountTotal"),
          maxCibilDpd(account),
          text(account, "dateOpened"),
          text(account, "dateReported")
      ));
    }

    Integer total = integer(accountSummary, "totalAccounts");
    int active = Math.toIntExact(tradelines.stream()
        .filter(line -> "Active".equals(line.accountStatus()))
        .count());
    List<String> warnings = new ArrayList<>();
    if (reports.size() > 1) {
      warnings.add("Surepass returned multiple CIBIL report sections; the first was normalized");
    }
    if (total != null && total != tradelines.size()) {
      warnings.add(
          "Bureau summary reports " + total + " accounts but detailed response contains "
              + tradelines.size() + " tradelines"
      );
    }

    return new NormalizedCreditReport(
        "CIBIL",
        text(data, "client_id"),
        integer(data, "credit_score"),
        300,
        900,
        cibilScoreFactors(report),
        new NormalizedCreditReport.Summary(
            total,
            active,
            total == null ? null : Math.max(0, total - active),
            integer(accountSummary, "overdueAccounts"),
            null,
            null,
            nonNegativeMoney(accountSummary, "currentBalance"),
            nonNegativeMoney(accountSummary, "highCreditAmount"),
            creditHistoryMonths(text(accountSummary, "oldestDateOpened")),
            integer(inquirySummary, "totalInquiry"),
            maxTradelineDpd(tradelines),
            countWrittenOff(tradelines)
        ),
        List.copyOf(tradelines),
        List.copyOf(warnings)
    );
  }

  private Integer maxCibilDpd(JsonNode account) {
    Integer maximum = null;
    for (JsonNode month : arrayOrSingleton(account.path("monthlyPayStatus"))) {
      Integer value = parseNonNegativeInteger(month.path("status").asText(null));
      if (value != null) {
        maximum = maximum == null ? value : Math.max(maximum, value);
      }
    }
    if (maximum != null) return maximum;

    String history = account.path("paymentHistory").asText("");
    if (history.matches("[0-9]+") && history.length() % 3 == 0) {
      for (int offset = 0; offset < history.length(); offset += 3) {
        int value = Integer.parseInt(history.substring(offset, offset + 3));
        maximum = maximum == null ? value : Math.max(maximum, value);
      }
    }
    return maximum;
  }

  private List<String> cibilScoreFactors(JsonNode report) {
    List<String> factors = new ArrayList<>();
    for (JsonNode score : arrayOrSingleton(report.path("scores"))) {
      for (JsonNode reason : arrayOrSingleton(score.path("reasonCodes"))) {
        String name = text(reason, "reasonCodeName");
        String value = text(reason, "reasonCodeValue");
        String factor = name != null ? name : value;
        if (factor != null && !factors.contains(factor)) {
          factors.add(factor);
        }
      }
    }
    return List.copyOf(factors);
  }

  private Integer parseNonNegativeInteger(String value) {
    if (value == null || value.isBlank() || !value.matches("[0-9]{1,3}")) {
      return null;
    }
    return Integer.valueOf(value);
  }

  private BigDecimal nonNegativeMoney(JsonNode node, String field) {
    BigDecimal value = money(node, field);
    return value == null || value.signum() < 0 ? null : value;
  }

  private Integer creditHistoryMonths(String oldestDateOpened) {
    if (oldestDateOpened == null) return null;
    try {
      LocalDate opened = LocalDate.parse(oldestDateOpened).withDayOfMonth(1);
      LocalDate current = LocalDate.now().withDayOfMonth(1);
      return Math.max(0, Math.toIntExact(ChronoUnit.MONTHS.between(opened, current)));
    } catch (DateTimeParseException exception) {
      return null;
    }
  }

  private List<JsonNode> arrayOrSingleton(JsonNode node) {
    if (node.isArray()) {
      List<JsonNode> values = new ArrayList<>();
      node.forEach(values::add);
      return values;
    }
    return node.isObject() ? List.of(node) : List.of();
  }

  private Integer maxCrifDpd(String history) {
    Matcher matcher = CRIF_DPD.matcher(history);
    Integer maximum = null;
    while (matcher.find()) {
      int value = Integer.parseInt(matcher.group(1));
      maximum = maximum == null ? value : Math.max(maximum, value);
    }
    return maximum;
  }

  private Integer maxExperianDpd(JsonNode history) {
    if (!history.isArray()) {
      return null;
    }
    Integer maximum = null;
    for (JsonNode month : history) {
      Integer value = integer(month, "Days_Past_Due");
      if (value != null) {
        maximum = maximum == null ? value : Math.max(maximum, value);
      }
    }
    return maximum;
  }

  private Integer maxTradelineDpd(List<NormalizedCreditReport.Tradeline> tradelines) {
    return tradelines.stream()
        .map(NormalizedCreditReport.Tradeline::maximumDaysPastDue)
        .filter(value -> value != null)
        .max(Integer::compareTo)
        .orElse(null);
  }

  private Integer countWrittenOff(List<NormalizedCreditReport.Tradeline> tradelines) {
    return Math.toIntExact(tradelines.stream()
        .map(NormalizedCreditReport.Tradeline::writtenOffAmount)
        .filter(value -> value != null && value.compareTo(BigDecimal.ZERO) > 0)
        .count());
  }

  private String mask(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    String visible = value.length() <= 4 ? value : value.substring(value.length() - 4);
    return "****" + visible;
  }

  private String text(JsonNode node, String field) {
    JsonNode value = node.path(field);
    if (value.isMissingNode() || value.isNull()) {
      return null;
    }
    String text = value.asText();
    return text.isBlank() ? null : text;
  }

  private Integer integer(JsonNode node, String field) {
    String value = text(node, field);
    if (value == null) {
      return null;
    }
    try {
      return Integer.valueOf(value.replace(",", "").trim());
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  private BigDecimal money(JsonNode node, String field) {
    String value = text(node, field);
    if (value == null) {
      return null;
    }
    try {
      return new BigDecimal(value.replace(",", "").trim());
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  private BigDecimal firstMoney(JsonNode node, String... fields) {
    for (String field : fields) {
      BigDecimal value = money(node, field);
      if (value != null) {
        return value;
      }
    }
    return null;
  }

  private Integer combineYearsMonths(Integer years, Integer months) {
    if (years == null && months == null) {
      return null;
    }
    return (years == null ? 0 : years * 12) + (months == null ? 0 : months);
  }

  private Integer subtract(Integer left, Integer right) {
    return left == null || right == null ? null : Math.max(0, left - right);
  }
}
