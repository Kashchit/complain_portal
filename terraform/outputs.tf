output "blue_ec2_public_ip" {
  value = aws_instance.blue.public_ip
}

output "green_ec2_public_ip" {
  value = aws_instance.green.public_ip
}

output "alb_dns_name" {
  value = "http://${aws_lb.portal_alb.dns_name}"
}

output "blue_target_group_arn" {
  value = aws_lb_target_group.blue.arn
}

output "green_target_group_arn" {
  value = aws_lb_target_group.green.arn
}

output "alb_listener_arn" {
  value = aws_lb_listener.http.arn
}

output "cloudwatch_log_group_name" {
  value = aws_cloudwatch_log_group.apache_logs.name
}
