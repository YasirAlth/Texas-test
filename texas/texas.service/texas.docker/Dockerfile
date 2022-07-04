#
# Dockerfile for binary only container of Texas Service
#
FROM localhost:32000/texas-service as libs

# create archive

RUN find /opt | grep "\.so" > /tmp/libs.txt \
 && tar cvzf /tmp/libs.tar.gz --files-from /tmp/libs.txt

# re-extract archive to new folder

RUN mkdir /tmp/libs
WORKDIR /tmp/libs
RUN tar xzf /tmp/libs.tar.gz

# Create final container

FROM ubuntu:16.04



# Set required environment variables
ENV MPC_ROOT=/opt/MPC \
    ACE_ROOT=/opt/ACE_TAO/ACE \
    TAO_ROOT=/opt/ACE_TAO/TAO \
    DDS_ROOT=/opt/OpenDDS \
    DAF_ROOT=/opt/DAF

ENV TAF_ROOT=$DAF_ROOT/TAF \
    LD_LIBRARY_PATH=$LD_LIBRARY_PATH:$ACE_ROOT/lib:$DDS_ROOT/lib:$DAF_ROOT/lib

# Copy binary libs into container

COPY --from=libs /tmp/libs/opt /opt

# Copy binary exe's into container

COPY --from=libs \
     $DAF_ROOT/bin/TAFServer \
     $DAF_ROOT/bin/MulticastDiscoveryUtility \
     $DAF_ROOT/bin/

# Create Mount Point for Configuration information

RUN mkdir -p /opt/conf

COPY run.sh /opt/

# Create Dummy Configuration
COPY lasagne* /opt/conf/

WORKDIR /opt/

# Open up the Texas Ports
EXPOSE 9999

CMD /opt/run.sh
