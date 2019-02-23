# static arch-to-goarch mapping (don't change these)
# supported ARCH values can be found here: https://github.com/docker-library/official-images#architectures-other-than-amd64
# supported GOARCH values can be found here: https://golang.org/doc/install/source#environment
amd64_GOARCH = amd64
arm32v6_GOARCH = arm
arm64v8_GOARCH = arm64

# override these values at runtime as desired
# eg. make build ARCH=armhf BUILD_OPTIONS=--no-cache
ARCH := amd64
BUILD_OPTIONS +=
DOCKER_REPO := klutchell/dohnut
BUILD_TAG := dev

# these values are used for container labels at build time
# travis-ci will override the BUILD_VERSION but everything else should be left as-is for consistency
IMAGE_TAG := ${BUILD_TAG}-${${ARCH}_GOARCH}
BUILD_VERSION := $(strip $(shell git describe --tags --dirty))
BUILD_DATE := $(strip $(shell docker run --rm busybox date -u +'%Y-%m-%dT%H:%M:%SZ'))
VCS_REF := $(strip $(shell git rev-parse --short HEAD))

.DEFAULT_GOAL := build

.EXPORT_ALL_VARIABLES:

.PHONY: qemu-user-static
qemu-user-static:
	@docker run --rm --privileged multiarch/qemu-user-static:register --reset

.PHONY: build
build: qemu-user-static
	@docker build ${BUILD_OPTIONS} --build-arg ARCH --build-arg BUILD_VERSION --build-arg BUILD_DATE --build-arg VCS_REF -t ${DOCKER_REPO}:${IMAGE_TAG} .

.PHONY: test
test: qemu-user-static
	@docker run --rm --entrypoint "/bin/sh" ${DOCKER_REPO}:${IMAGE_TAG} -xec "dohnut --listen 127.0.0.1:53 --doh commonshost & sleep 5 && /healthcheck.sh"

.PHONY: push
push:
	@docker push ${DOCKER_REPO}:${IMAGE_TAG}

.PHONY: manifest
manifest:
	manifest-tool push from-args \
		--platforms linux/amd64,linux/arm,linux/arm64 \
		--template ${DOCKER_REPO}:${BUILD_TAG}-ARCH \
		--target ${DOCKER_REPO}:${BUILD_TAG}
	manifest-tool push from-args \
		--platforms linux/amd64,linux/arm,linux/arm64 \
		--template ${DOCKER_REPO}:${BUILD_TAG}-ARCH \
		--target ${DOCKER_REPO}:latest

.PHONY: release
release: build test push
