#!/bin/bash
set -e

sudo chown -R www-data:www-data /home/ubuntu/pdf.tsolife.com
sudo chmod -R 755 /home/ubuntu/pdf.tsolife.com

pm2 start /home/ubuntu/pdf.tsolife.com/index.js

echo "Restarting PHP-FPM and Nginx........."
# sudo systemctl restart php8.2-fpm
sudo systemctl restart nginx
