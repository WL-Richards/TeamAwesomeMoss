#!/usr/bin/python
import socket
import datetime

HOST = "172.26.115.9"
PORT = 18194

if __name__ == "__main__":
    # Create a socket object (IPv4, TCP)
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    # Bind to address and port
    server_socket.bind((HOST, PORT))
    server_socket.listen(5)  # Allow up to 5 queued connections
    print(f"TCP server listening on {HOST}:{PORT}")

    while True:
        # Accept a client connection
        client_socket, client_address = server_socket.accept()
        conn_ip = client_address[0]
        print(f"---- Connection from {conn_ip} at {datetime.datetime.now()}----")

        while True:
            data = client_socket.recv(1024)
            if not data:
                break  # Client closed connection
            decodedData = data.decode()
            decodedData = f"[{datetime.datetime.now()}] " + decodedData
            print(decodedData)
            with open(f"{conn_ip}_{client_address[1]}.log", 'a') as logFile:
                logFile.write(f"{decodedData}\n")

        client_socket.close()
        print(f" ---- Console {conn_ip} disconnected from log server! -----")
