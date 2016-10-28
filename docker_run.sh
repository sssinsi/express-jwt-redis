#!/usr/bin/env bash
docker build -t my-express-app .
docker run --link redis:db -p 9999:8888 -p 9000:8000 -d my-express-app
docker run --link redis:db -p 9999:8888 -p 9000:8000 -it my-express-app /bin/bash