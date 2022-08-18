
docker build -t symposium:latest -f tools/docker/Dockerfile .
docker run -p 3000:3000 -d --rm --env TZ=America/New_York --name symposium-server symposium:latest
docker logs -f symposium-server
