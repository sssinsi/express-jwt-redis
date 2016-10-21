#!/usr/bin/env bash
docker build -t my-express-app .
docker run --link redis:db -p 9999:8888 -d my-express-app