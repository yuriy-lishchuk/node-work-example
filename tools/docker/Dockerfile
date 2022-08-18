FROM node:alpine

# OS Env
ENV TZ=$TZ

# ImageMagick and other deps
RUN apk --update add --no-cache imagemagick graphicsmagick bash pngcrush optipng=0.7.7-r0

# ImageMagick and other deps
RUN apk --update add --no-cache imagemagick graphicsmagick bash pngcrush optipng=0.7.7-r0

# Global deps
RUN npm install typescript -g

# Add non-root user for security
RUN addgroup -S f1user && adduser -S -g f1user f1user \
    && mkdir -p /home/f1user/Downloads /usr/src/app \
    && chown -R f1user:f1user /home/f1user \
    && chown -R f1user:f1user /usr/src/app \
    && chown -R f1user:f1user /usr/local/lib/node_modules

# Run everything after as non-privileged user.
USER f1user

# Create certs dir
RUN mkdir -p /usr/src/app/certs

# Copy in certs
COPY certs .

# Change to app directory
WORKDIR /usr/src/app

# Copy package.json/package-lock.json
COPY package.json package-lock.json ./

# Install deps first to avoid reinstalling on code changes if package.json/package-lock.json unchanged
RUN npm install

# Copy code
COPY . .

# Run server
ENTRYPOINT [ "npm", "start" ]
