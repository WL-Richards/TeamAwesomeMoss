#pragma once
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>       /*  socket definitions        */
#include <sys/types.h>        /*  socket types              */
#include <arpa/inet.h>        /*  inet (3) funtions         */

#include <net/net.h>
#include <netinet/in.h>


class RSocketLib{
public:
    /**
     * Attempt to open a socket to a given IP address and port 
     * 
     * @param ipAddress Stringified IP address of the location we are opening the socket to
     * @param port Port we are opening the socket on the server at
     * 
     * @return SocketFD if connection successful, -1 if failure
     */
    static int openSocket(const char* ipAddress, int port){
        struct sockaddr_in stSockAddr;
        memset(&stSockAddr, 0, sizeof(stSockAddr));

        int sockFD = netSocket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (sockFD < 0) {
            perror("Socket creation failed");
            return -1;
        }
      
        stSockAddr.sin_family = AF_INET;
        stSockAddr.sin_port = htons(port);
        if (inet_pton(AF_INET, ipAddress, &stSockAddr.sin_addr) <= 0) {
            perror("Invalid address/ Address not supported");
            return -1;
        }

        if (netConnect(sockFD, (struct sockaddr *)&stSockAddr, sizeof(stSockAddr)) < 0) {
            perror("Connection failed");
            return -1;
        }

        printf("Connection established to %s!\n", ipAddress);
        RSocketLib::writeToSocket(sockFD, "Established connection to socket!\n");
       
        return sockFD;
    }

    /**
     * Basic wrapper for writing to a network socket
     * 
     * @param sockFD Socket file descriptor we are writing too
     * @param message The string we are writing to the socket
     * 
     * @return Number of bytes written to socket
     */
    static int writeToSocket(const int sockFD, const char* message){
       return netSend(sockFD, message, strlen(message), 0);
    }
};