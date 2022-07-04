#ifndef __TAF_RABBITMQ_CONNECTOR_HPP__
#define __TAF_RABBITMQ_CONNECTOR_HPP__

#include "RabbitMQ_Export.h"
#include <ace/Copy_Disabled.h>
#include <amqp.h>

namespace taf 
{
namespace rabbit_mq 
{
  class RabbitMQ_Export RabbitMQConnector : ACE_Copy_Disabled
  {
  public:
      // Constructor.
      RabbitMQConnector();

      // Destructor.
      ~RabbitMQConnector(void);

      // Opens the RabbitMQ connection.
      bool open(char const* hostname, int port, bool ssl = false, bool verify_peer = true, bool rabbit_init_ssl = true);

      // Closes the RabbitMQ connection.
      bool close(void) const;

      // Connects to the RabbitMQ bus.
      bool connect(const char* username, const char* password, const char* virtual_host = "/") const;

      // Returns the state of the connection.
      amqp_connection_state_t_* state() const;

  private:

      amqp_connection_state_t connection_state_;

      amqp_socket_t* socket_;
  };
 
}//namesapce rabbit_mq
}//namesapce taf

#endif // __TAF_RABBITMQ_CONNECTOR_HPP__
