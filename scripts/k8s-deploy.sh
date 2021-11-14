#!/bin/sh

set -e

export GITHUB_SHA=$(git rev-parse --short HEAD)
export APP="klexhub-phone-bot"
export IMAGE="docker-registry.k8net.de/klexhub/$APP:latest"

kubectl kustomize k8s/template | envsubst > k8s/prod.yml