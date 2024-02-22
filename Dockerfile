FROM --platform=linux/amd64 buildpack-deps:jammy as build
COPY . /workspaces/msdfgen
WORKDIR /workspaces/msdfgen
RUN apt-get update && apt-get install -y build-essential curl cmake git zip unzip tar
RUN cd /tmp && git clone https://github.com/Microsoft/vcpkg.git && ./vcpkg/bootstrap-vcpkg.sh
ENV VCPKG_ROOT=/tmp/vcpkg
RUN cd /workspaces/msdfgen && cmake . 
RUN make
COPY --from=jeremysf/dockerize /dockerize /dockerize
# Figure out the shared library dependencies
RUN /dockerize ./msdfgen
RUN ldd ./msdfgen
# Make an empty directory
RUN mkdir /empty

##
## Stage 2 - The deployment container
##
FROM --platform=linux/amd64 scratch as deploy
WORKDIR /
COPY --from=build /workspaces/msdfgen/msdfgen /msdfgen
COPY --from=build /workspaces/msdfgen/libmsdfgen-core.a /libmsdfgen-core.a
COPY --from=build /workspaces/msdfgen/libmsdfgen-ext.a /libmsdfgen-ext.a
COPY --from=build /workspaces/msdfgen/msdfgen-ext.h /msdfgen-ext.h
COPY --from=build /workspaces/msdfgen/msdfgen.h /msdfgen.h
COPY --from=build /workspaces/msdfgen/resource.h /resource.h
COPY --from=build /workspaces/msdfgen/core/*.h /core/
COPY --from=build /workspaces/msdfgen/libs /
