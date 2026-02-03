variable "project" { type = string }
variable "service_name" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "instance_sg_id" { type = string }
variable "alb_sg_id" { type = string }

variable "container_port" { type = number }
variable "ecr_repo_url" { type = string }
variable "image_tag" { type = string }

data "aws_region" "current" {}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_iam_role" "ec2_role" {
  name = "${var.project}-${var.service_name}-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect    = "Allow",
      Principal = { Service = "ec2.amazonaws.com" },
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "cw_agent" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "profile" {
  name = "${var.project}-${var.service_name}-instance-profile"
  role = aws_iam_role.ec2_role.name
}

locals {
  user_data = <<-EOF
    #!/bin/bash
    set -e

    dnf -y update
    dnf -y install docker

    systemctl enable docker
    systemctl start docker

    REGION="${data.aws_region.current.name}"

    aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$(echo "${var.ecr_repo_url}" | cut -d/ -f1)"

    docker pull "${var.ecr_repo_url}:${var.image_tag}"

    # stop old container if exists
    docker rm -f ${var.service_name} || true

    docker run -d --restart=always \
      --name ${var.service_name} \
      -p ${var.container_port}:${var.container_port} \
      "${var.ecr_repo_url}:${var.image_tag}"
  EOF
}

resource "aws_launch_template" "lt" {
  name_prefix   = "${var.project}-${var.service_name}-lt-"
  image_id      = data.aws_ami.al2023.id
  instance_type = "t3.micro"

  iam_instance_profile { name = aws_iam_instance_profile.profile.name }
  vpc_security_group_ids = [var.instance_sg_id]

  user_data = base64encode(local.user_data)

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name    = "${var.project}-${var.service_name}"
      Service = var.service_name
    }
  }
}

resource "aws_lb_target_group" "tg" {
  name        = "${var.project}-${replace(var.service_name, "_", "-")}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "instance"

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_autoscaling_group" "asg" {
  name                = "${var.project}-${var.service_name}-asg"
  desired_capacity    = 2
  min_size            = 2
  max_size            = 3
  vpc_zone_identifier = var.private_subnet_ids

  launch_template {
    id      = aws_launch_template.lt.id
    version = "$Latest"
  }

  health_check_type         = "ELB"
  health_check_grace_period = 90

  tag {
    key                 = "Name"
    value               = "${var.project}-${var.service_name}"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_attachment" "attach" {
  autoscaling_group_name = aws_autoscaling_group.asg.name
  lb_target_group_arn    = aws_lb_target_group.tg.arn
}

output "target_group_arn" { value = aws_lb_target_group.tg.arn }
