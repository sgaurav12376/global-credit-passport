// src/services/dashboardApi.js
import { http } from "./http"

export async function getCreditScore(userId) {
  return http.get(`/dashboard/credit-score/${userId}`)
}

export async function getUtilization(userId) {
  return http.get(`/dashboard/utilization/${userId}`)
}

export async function getPaymentHistory(userId) {
  return http.get(`/dashboard/payment-history/${userId}`)
}
