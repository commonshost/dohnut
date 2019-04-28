# override these values at runtime as desired
# eg. make build ARCH=arm32v6 BUILD_OPTIONS=--no-cache
ARCH := amd64
DOCKER_REPO := commonshost/dohnut
BUILD_OPTIONS +=

# ARCH to GOARCH mapping (don't change these)
# supported ARCH values: https://github.com/docker-library/official-images#architectures-other-than-amd64
# supported GOARCH values: https://golang.org/doc/install/source#environment
ifeq "${ARCH}" "amd64"
GOARCH := amd64
GOARM :=
endif

ifeq "${ARCH}" "arm32v6"
GOARCH := arm
GOARM := 6
endif

ifeq "${ARCH}" "arm64v8"
GOARCH := arm64
GOARM :=
endif

# these values are used for container labels at build time
BUILD_DATE := $(strip $(shell docker run --rm busybox date -u +'%Y-%m-%dT%H:%M:%SZ'))
BUILD_VERSION := $(strip $(shell git describe --tags --always --dirty))
VCS_REF := $(strip $(shell git rev-parse --short HEAD))
VCS_TAG := $(strip $(shell git describe --abbrev=0 --tags))
DOCKER_TAG := ${VCS_TAG}-${GOARCH}

.DEFAULT_GOAL := build

.EXPORT_ALL_VARIABLES:

## -- General --

## Display this help message
.PHONY: help
help:
	@awk '{ \
			if ($$0 ~ /^.PHONY: [a-zA-Z\-\_0-9]+$$/) { \
				helpCommand = substr($$0, index($$0, ":") + 2); \
				if (helpMessage) { \
					printf "\033[36m%-20s\033[0m %s\n", \
						helpCommand, helpMessage; \
					helpMessage = ""; \
				} \
			} else if ($$0 ~ /^[a-zA-Z\-\_0-9.]+:/) { \
				helpCommand = substr($$0, 0, index($$0, ":")); \
				if (helpMessage) { \
					printf "\033[36m%-20s\033[0m %s\n", \
						helpCommand, helpMessage; \
					helpMessage = ""; \
				} \
			} else if ($$0 ~ /^##/) { \
				if (helpMessage) { \
					helpMessage = helpMessage"\n                     "substr($$0, 3); \
				} else { \
					helpMessage = substr($$0, 3); \
				} \
			} else { \
				if (helpMessage) { \
					print "\n                     "helpMessage"\n" \
				} \
				helpMessage = ""; \
			} \
		}' \
		$(MAKEFILE_LIST)

.PHONY: qemu-user-static
qemu-user-static:
	@docker run --rm --privileged multiarch/qemu-user-static:register --reset

qemu-arm-static:
	wget -q https://github.com/multiarch/qemu-user-static/releases/download/v4.0.0/qemu-arm-static \
		&& chmod +x qemu-arm-static

qemu-aarch64-static:
	wget -q https://github.com/multiarch/qemu-user-static/releases/download/v4.0.0/qemu-aarch64-static \
		&& chmod +x qemu-aarch64-static

## -- Parameters --

## Select a target architecture (optional): amd64|arm32v6|arm64v8
## eg. make ARCH=arm32v6
##
.PHONY: ARCH

## Provide additional docker build flags (optional)
## eg. make BUILD_OPTIONS=--no-cache
##
.PHONY: BUILD_OPTIONS

## Override default docker repo (optional)
## eg. make DOCKER_REPO=myrepo/myapp
.PHONY: DOCKER_REPO

## -- Docker --

## Build, test, and push the image in one step
## eg. make release [ARCH=] [BUILD_OPTIONS=] [DOCKER_REPO=]
##
.PHONY: release
release: build test push

## Build an image for the selected platform
## eg. make build [ARCH=] [BUILD_OPTIONS=] [DOCKER_REPO=]
##
.PHONY: build
build: qemu-user-static
	@docker build ${BUILD_OPTIONS} \
		--build-arg ARCH \
		--build-arg BUILD_VERSION \
		--build-arg BUILD_DATE \
		--build-arg VCS_REF \
		--tag ${DOCKER_REPO}:${DOCKER_TAG} .

## Test an image by running it locally and requesting DNS lookups
## eg. make test [ARCH=] [DOCKER_REPO=]
##
.PHONY: test
test: qemu-user-static qemu-arm-static qemu-aarch64-static
	$(eval CONTAINER_ID=$(shell docker run --rm -d \
		-v "$(CURDIR)/qemu-arm-static:/usr/bin/qemu-arm-static" \
		-v "$(CURDIR)/qemu-aarch64-static:/usr/bin/qemu-aarch64-static" \
		-p 53:53/tcp -p 53:53/udp ${DOCKER_REPO}:${DOCKER_TAG} --listen 0.0.0.0:53 --doh commonshost))
	dig sigok.verteiltesysteme.net @127.0.0.1 | grep NOERROR || (docker stop ${CONTAINER_ID}; exit 1)
	dig sigfail.verteiltesysteme.net @127.0.0.1 | grep SERVFAIL || (docker stop ${CONTAINER_ID}; exit 1)
	@docker stop ${CONTAINER_ID}

## Push an image to the configured docker repo
## eg. make push [ARCH=] [DOCKER_REPO=]
##
.PHONY: push
push:
	@docker push ${DOCKER_REPO}:${DOCKER_TAG}

## Create and push a multi-arch manifest list
## eg. make manifest [DOCKER_REPO=]
##
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
