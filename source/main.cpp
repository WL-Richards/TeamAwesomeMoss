#include "logger/RLogger.hpp"

// Initialize our logger singleton reference
RLogger* RLogger::instance = nullptr;

int main()
{
  // Initialize the network functionality of the console
  netInitialize();
  for(int i = 0; i < 400; i++){
    RLOG(CAT_RGraphics, LogLevel::LOG_INFO, "Hello World!");

  }
  
  return 0;
}
