variable "project" { type = string }
variable "vpc_id"  { type = string }

resource "aws_security_group" "vpclink" {
  name   = "${var.project}-sg-vpclink"
  vpc_id = var.vpc_id
  tags = { Name = "${var.project}-sg-vpclink" }
}

resource "aws_security_group" "alb" {
  name   = "${var.project}-sg-alb"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.vpclink.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-sg-alb" }
}

resource "aws_security_group_rule" "vpclink_to_alb" {
  type                     = "egress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  security_group_id        = aws_security_group.vpclink.id
  source_security_group_id = aws_security_group.alb.id
}

resource "aws_security_group" "ec2" {
  name   = "${var.project}-sg-ec2"
  vpc_id = var.vpc_id

  # allow ALB -> container port (we open a wide range for simplicity; you can lock to 8080)
  ingress {
    from_port       = 1
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-sg-ec2" }
}

output "vpclink_sg_id" { value = aws_security_group.vpclink.id }
output "alb_sg_id"     { value = aws_security_group.alb.id }
output "ec2_sg_id"     { value = aws_security_group.ec2.id }
