# Dohnut with Docker

Use Docker to run Dohnut in a container. Multi-arch Docker container images are provided for: ARMv6, ARMv7, ARMv8, and x86-64 (Intel/AMD).

Docker image: [`commonshost/dohnut`](https://hub.docker.com/r/commonshost/dohnut)

```shell
$ docker run [DOCKER_OPTIONS] commonshost/dohnut [DOHNUT_OPTIONS]
```

Any options before the image name `commonshost/dohnut` are for Docker. Any options after the image name are for Dohnut.

## Example

Run forever as a background service, listen on port `53/udp` on all network interfaces, and DNS proxy queries to Commons Host DoH.

```shell
$ docker run --detach --restart unless-stopped --net=host commonshost/dohnut --listen 0.0.0.0:53 --doh commonshost --bootstrap 1.1.1.1
```

Or using docker-compose:
```yaml
version: "3"

services:
  dohnut:
    container_name: dohnut
    image: commonshost/dohnut:latest
    environment:
      TZ: "Europe/Brussels"
      DOHNUT_LISTEN: 127.0.0.1:53
      DOHNUT_BOOTSTRAP: 1.1.1.1
      DOHNUT_DOH: commonshost cloudflare google
      DOHNUT_COUNTERMEASURES: spoof-queries
    network_mode: "host"
```

Test the service by performing a DNS query on the Docker host system.

    $ dig @localhost example.com

    ; <<>> DiG 9.10.6 <<>> @127.0.0.1 example.com
    ; (1 server found)
    ;; global options: +cmd
    ;; Got answer:
    ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 32488
    ;; flags: qr rd ra ad; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

    ;; OPT PSEUDOSECTION:
    ; EDNS: version: 0, flags:; udp: 4096
    ;; QUESTION SECTION:
    ;example.com.			IN	A

    ;; ANSWER SECTION:
    example.com.		86236	IN	A	93.184.216.34

    ;; Query time: 13 msec
    ;; SERVER: 127.0.0.1#53(127.0.0.1)
    ;; WHEN: Tue Feb 19 15:44:53 +08 2019
    ;; MSG SIZE  rcvd: 56

## Dohnut CLI Options

See the [Dohnut command line interface](../cli) reference.

## Docker CLI Options

See the [Docker reference documentation](https://docs.docker.com/engine/reference/run/) for `docker run` arguments.

## Background Service Daemon

Using the `--detach` or `-d` Docker option to run Dohnut as a background service, aka *daemon*.

The `--restart unless-stopped` Docker option automatically runs Dohnut when Docker starts (i.e. at system boot), and restart the process if it crashes.

## Bootstrapping

Use the `--bootstrap [DNS server IP address]` for the initial DNS lookup of the DoH resolver.

Dohnut resolves the DoH service's address using plaintext DNS over UDP, as per the operating system's DNS settings, unless overridden with the `--bootstrap` option. This lookup will fail if Dohnut itself is part of the OS' DNS chain. For example if Dohnut is configured as the upstream resolver to Pi-hole, or used directly as the operating system's DNS server via DHCP or static network configuration. In such cases, a circular DNS dependency is created which prevents Dohnut from connecting to its DoH resolver.

The bootstrap DNS service is only used for the initial connection to the DoH resolver. All subsequent queries are encrypted and sent directly to the DoH resolver.

Example error: Without the bootstrap option, Dohnut is unable to resolve the domain `commons.host` which is set as its DoH resolver.

    Worker 1: session error getaddrinfo EAI_AGAIN commons.host commons.host:443

Solution: Set the `--bootstrap` option to the IP address of a public DNS service, for example `1.1.1.1` (Cloudflare) or `8.8.8.8` (Google).

    $ dohnut [...] --bootstrap 1.1.1.1

## Networking

Dohnut run inside a container so Docker needs to map its listening ports to the host's network.

The simplest method is to expose the host network directly to the container.

```shell
$ docker run --detach --restart unless-stopped --net=host commonshost/dohnut --listen 0.0.0.0:53 --doh commonshost --bootstrap 1.1.1.1
```

Service using IPv4:

```shell
$ docker run --detach --restart unless-stopped --publish 0.0.0.0:53:53/udp commonshost/dohnut --listen 0.0.0.0:53 --doh commonshost --bootstrap 1.1.1.1
```

Service using IPv6:

```shell
$ docker run --detach --restart unless-stopped --publish [::]:53:53/udp commonshost/dohnut --listen [::]:53 --doh commonshost --bootstrap 1.1.1.1
```

Please ensure that Dohnut is only exposed to a private LAN or localhost. Running a public, open DNS resolver exposed to public Internet traffic is strongly discouraged. Plaintext DNS/UDP is a potential source of [traffic amplification in DDoS attacks](https://en.wikipedia.org/wiki/Denial-of-service_attack#Amplification).

Expose Dohnut on `127.0.0.1` or `0.0.0.0` for localhost-only or all network interfaces respectively.

DNS uses port `53` by default but one use case of re-mapping to another port is when Dohnut is used as a local proxy for another resolver like `resolved` or [Pi-hole](../pihole). For example to run Dohnut on port `53000` and only be accessible from the local host:

```shell
$ docker run --detach --restart unless-stopped --publish 127.0.0.1:53000:53/udp commonshost/dohnut --listen 0.0.0.0:53 --doh commonshost --bootstrap 1.1.1.1
```
