#ifndef _LASAGNE_TEXAS_TEXASSERVICE_HPP_
#define _LASAGNE_TEXAS_TEXASSERVICE_HPP_

// Include the automatically generated export file
#include "Texas_export.h"

// Include base level lifecycle controlled thread pool
#include <daf/TaskExecutor.h>

// Include the TAF RabbitMQ connector
#include <RabbitMQConnector.h>

#include <nlohmann/json.hpp>

// Include the mongoose embedded web server
#include "../mongoose/mongoose.h"

#include <amqp.h>

#include <mutex>

namespace lasagne
{
  namespace texas
  {
    class Texas_Export TexasService : public virtual DAF::TaskExecutor
    {
      int parse_args(int argc, ACE_TCHAR* argv[]);

    public:

      TexasService();

      ~TexasService() override;

      void ev_handler(struct mg_connection* nc, int ev, void* ev_data);

      static const char* svc_ident(void)
      {
        return ACE_TEXT("lasagne::texas::TexasService");
      }

    protected:

      // Service Lifecycle

      int init(int argc, ACE_TCHAR* argv[]) override;

      int fini(void) override;

      int suspend(void) override
      {
        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::suspend(void)\n"), svc_ident()));
        this->suspended_ = true;
        return 0;
      }

      int resume(void) override
      {
        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::resume(void)\n"), svc_ident()));
        this->suspended_ = false;
        return 0;
      }

      int info(ACE_TCHAR** info_string, size_t length = 0) const override;

      // Active Service (svc)

      int svc(void) override;

      // Websocket Message handlers

      void handle_ws_receive(websocket_message* wm);

      void handle_ws_send(nlohmann::json& message);

      void handle_http_request(struct mg_connection* nc, http_message* http_message) const;

    private:

      bool is_service_ready() const;

      // RabbitMQ Publish

      void init_publish_connection();

      void handle_publish_disconnection();

      void rmq_publish_alert(nlohmann::json& message);

      void rmq_publish_track(nlohmann::json& message);

      void rmq_publish_control(nlohmann::json& message, std::string& id);

      void rmq_publish_replay(nlohmann::json& message);

      void declare_exchange(int channel, const char* exchange_name, const char* exchange_type) const;

      void rmq_publish_default(nlohmann::json& message, int channel, const char* exchange_name,
        const char* exchange_type, const char* routing_key) const;

      // RabbitMQ Consume

      void init_consumer_connection();

      void rmq_setup_consumer_alerts(taf::rabbit_mq::RabbitMQConnector* consumer) const;

      void rmq_setup_consumer_tracks(taf::rabbit_mq::RabbitMQConnector* consumer) const;

      void rmq_setup_consumer_control(taf::rabbit_mq::RabbitMQConnector* consumer);

      void rmq_setup_consumer_replay(taf::rabbit_mq::RabbitMQConnector* consumer);

      void rmq_setup_consumer_default(int channel, const char* exchange_name,
        const char* exchange_type, const char* routing_key,
        taf::rabbit_mq::RabbitMQConnector* consumer, bool auto_delete_queue = true,
        amqp_bytes_t queue_name = amqp_empty_bytes) const;

      // RabbitMQ Connector

      std::unique_ptr<taf::rabbit_mq::RabbitMQConnector> get_connector(void) const;

      // Websocket Management

      mg_mgr mgr_; // Event manager that holds all active connections

      std::unique_ptr<mg_connection> nc_; // Connection

      // Websocket Settings

      std::string s_http_port_; // Port for the web socket

      int poll_timeout_; // Event manager poll timeout in milliseconds

      // RabbitMQ Settings

      std::string rmq_server_address_; // Address of the rabbitmq server
      int rmq_server_port_; // Port of the rabbitmq server
      bool rmq_ssl_ = true;
      bool rmq_verify_peer_ssl_ = true;
      bool rmq_rabbit_init_ssl_ = true;
      std::string rmq_username_;
      std::string rmq_password_;

      int rmq_consume_timeout_; // Consumer timeout in milliseconds

      // Service flags

      volatile bool suspended_; // Service is suspended

      // Service Thread management

      const size_t NUM_SVC_THREADS = 2;
      DAF::Semaphore svc_lock_; // Lock to sequentially start handlers
      int svc_index_; // Index of svc thread zero == websocket handler non-zero == message handlers

      DAF::Monitor ownship_monitor_;
      nlohmann::json ownship_;

      std::unique_ptr<taf::rabbit_mq::RabbitMQConnector> publisher_;
      bool publisher_connected_ = false;

      std::unique_ptr<taf::rabbit_mq::RabbitMQConnector> consumer_;
      bool consumer_connected_ = false;

      std::mutex ws_lock_;  // protects the websocket.

      // TODO this is a temp fix for experiment 2, see use in TexasService.cpp
      bool browser_mode_ = false;
    };
  } //namespace texas
} //namespace lasagne

typedef lasagne::texas::TexasService lasagne_texas_TexasService;

ACE_FACTORY_DECLARE(Texas, lasagne_texas_TexasService);
ACE_STATIC_SVC_DECLARE_EXPORT(Texas, lasagne_texas_TexasService);

#endif // _LASAGNE_TEXAS_TEXASSERVICE_HPP_
