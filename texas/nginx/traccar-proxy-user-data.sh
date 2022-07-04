#!/usr/bin/env bash
# aimed at Amazon Linux 2 AMI
yum update -y
amazon-linux-extras install nginx1
cat << EOF > /etc/nginx/nginx.conf
load_module /usr/lib64/nginx/modules/ngx_stream_module.so;
worker_processes auto;
events {
    worker_connections 1024;
}
stream {
    server { listen 8080; proxy_pass texas.ct-a.ws:8080; }
    server { listen 5000; proxy_pass texas.ct-a.ws:5000; }
    server { listen 5001; proxy_pass texas.ct-a.ws:5001; }
    server { listen 5002; proxy_pass texas.ct-a.ws:5002; }
    server { listen 5003; proxy_pass texas.ct-a.ws:5003; }
    server { listen 5004; proxy_pass texas.ct-a.ws:5004; }
    server { listen 5005; proxy_pass texas.ct-a.ws:5005; }
    server { listen 5006; proxy_pass texas.ct-a.ws:5006; }
    server { listen 5007; proxy_pass texas.ct-a.ws:5007; }
    server { listen 5008; proxy_pass texas.ct-a.ws:5008; }
    server { listen 5009; proxy_pass texas.ct-a.ws:5009; }
}
EOF
systemctl enable nginx.service
systemctl restart nginx.service
