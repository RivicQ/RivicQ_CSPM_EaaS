resource "aws_s3_bucket" "public" {
  bucket = "rivicq-fixture-public"
  acl    = "public-read"
}

resource "aws_security_group" "open" {
  name = "open-ssh"
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
