#!/bin/bash
set -e

# Define variables
NGINX_CONF="/etc/nginx/sites-available/pdf.tsolife.com"
APP_ROOT="/home/ubuntu/pdf.tsolife.com" # Replace with the actual deployment path for your Angular app

# Create Nginx configuration for Angular application
echo "Creating Nginx configuration file..."
sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    server_name localhost;
    server_tokens off;
    root $APP_ROOT;
    # add_header X-Frame-Options "SAMEORIGIN";
    # add_header X-XSS-Protection "1; mode=block";
    # add_header X-Content-Type-Options "nosniff";

    index index.html index.htm index.php;

    charset utf-8;

    location / {
      proxy_set_header X-Real-IP \$remote_addr;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header Host \$http_host;
      proxy_pass http://127.0.0.1:8088/;
      proxy_redirect off;
      proxy_connect_timeout 600;
      proxy_send_timeout 600;
      proxy_read_timeout 600;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    # access_log /var/log/nginx/alpha.tsolife.com;
    # error_log  /var/log/nginx/alpha.tsolife.com-error.log error;

    #error_page 404 /index.php;

    location ~ /\.(?!well-known).* {
        deny all;
    }
}

EOF

# Enable the new configuration
echo "Enabling Nginx configuration..."
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
echo "Testing Nginx configuration..."
sudo nginx -t

echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "Nginx setup complete."


