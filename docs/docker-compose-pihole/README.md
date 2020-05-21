# Dohnut and Pi-hole with Docker Compose

## Usage

Use [Docker Compose](https://docs.docker.com/compose/) to run Dohnut and [Pi-hole](https://pi-hole.net) side-by-side on the same host. Dohnut encrypts Pi-hole's upstream DNS queries, adds DNS countermeasures, and supports load balancing across multiple DoH providers for better privacy and/or performance.

This example runs Dohnut and Pi-hole, exposing the DNS resolver on port `53`. It also exposes the Pi-hole web dashboard for monitoring and management at:

- http://pi.hole/admin/

Remember to set the `WEBPASSWORD` to your preferred password for the dashboard.

Save the YAML file and run both Dohnut and Pi-hole as automatically restarting background services:

    $ docker-compose up --detach

## Template

`./docker-compose.yml`

```yaml
version: "3"

services:
  # See: Dohnut (options passed as environment variables)
  # https://help.commons.host/dohnut/cli/#options
  dohnut:
    container_name: dohnut
    image: commonshost/dohnut:latest
    restart: unless-stopped
    networks:
      dohnut_pihole:
        ipv4_address: 10.0.0.2
    environment:
      DOHNUT_LISTEN: 10.0.0.2:53000
      DOHNUT_BOOTSTRAP: 9.9.9.9 8.8.8.8 1.1.1.1
      DOHNUT_DOH: commonshost
      DOHNUT_COUNTERMEASURES: spoof-queries spoof-useragent
      DOHNUT_CACHE_DIRECTORY: /etc/dohnut
    volumes:
    - "./etc-dohnut/:/etc/dohnut/"

  # See: Docker Pi-hole
  # https://github.com/pi-hole/docker-pi-hole
  pihole:
    depends_on:
    - dohnut
    container_name: pihole
    image: pihole/pihole:latest
    restart: unless-stopped
    networks:
      dohnut_pihole:
        ipv4_address: 10.0.0.3
    environment:
      # WEBPASSWORD: "set a secure password here or it will be random"
      DNS1: 10.0.0.2#53000
      DNS2: "no"
    dns:
    - 127.0.0.1
    cap_add:
    - NET_ADMIN
    volumes:
    - "./etc-pihole/:/etc/pihole/"
    - "./etc-dnsmasq.d/:/etc/dnsmasq.d/"
    ports:
    - "53:53/tcp"
    - "53:53/udp"
    - "67:67/udp"
    - "80:80/tcp"
    - "443:443/tcp"

networks:
  dohnut_pihole:
    driver: bridge
    ipam:
      config:
        - subnet: 10.0.0.0/24
```

## See Also

- [Docker Compose `up` command reference](https://docs.docker.com/compose/reference/up/)
- [Docker Pi-hole documentation](https://github.com/pi-hole/docker-pi-hole)
