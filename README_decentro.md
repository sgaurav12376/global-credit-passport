# Global Credit Score – Decentro Integration Scripts

This branch contains Python modules for integrating Decentro’s financial services APIs with PostgreSQL, supporting credit data retrieval, scoring, and reporting for the Global_Credit_App project.

---

## 📂 Modules Overview

| File              | Purpose                                                                 |
|-------------------|-------------------------------------------------------------------------|
| `datapull.py`     | Pulls financial data from Decentro’s `/data/pull` endpoint and logs it  |
| `creditscore.py`  | Fetches credit score via `/bytes/credit-score` and stores structured response |
| `creditreport.py` | Retrieves credit bureau summary report via `/credit_bureau/credit_report/summary` |

---

## 🛠️ How to Run

Each script can be executed independently via command line:

```bash
python datapull.py --name "VALID FULL NAME" --mobile "VALID 10-DIGIT INDIAN MOBILE"
python creditscore.py
python creditreport.py
