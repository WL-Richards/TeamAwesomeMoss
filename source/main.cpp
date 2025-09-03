#include "logger/logger.hpp"
Logger* Logger::instance = nullptr;

int main()
{
  // Initialize the network functionality of the console
  netInitialize();

  LOG_INFO("Hello World!")
  return 0;
}
