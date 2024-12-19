#!/bin/bash
set -e

sudo chown -R www-data:www-data /var/www/angular-app/dist
sudo chmod -R 755 /var/www/angular-app/dist


echo "Restarting PHP-FPM and Nginx........."
# sudo systemctl restart php8.2-fpm
sudo systemctl restart nginx
