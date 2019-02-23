# override these values at runtime as desired
# eg. make build ARCH=armhf BUILD_OPTIONS=--no-cache
ARCH := amd64
BUILD_OPTIONS +=
DOCKER_REPO := klutchell/dohnut
BUILD_TAG := dev

# these values are used for container labels at build time
# travis-ci will override the BUILD_VERSION but everything else should be left as-is for consistency
IMAGE_TAG := ${ARCH}-${BUILD_TAG}
BUILD_VERSION := $(strip $(shell git describe --tags --dirty))
BUILD_DATE := $(strip $(shell docker run --rm busybox date -u +'%Y-%m-%dT%H:%M:%SZ'))
VCS_REF := $(strip $(shell git rev-parse --short HEAD))

# static GOARCH to ARCH mapping (don't change these)
# supported GOARCH values can be found here: https://golang.org/doc/install/source#environment
# supported ARCH values can be found here: https://github.com/docker-library/official-images#architectures-other-than-amd64
amd64_BASE_IMAGE = amd64/node
arm_BASE_IMAGE = arm32v7/node
arm64_BASE_IMAGE = arm64v8/node
BASE_IMAGE=${${ARCH}_BASE_IMAGE}

.DEFAULT_GOAL := build

.EXPORT_ALL_VARIABLES:

.PHONY: qemu-user-static
qemu-user-static:
	@docker run --rm --privileged multiarch/qemu-user-static:register --reset

.PHONY: build
build:
	@docker build ${BUILD_OPTIONS} \
		--build-arg BASE_IMAGE \
		--build-arg BUILD_VERSION \
		--build-arg BUILD_DATE \
		--build-arg VCS_REF \
		--tag ${DOCKER_REPO}:${IMAGE_TAG} .

.PHONY: test
test: qemu-user-static
	@docker run --rm --entrypoint "/bin/sh" \
		${DOCKER_REPO}:${IMAGE_TAG} -xec "dohnut --listen 127.0.0.1:53 --doh commonshost & sleep 5 && /healthcheck.sh"

.PHONY: push
push:
	@docker push ${DOCKER_REPO}:${IMAGE_TAG}

.PHONY: manifest
manifest:
	@docker pull ${DOCKER_REPO}:amd64-${BUILD_TAG}
	@docker pull ${DOCKER_REPO}:arm-${BUILD_TAG}
	@docker pull ${DOCKER_REPO}:arm64-${BUILD_TAG}
	@docker manifest create ${DOCKER_REPO}:${BUILD_TAG} \
		${DOCKER_REPO}:amd64-${BUILD_TAG} \
		${DOCKER_REPO}:arm-${BUILD_TAG} \
		${DOCKER_REPO}:arm64-${BUILD_TAG}
	@docker manifest annotate ${DOCKER_REPO}:${BUILD_TAG} \
		${DOCKER_REPO}:amd64-${BUILD_TAG} --os linux --arch amd64
	@docker manifest annotate ${DOCKER_REPO}:${BUILD_TAG} \
		${DOCKER_REPO}:arm-${BUILD_TAG} --os linux --arch arm --variant v6
	@docker manifest annotate ${DOCKER_REPO}:${BUILD_TAG} \
		${DOCKER_REPO}:arm64-${BUILD_TAG} --os linux --arch arm64 --variant v8
	@docker manifest push ${DOCKER_REPO}:${BUILD_TAG}

.PHONY: release
release: build test push
