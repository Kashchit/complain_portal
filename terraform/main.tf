provider "aws" {
  region = var.aws_region
}

locals {
  common_tags = {
    Project = var.project_name
  }
}

resource "aws_security_group" "portal_sg" {
  name        = "${var.project_name}-sg"
  description = "Security group for complaint portal"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

resource "aws_iam_role" "cloudwatch_role" {
  name = "${var.project_name}-cloudwatch-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "cloudwatch_logs" {
  role       = aws_iam_role.cloudwatch_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

resource "aws_iam_instance_profile" "cloudwatch_profile" {
  name = "${var.project_name}-instance-profile"
  role = aws_iam_role.cloudwatch_role.name
  tags = local.common_tags
}

resource "aws_instance" "blue" {
  ami                  = var.ami_id
  instance_type        = var.instance_type
  key_name             = var.key_name
  vpc_security_group_ids = [aws_security_group.portal_sg.id]
  subnet_id            = var.subnet_ids[0]
  iam_instance_profile = aws_iam_instance_profile.cloudwatch_profile.name

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-blue"
    Environment = "blue"
  })
}

resource "aws_instance" "green" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.portal_sg.id]
  subnet_id              = var.subnet_ids[1]
  iam_instance_profile   = aws_iam_instance_profile.cloudwatch_profile.name

  tags = merge(local.common_tags, {
    Name        = "${var.project_name}-green"
    Environment = "green"
  })
}

resource "aws_lb" "portal_alb" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.portal_sg.id]
  subnets            = var.subnet_ids
  tags               = local.common_tags
}

resource "aws_lb_target_group" "blue" {
  name     = "${var.project_name}-blue-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
  }

  tags = local.common_tags
}

resource "aws_lb_target_group" "green" {
  name     = "${var.project_name}-green-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
  }

  tags = local.common_tags
}

resource "aws_lb_target_group_attachment" "blue_attachment" {
  target_group_arn = aws_lb_target_group.blue.arn
  target_id        = aws_instance.blue.id
  port             = 80
}

resource "aws_lb_target_group_attachment" "green_attachment" {
  target_group_arn = aws_lb_target_group.green.arn
  target_id        = aws_instance.green.id
  port             = 80
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.portal_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.blue.arn
  }
  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "apache_logs" {
  name              = "/complaint-portal/apache"
  retention_in_days = 7
  tags              = local.common_tags
}

resource "aws_cloudwatch_dashboard" "portal_dashboard" {
  dashboard_name = "${var.project_name}-dashboard"
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "log"
        x      = 0
        y      = 0
        width  = 24
        height = 8
        properties = {
          title  = "Recent Apache Access Logs"
          query  = "SOURCE '${aws_cloudwatch_log_group.apache_logs.name}' | fields @timestamp, @message | sort @timestamp desc | limit 20"
          region = var.aws_region
          view   = "table"
        }
      }
    ]
  })
}
