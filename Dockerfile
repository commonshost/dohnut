ARG ARCH=amd64
ARG BUILD_DATE
ARG BUILD_VERSION
ARG VCS_REF

FROM ${ARCH}/node

LABEL maintainer="kylemharding@gmail.com"
LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.name="klutchell/dohnut"
LABEL org.label-schema.description="Dohnut is a DNS to DNS-over-HTTPS (DoH) proxy server."
LABEL org.label-schema.url="https://github.com/commonshost/dohnut"
LABEL org.label-schema.vcs-url="https://github.com/klutchell/dohnut"
LABEL org.label-schema.docker.cmd="docker run -p 53:5300/tcp -p 53:5300/udp klutchell/dohnut"
LABEL org.label-schema.build-date="${BUILD_DATE}"
LABEL org.label-schema.version="${BUILD_VERSION}"
LABEL org.label-schema.vcs-ref="${VCS_REF}"

ENV DEBIAN_FRONTEND noninteractive
ENV INITRD No
ENV NODE_ENV production

RUN apt-get update && apt-get install -yq --no-install-recommends \
	git \
	curl \
	libsystemd-dev \
	build-essential \
	libssl-dev \
	net-tools \
	ldnsutils \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY package.json /root/dohnut/
COPY source/ /root/dohnut/source/

RUN cd /root/dohnut && npm install

RUN ln -s /root/dohnut/source/bin.js /usr/local/bin/dohnut

# healthcheck by running drill on localhost to test dnssec
COPY healthcheck.sh /
RUN chmod +x /healthcheck.sh
HEALTHCHECK --interval=5s --timeout=5s --start-period=5s \
	CMD [ "/bin/sh", "-xe", "/healthcheck.sh" ]

ENTRYPOINT [ "dohnut" ]
