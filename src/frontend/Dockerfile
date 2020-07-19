FROM golang:1.9.2 AS builder

RUN apt-get -y update && \
	apt-get clean all && \
    apt-get -y install tar && \
    apt-get -y install lbzip2

RUN apt-get --yes --allow-downgrades --allow-remove-essential --allow-change-held-packages install apt-utils ca-certificates git
RUN wget -qO/go/bin/dep https://github.com/golang/dep/releases/download/v0.5.0/dep-linux-amd64 && \
      chmod +x /go/bin/dep

ENV PROJECT github.com/GoogleCloudPlatform/microservices-demo/src/frontend
WORKDIR /go/src/$PROJECT

# restore dependencies
COPY Gopkg.* ./
RUN dep ensure --vendor-only -v
COPY . .
RUN tar -xvf ./appd/golang-sdk-x64-linux.tar  -C $GOPATH/src
RUN go install .

# FROM alpine as release
# RUN apk add --no-cache ca-certificates \
#    busybox-extras net-tools bind-tools
# WORKDIR /frontend
# RUN apk add --no-cache ca-certificates busybox-extras net-tools bind-tools
# COPY --from=builder /go/bin/frontend /frontend/server
# COPY ./templates /frontend/templates
# COPY ./static /frontend/static
# EXPOSE 8080
# ENTRYPOINT ["/frontend/server"]

RUN cp /go/bin/frontend /go/bin/server
COPY ./templates /go/bin/templates
COPY ./static /go/bin/static
EXPOSE 8080
ENTRYPOINT ["/go/bin/server"]
