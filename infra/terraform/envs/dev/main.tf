module "network" {
  source   = "../../modules/network"
  project  = var.project
  vpc_cidr = var.vpc_cidr
  az_count = var.az_count
}

module "security" {
  source  = "../../modules/security"
  project = var.project
  vpc_id  = module.network.vpc_id
}

module "ecr" {
  source  = "../../modules/ecr"
  project = var.project
}

module "compute_java" {
  source             = "../../modules/compute_service"
  project            = var.project
  service_name       = "java-api"
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  instance_sg_id     = module.security.ec2_sg_id
  alb_sg_id          = module.security.alb_sg_id
  container_port     = var.java_container_port
  ecr_repo_url       = module.ecr.java_repo_url
  image_tag          = var.java_image_tag
}

module "compute_python" {
  source             = "../../modules/compute_service"
  project            = var.project
  service_name       = "python-score"
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  instance_sg_id     = module.security.ec2_sg_id
  alb_sg_id          = module.security.alb_sg_id
  container_port     = var.python_container_port
  ecr_repo_url       = module.ecr.python_repo_url
  image_tag          = var.python_image_tag
}

module "alb" {
  source             = "../../modules/alb"
  project            = var.project
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  alb_sg_id          = module.security.alb_sg_id

  java_target_group_arn   = module.compute_java.target_group_arn
  python_target_group_arn = module.compute_python.target_group_arn

  java_path_prefix   = "/api"
  python_path_prefix = "/score"
}

module "cognito" {
  source     = "../../modules/cognito"
  project    = var.project
  aws_region = var.aws_region
}

module "apigw" {
  source             = "../../modules/apigw"
  project            = var.project
  private_subnet_ids = module.network.private_subnet_ids
  vpclink_sg_id      = module.security.vpclink_sg_id

  alb_listener_arn = module.alb.listener_arn

  cognito_issuer   = module.cognito.issuer
  cognito_audience = module.cognito.app_client_id
}