#include "RabbitMQConnector.h"
#include <amqp.h>
#include <stdint.h>
#include <amqp_ssl_socket.h>
#include <amqp_tcp_socket.h>
#include <ace/Log_Msg.h>

#include <stdio.h>

taf::rabbit_mq::RabbitMQConnector::RabbitMQConnector(): connection_state_(nullptr), socket_(nullptr)
{
}

taf::rabbit_mq::RabbitMQConnector::~RabbitMQConnector()
{
}

bool taf::rabbit_mq::RabbitMQConnector::open(char const* hostname, int port, bool ssl, bool verify_peer, bool rabbit_init_ssl)
{
    connection_state_ = amqp_new_connection();

    if (ssl && !rabbit_init_ssl)
    {
      // Do not let the Rabbit client init the SSL library.
      amqp_set_initialize_ssl_library(0);
    }

    socket_ = ssl ? amqp_ssl_socket_new(connection_state_) : amqp_tcp_socket_new(connection_state_);
    if (!socket_) 
    {
      ACE_DEBUG((LM_ERROR, ACE_TEXT(
        "(%P | %t)taf::rabbit_mq::RabbitMQConnector::open -> socket false so returning...\n")));
      return false;
    }

    if (ssl)
    {
      amqp_ssl_socket_set_verify_hostname(socket_, verify_peer);
      amqp_ssl_socket_set_verify_peer(socket_, verify_peer);
    }

    const auto status = amqp_socket_open(socket_, hostname, port);


    ACE_DEBUG((LM_ERROR, ACE_TEXT(
      "(%P | %t)taf::rabbit_mq::RabbitMQConnector::open -> amqp_socket_open returned %i...\n"), status));

    return status == 0;
}

bool taf::rabbit_mq::RabbitMQConnector::close() const
{
    amqp_channel_close(connection_state_, 1, AMQP_REPLY_SUCCESS);
    amqp_connection_close(connection_state_, AMQP_REPLY_SUCCESS);
    amqp_destroy_connection(connection_state_);
    return true;
}

bool taf::rabbit_mq::RabbitMQConnector::connect(const char* username, const char* password, const char* virtual_host) const
{
    auto result = amqp_login(connection_state_, virtual_host, 0, 131072, 0, AMQP_SASL_METHOD_PLAIN, username, password);
    if (result.reply_type == AMQP_RESPONSE_NORMAL)
    {
        amqp_channel_open(connection_state_, 1);
    }
    else
    {
        return false;
    }

    return true;
}

amqp_connection_state_t_* taf::rabbit_mq::RabbitMQConnector::state() const
{
     return connection_state_;
}
