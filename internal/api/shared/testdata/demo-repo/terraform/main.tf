# SYNTHETIC DEMO — public S3 ACL for IaC analysis tests.
resource "aws_s3_bucket" "demo" {
  bucket = "rivicq-demo-public-bucket"
  acl    = "public-read"
}

resource "aws_security_group_rule" "ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = "sg-demo"
}
