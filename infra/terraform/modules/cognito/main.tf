variable "project"    { type = string }
variable "aws_region" { type = string }

resource "aws_cognito_user_pool" "pool" {
  name = "${var.project}-user-pool"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 10
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "${var.project}-app-client"
  user_pool_id = aws_cognito_user_pool.pool.id

  generate_secret     = false
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}

output "user_pool_id"  { value = aws_cognito_user_pool.pool.id }
output "app_client_id" { value = aws_cognito_user_pool_client.client.id }
output "issuer"        { value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.pool.id}" }
