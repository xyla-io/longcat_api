# SSL Directory

SSL certificate and key files for the API server.

The certificate and key files should be named `server.crt` and `server.key`, respectively.

## Self-Signed Certificate

Generate a self-signed certificate.

```bash
cd ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt
```