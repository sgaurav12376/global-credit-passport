variable "project" { type = string }
variable "vpc_id"  { type = string }

variable "private_subnet_ids" { type = list(string) }
variable "alb_sg_id"          { type = string }

variable "java_target_group_arn"   { type = string }
variable "python_target_group_arn" { type = string }

variable "java_path_prefix"   { type = string }
variable "python_path_prefix" { type = string }

resource "aws_lb" "alb" {
  name               = "${var.project}-alb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.private_subnet_ids
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = var.java_target_group_arn
  }
}

resource "aws_lb_listener_rule" "java" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = var.java_target_group_arn
  }

  condition {
    path_pattern {
      values = ["${var.java_path_prefix}/*", "${var.java_path_prefix}"]
    }
  }
}

resource "aws_lb_listener_rule" "python" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = var.python_target_group_arn
  }

  condition {
    path_pattern {
      values = ["${var.python_path_prefix}/*", "${var.python_path_prefix}"]
    }
  }
}

output "listener_arn" { value = aws_lb_listener.http.arn }
