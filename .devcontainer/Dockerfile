# Use golang as the base image
FROM node:24.15.0-trixie

# Set environment variables
ENV DEBIAN_FRONTEND="noninteractive"

RUN set -e && \
  # Update and install system dependencies
  apt-get update -qq && \
  apt-get install -yqq --no-install-recommends \
  ca-certificates wget curl zip unzip p7zip-full tzdata git tree ripgrep jq && \
  # Final setup: git config, and cleanup
  git config --global --add safe.directory '*' && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Add the startup script on every bash session
RUN rm -f /root/.bashrc
COPY .devcontainer/.bashrc /root/.bashrc

# Command just to keep the container running
CMD ["sleep", "infinity"]
