#!/bin/bash

# Sentinel Bot Deployment Script for EC2
# This script sets up and deploys the Sentinel Discord bot on an EC2 instance

set -e

echo "Starting Sentinel Bot Deployment..."

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS"
    exit 1
fi

# Update system packages
echo "Updating system packages..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt update && sudo apt upgrade -y
elif [ "$OS" = "amzn" ] || [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    sudo yum update -y
else
    echo "Unsupported OS: $OS"
    exit 1
fi

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt install -y docker.io
    else
        sudo yum install -y docker
    fi
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not already installed
if !git clone https://github.com/param-chandarana/sentinel.git "$REPO_DIR"
    cd "$REPO_DIR"do apt install -y docker-compose
    else
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
fi

# Install Git if not already installed
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        sudo apt install -y git
    else
        sudo yum install -y git
    fi
fi

# Clone or update repository
REPO_DIR="$HOME/sentinel"
if [ -d "$REPO_DIR" ]; then
    echo "Updating existing repository..."
    cd "$REPO_DIR"
    git pull
else
    echo "Cloning repository..."
    # git clone <repo-url> "$REPO_DIR"
    # cd "$REPO_DIR"
    echo "Please clone your repository manually or update this script with your repo URL"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo ".env file not found!"
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Edit the .env file and add your BOT_TOKEN"
    echo "   Run: nano .env"
    echo ""
    read -p "Press enter after you've updated the .env file..."
fi

# Create data directory if it doesn't exist
mkdir -p data

# Build and start the container
echo "Building Docker image..."
docker-compose build

echo "Starting Sentinel bot..."
docker-compose up -d

echo ""
echo "Deployment complete!"
echo ""
echo "Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop bot:         docker-compose stop"
echo "   Restart bot:      docker-compose restart"
echo "   Stop & remove:    docker-compose down"
echo "   View status:      docker-compose ps"
echo ""
