# override these values at runtime as desired
# eg. make build GOARCH=armhf BUILD_OPTIONS=--no-cache
GOARCH := amd64
DOCKER_REPO := commonshost/dohnut
BUILD_OPTIONS +=

# these values are used for container labels at build time
BUILD_DATE := $(strip $(shell docker run --rm busybox date -u +'%Y-%m-%dT%H:%M:%SZ'))
BUILD_VERSION := $(strip $(shell git describe --tags --always --dirty))
VCS_REF := $(strip $(shell git rev-parse --short HEAD))
VCS_TAG := $(strip $(shell git describe --abbrev=0 --tags))
DOCKER_TAG := ${VCS_TAG}-${GOARCH}

# GOARCH to ARCH mapping (don't change these)
# supported GOARCH values can be found here: https://golang.org/doc/install/source#environment
# supported ARCH values can be found here: https://github.com/docker-library/official-images#architectures-other-than-amd64
amd64_ARCH := amd64
arm_ARCH := arm32v7
arm64_ARCH := arm64v8
ARCH := ${${GOARCH}_ARCH}

.DEFAULT_GOAL := build

.EXPORT_ALL_VARIABLES:

.PHONY: qemu-user-static
qemu-user-static:
	@docker run --rm --privileged multiarch/qemu-user-static:register --reset

.PHONY: build
build: qemu-user-static
	@docker build ${BUILD_OPTIONS} \
		--build-arg ARCH \
		--build-arg BUILD_VERSION \
		--build-arg BUILD_DATE \
		--build-arg VCS_REF \
		--tag ${DOCKER_REPO}:${DOCKER_TAG} .

.PHONY: test
test: qemu-user-static
	$(eval CONTAINER_ID=$(shell docker run --rm -d -p 5300:53/tcp -p 5300:53/udp ${DOCKER_REPO}:${DOCKER_TAG} --listen 0.0.0.0:53 --doh commonshost))
	dig sigok.verteiltesysteme.net @127.0.0.1 -p 5300 | grep NOERROR || (docker stop ${CONTAINER_ID}; exit 1)
	dig sigfail.verteiltesysteme.net @127.0.0.1 -p 5300 | grep SERVFAIL || (docker stop ${CONTAINER_ID}; exit 1)
	@docker stop ${CONTAINER_ID}

.PHONY: push
push:
	@docker push ${DOCKER_REPO}:${DOCKER_TAG}

.PHONY: manifest
manifest:
	@manifest-tool push from-args \
		--platforms linux/amd64,linux/arm,linux/arm64 \
		--template ${DOCKER_REPO}:${VCS_TAG}-ARCH \
		--target ${DOCKER_REPO}:${VCS_TAG} \
		--ignore-missing
	@manifest-tool push from-args \
		--platforms linux/amd64,linux/arm,linux/arm64 \
		--template ${DOCKER_REPO}:${VCS_TAG}-ARCH \
		--target ${DOCKER_REPO}:latest \
		--ignore-missing

.PHONY: release
release: build test push
