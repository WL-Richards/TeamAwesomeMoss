#pragma once
#include <stdio.h>
#include <string.h>

#include "../common/types.h"
#include "../config.h"
#include "../network/RSocketLib.hpp"

#define LOG_BUFFER_SIZE 500

enum class LogLevel : uint8 {
    LOG_DEBUG = 0,
    LOG_INFO = 1,
    LOG_WARNING = 2,
    LOG_ERROR = 3
};

#define LOG_INFO(msg) { \
    Logger::getInstance()->genericLog(LogLevel::LOG_INFO, msg, __FILE__, __func__, __LINE__); \
}

#define LOGF_INFO(msg, ...) { \
    char buf[LOG_BUFFER_SIZE]; \
    snprintf(buf, sizeof(buf), msg, __VA_ARGS__); \
    Logger::getInstance()->genericLog(LogLevel::LOG_INFO, msg, __FILE__, __func__, __LINE__); \
}

class Logger{
public:
    // Deleting copy constructor.
    Logger(const Logger &obj) = delete;

    /* Get an instance of the logger object */
    static Logger *getInstance(){
        if(instance == nullptr){
            instance = new Logger();
            return instance;
        }
        else{
            return instance;
        }
    };

    Logger(){
        activeLogSocket = RSocketLib::openSocket(LOG_SERVER_IP, LOG_SERVER_PORT);
    };

    bool genericLog(LogLevel level, const char* message, const char* file, const char* func, unsigned int lineNumber){
        char buf[LOG_BUFFER_SIZE];
        char fileName[260];
        truncateFileName(file, fileName);
        snprintf(buf, LOG_BUFFER_SIZE, "[%s] [%s:%s:%u] %s", Logger::getLogLevelName(level), fileName, func, lineNumber, message);
        printf("%s\n", buf);
        if(activeLogSocket > 0){
            int bytesWritten = RSocketLib::writeToSocket(activeLogSocket, buf);
            return bytesWritten > 0;
        }    

        return false;
    };

    static const char* getLogLevelName(const LogLevel level){
        switch (level)
        {
            case LogLevel::LOG_DEBUG:
                return "DEBUG";
            case LogLevel::LOG_INFO:
                return "INFO";
            case LogLevel::LOG_WARNING:
                return "WARNING";
            case LogLevel::LOG_ERROR:
                return "ERROR";
        }
        
        return "ERROR";
    }

    /**
     * Truncate the __FILE__ output to just show the name instead of the whole path
     * @param fileName String to truncate
     * 
     * @return Pointer to a malloced char*
    */
    void truncateFileName(const char* fileName, char array[260]){
        
        size_t i;
        // Find the last \\ in the file path to know where the name is
        const char *lastOccurance = strrchr(fileName, '/');
        
        int lastSlash = lastOccurance-fileName+1;

        // Loop from the last slash to the end of the string
        for(i = lastSlash; i < strlen(fileName); i++){
            array[i-lastSlash] = fileName[i];
        }
        array[i-lastSlash] = '\0';
    };

private:
    static Logger* instance;
    int activeLogSocket = -1;
};