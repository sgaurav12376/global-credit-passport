variable "project"             { type = string }
variable "private_subnet_ids"  { type = list(string) }
variable "vpclink_sg_id"       { type = string }

variable "alb_listener_arn"    { type = string }

variable "cognito_issuer"      { type = string }
variable "cognito_audience"    { type = string }

resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET","POST","PUT","DELETE","OPTIONS"]
    allow_headers = ["content-type","authorization"]
  }
}

resource "aws_apigatewayv2_vpc_link" "link" {
  name               = "${var.project}-vpclink"
  subnet_ids         = var.private_subnet_ids
  security_group_ids = [var.vpclink_sg_id]
}

resource "aws_apigatewayv2_integration" "alb" {
  api_id                  = aws_apigatewayv2_api.api.id
  integration_type        = "HTTP_PROXY"
  integration_method      = "ANY"
  connection_type         = "VPC_LINK"
  connection_id           = aws_apigatewayv2_vpc_link.link.id
  integration_uri         = var.alb_listener_arn
  payload_format_version  = "1.0"
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.api.id
  name             = "${var.project}-jwt"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    issuer   = var.cognito_issuer
    audience = [var.cognito_audience]
  }
}

resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.alb.id}"

  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

output "api_invoke_url" { value = aws_apigatewayv2_api.api.api_endpoint }
