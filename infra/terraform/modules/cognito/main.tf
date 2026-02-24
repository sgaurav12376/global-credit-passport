variable "project"    { type = string }
variable "aws_region" { type = string }

# --- IAM role that allows Cognito to publish SMS via SNS ---
resource "aws_iam_role" "cognito_sms_role" {
  name = "${var.project}-cognito-sms-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "cognito-idp.amazonaws.com" },
      Action = "sts:AssumeRole",
      Condition = {
        StringEquals = {
          "sts:ExternalId" = "${var.project}-cognito-sms"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "cognito_sms_policy" {
  name = "${var.project}-cognito-sms-policy"
  role = aws_iam_role.cognito_sms_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "sns:Publish"
      ],
      Resource = "*"
    }]
  })
}

resource "aws_cognito_user_pool" "pool" {
  name = "${var.project}-user-pool"

  # ✅ allow username to be either email or phone
  username_attributes      = ["email", "phone_number"]

  # ✅ verify either channel
  auto_verified_attributes = ["email", "phone_number"]

  # SMS support (Cognito -> SNS)
  sms_configuration {
    external_id    = "${var.project}-cognito-sms"
    sns_caller_arn = aws_iam_role.cognito_sms_role.arn
  }

  password_policy {
    minimum_length    = 10
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = false
  }

  # Optional: keep it flexible
  mfa_configuration = "OFF"
}

resource "aws_cognito_user_pool_client" "client" {
  name         = "${var.project}-app-client"
  user_pool_id = aws_cognito_user_pool.pool.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  # If you use Hosted UI later, you’ll add callback/logout URLs here.
}

output "user_pool_id"  { value = aws_cognito_user_pool.pool.id }
output "app_client_id" { value = aws_cognito_user_pool_client.client.id }
output "issuer"        { value = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.pool.id}" }