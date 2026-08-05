FROM oven/bun

# We extend the oven/bun image to add git support, required to run husky
# commands and git hooks.
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
