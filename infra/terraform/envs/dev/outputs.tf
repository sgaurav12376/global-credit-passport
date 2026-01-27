output "api_invoke_url" { value = module.apigw.api_invoke_url }
output "cognito_user_pool_id" { value = module.cognito.user_pool_id }
output "cognito_app_client_id" { value = module.cognito.app_client_id }
output "java_ecr_repo" { value = module.ecr.java_repo_url }
output "python_ecr_repo" { value = module.ecr.python_repo_url }