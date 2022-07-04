#!/usr/bin/env bash
# aimed at Amazon Linux 2 AMI
yum update -y
yum install -y git
amazon-linux-extras install docker
service docker start
usermod -a -G docker ec2-user
chkconfig docker on
curl -L https://github.com/docker/compose/releases/download/1.23.2/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
su ec2-user -lc "cat /dev/zero | ssh-keygen -N \"\""
reboot

# manually, after reboot
cat .ssh/id_rsa.pub # copy to texas project access keys
git clone --recurse-submodules ssh://git@labs.consilium.technology:7999/texas/texas.deploy.git
cd texas.deploy
./deploy.sh
