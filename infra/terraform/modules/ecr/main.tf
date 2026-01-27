variable "project" { type = string }

resource "aws_ecr_repository" "java" {
  name = "${var.project}-java-api"
  image_scanning_configuration { scan_on_push = true }
}

resource "aws_ecr_repository" "python" {
  name = "${var.project}-python-score"
  image_scanning_configuration { scan_on_push = true }
}

output "java_repo_url"   { value = aws_ecr_repository.java.repository_url }
output "python_repo_url" { value = aws_ecr_repository.python.repository_url }
