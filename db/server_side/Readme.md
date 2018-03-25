# Setting up the server
## Installing `node_modules`
You need to ensure `yarn` is installed or at least `npm`.<br>
You will then need to run `yarn/npm install`.<br>

## Installing `openssl`
You will need to find an openssl version. You can either generate it with binaries, find installers or portable versions. Be sure to have the executable folder in the `PATH` environment variable.

## Certificates
[Source [FR]](http://www.linux-france.org/prj/edu/archinet/systeme/ch24s03.html)

#### Main Commands
Run the following commands in the ssl folder:
- `openssl genrsa 1024 > server.key` to generate the private key for the server<br>
  You should protect it.
- `openssl req -new -key server.key > servCSR.csr` to generate the CSR file. <br>
  You will be asked to enter informations. You can enter what you want except the `commonName` element that needs to match either the IP, the hostname or the name of your server. If you need an official certificate, you will need this file to get the certification. If not, execute the commands below for autosigned certificates.

#### Auto-signed certificate
- `openssl genrsa -des3 1024 > ca.key` To generate the key of your Certified Authority. You will be asked to enter a password to be defined.
- `openssl req -new -x509 -days 365 -key ca.key > ca.crt` This will create a x509 certificate, to be auto-signed with a 1-year validity. Enter the password and fill in the informations like you did previously.
- `openssl x509 -req -in serverCSR.csr -out server.crt -CA ca.crt -CAkey ca.key -CAcreateserial -CAserial ca.srl` Signs the certificate.
- In the end, the output should be :
```
Signature ok
subject=/C=FR/ST=CORSE/L=Ajaccio/O=LLB/OU=BTSINFO/CN=wiki.domain1.org
Getting CA Private Key
Enter pass phrase for ca.key:
```

#### Installing the certificate (`ca.crt`)
- For Windows, right click and install the certificate. Place it on the "Certification Authority" folder.
- For Mozilla Firefox, go to `Options > Privacy & Security > Security > Display Certificates > Authority > Import` and select the file.
- For auto-signed certificates, you will need to add a certificate exception to your browser to agree that you trust your certificate.
