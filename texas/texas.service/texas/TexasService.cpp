// Include the file including the definition of this class
#include "TexasService.h"

// Include the ACE machinery for parsing arguments
#include "ace/Get_Opt.h"

// Include data model.
#include "DataModel.h"
#include <mutex>


ACE_FACTORY_DEFINE(Texas, lasagne_texas_TexasService); // Define the dynamic deployment factory
ACE_STATIC_SVC_DEFINE(lasagne_texas_TexasService // Define the static deployment descriptor
  , lasagne_texas_TexasService::svc_ident() // Define the container ident key
  , ACE_SVC_OBJ_T // Define it to be base on ACE_Service_Object
  , &ACE_SVC_NAME(lasagne_texas_TexasService) // Define the dynamic factory address
  , (ACE_Service_Type::DELETE_THIS | ACE_Service_Type::DELETE_OBJ) // Cleanup options on service destruction
  , false // Service not initially active on load, but rather after init() success
);

namespace
{
  std::string get_safe_env(std::string const& key, std::string const& default_value)
  {
    char const* val = ACE_OS::getenv(key.c_str());
    return val == nullptr ? default_value : std::string(val);
  }
}

namespace lasagne
{
  class AmqpException : public std::exception
  {
  public:
    explicit AmqpException(int amqp_error) : amqp_error_(amqp_error) {}

  private:
    int amqp_error_;
  };

  namespace texas
  {
    static void
      c_ev_handler(struct mg_connection* nc, int ev, void* ev_data)
    {
      static_cast<TexasService*>(nc->user_data)->ev_handler(nc, ev, ev_data);
    }

    int
      TexasService::parse_args(int argc, ACE_TCHAR* argv[])
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::parse_args(int argc, ACE_TCHAR *argv[])\n"), TexasService::
        svc_ident()));

      this->rmq_username_ = get_safe_env("RABBIT_USER", "guest");
      this->rmq_password_ = get_safe_env("RABBIT_PASSWORD", "guest");
      this->rmq_server_address_ = get_safe_env("RABBIT_ADDRESS", "texas.ct-a.ws");
      this->rmq_ssl_ = get_safe_env("TEXAS_SERVER_SSL","s") == "s";
      this->rmq_verify_peer_ssl_ = get_safe_env("TEXAS_VERIFY_SSL", "on") == "on";
      this->rmq_rabbit_init_ssl_ = get_safe_env("RABBIT_INIT_SSL", "on") == "on";

      ACE_Get_Opt cli_opt(argc, argv, ACE_TEXT(":"), 0);
      cli_opt.long_option("rabbitmq_address", 'h', ACE_Get_Opt::ARG_REQUIRED);
      cli_opt.long_option("rabbitmq_port", 'p', ACE_Get_Opt::ARG_REQUIRED);
      cli_opt.long_option("rabbitmq_username", 'u', ACE_Get_Opt::ARG_REQUIRED);
      cli_opt.long_option("rabbitmq_password", 's', ACE_Get_Opt::ARG_REQUIRED);
      cli_opt.long_option("websocket_port", 'w', ACE_Get_Opt::ARG_REQUIRED);
      cli_opt.long_option("browser_mode", 'b', ACE_Get_Opt::ARG_OPTIONAL);
      cli_opt.long_option("ssl_support", 'i', ACE_Get_Opt::ARG_OPTIONAL);
      cli_opt.long_option("ssl_peer_verification", 'v', ACE_Get_Opt::ARG_OPTIONAL);
      cli_opt.long_option("rabbit_mq_init_ssl", 'r', ACE_Get_Opt::ARG_OPTIONAL);

      int option;
      while ((option = cli_opt()) != -1)
        switch (option)
        {
        case 'h':
          this->rmq_server_address_ = cli_opt.opt_arg();
          break;
        case 'p':
          this->rmq_server_port_ = ACE_OS::atoi(cli_opt.opt_arg());
          break;
        case 'u':
          this->rmq_password_ = cli_opt.opt_arg();
          break;
        case 's':
          this->rmq_username_ = cli_opt.opt_arg();
          break;
        case 'w':
          this->s_http_port_ = ACE_OS::atoi(cli_opt.opt_arg());
          break;
        case 'b':
          this->browser_mode_ = true;
          break;
        case 'i':
          this->rmq_ssl_ = false;
          break;
        case 'v':
          this->rmq_verify_peer_ssl_ = false;
          break;
        case 'r':
          this->rmq_rabbit_init_ssl_ = false;
          break;
        default:
          break;
        }

      // Display the settings
      ACE_DEBUG((LM_INFO, ACE_TEXT("\t\t\trabbitmq address=\"%s\" :)\n"), this->rmq_server_address_.c_str()));
      ACE_DEBUG((LM_INFO, ACE_TEXT("\t\t\trabbitmq port=\"%d\" :)\n"), this->rmq_server_port_));
      ACE_DEBUG((LM_INFO, ACE_TEXT("\t\t\trabbitmq password=\"%s\" :)\n"), this->rmq_password_.c_str()));
      ACE_DEBUG((LM_INFO, ACE_TEXT("\t\t\trabbitmq username=\"%s\" :)\n"), this->rmq_username_.c_str()));
      ACE_DEBUG((LM_INFO, ACE_TEXT("\t\t\twebsocket port=\"%s\" :)\n"), this->s_http_port_.c_str()));
      ACE_DEBUG((LM_INFO, ACE_TEXT("\t\t\tbrowser mode enabled = %d :)\n"), this->browser_mode_));
      ACE_DEBUG((LM_INFO, ACE_TEXT("\t\t\tSSL enabled=%d :)\n"), rmq_ssl_));
      ACE_DEBUG((LM_INFO, ACE_TEXT("\t\t\tVerify Peer SSL=%d :)\n"), rmq_verify_peer_ssl_));
      ACE_DEBUG((LM_INFO, ACE_TEXT("\t\t\tRabbit Init SSL=%d :)\n"), rmq_rabbit_init_ssl_));
      return 0;
    }

    TexasService::TexasService() : mgr_(), s_http_port_("9999"), poll_timeout_(1000), rmq_server_address_("127.0.0.1"),
      rmq_server_port_(5672), rmq_consume_timeout_(1000), suspended_(false),
      svc_index_(0)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::TexasService()\n"), TexasService::svc_ident()));
    }

    TexasService::~TexasService()
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::~TexasService()\n"), TexasService::svc_ident()));
    }

    void
      TexasService::ev_handler(struct mg_connection* nc, int ev, void* ev_data)
    {
      switch (ev)
      {
        //------ General Events ------

      case MG_EV_POLL:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_POLL\n"), TexasService::svc_ident()
          ));
        break;

      case MG_EV_ACCEPT:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_ACCEPT\n"), TexasService::svc_ident
        ()));
        break;

      case MG_EV_CONNECT:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_CONNECT\n"), TexasService::
          svc_ident()));
        break;

      case MG_EV_RECV:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_RECV\n"), TexasService::svc_ident()
          ));
        break;

      case MG_EV_SEND:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_SEND\n"), TexasService::svc_ident()
          ));
        break;

      case MG_EV_CLOSE:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_CLOSE\n"), TexasService::svc_ident(
        )));
        break;

      case MG_EV_TIMER:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_TIMER\n"), TexasService::svc_ident(
        )));
        break;

        //------ Websocket Events ------

      case MG_EV_WEBSOCKET_HANDSHAKE_REQUEST:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_WEBSOCKET_HANDSHAKE_REQUEST\n"),
          TexasService::svc_ident()));
        break;

      case MG_EV_WEBSOCKET_HANDSHAKE_DONE:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_WEBSOCKET_HANDSHAKE_DONE\n"),
          TexasService::svc_ident()));
        break;

      case MG_EV_WEBSOCKET_FRAME:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_WEBSOCKET_FRAME \n"), TexasService
          ::svc_ident()));

        this->handle_ws_receive(static_cast<struct websocket_message *>(ev_data));

        break;

      case MG_EV_WEBSOCKET_CONTROL_FRAME:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_WEBSOCKET_CONTROL_FRAME \n"),
          TexasService::svc_ident()));
        break;

      case MG_EV_HTTP_REQUEST:
          ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - MG_EV_HTTP_REQUEST \n"),
              TexasService::svc_ident()));
          handle_http_request(nc, static_cast<struct http_message*>(ev_data));
          break;

        //------ Unhandled Events ------

      default:

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::ev_handler(...) - unhandled event %d\n"), TexasService::
          svc_ident(), ev));
        break;
      }
    }

    int
      TexasService::init(int argc, ACE_TCHAR* argv[])
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::init(int argc, ACE_TCHAR *argv[])\n"), TexasService::svc_ident(
      )));

      if (parse_args(argc, argv) == 0)
      {
        //------ Initialise the Mongoose Event Manager ------

        ACE_DEBUG((LM_INFO, ACE_TEXT(
          "(%P | %t)\t%s::init(int argc, ACE_TCHAR *argv[]) - initalise mongoose event manager\n"),
          TexasService::svc_ident()));

        mg_mgr_init(&mgr_, this);

        //------ Initialise the Websocket ------

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::init(int argc, ACE_TCHAR *argv[]) - initalise websocket\n")
          , TexasService::svc_ident()));

        this->nc_ = std::unique_ptr<mg_connection>(mg_bind(&mgr_, s_http_port_.c_str(), c_ev_handler));
        this->nc_->user_data = this; // required to callback this->ev_handler(...)
        mg_set_protocol_http_websocket(this->nc_.get());

        //------ Execute the active object ------

        ACE_DEBUG((LM_INFO, ACE_TEXT(
          "(%P | %t)\t%s::init(int argc, ACE_TCHAR *argv[]) - execute active object\n"), TexasService::
          svc_ident()));

        return this->execute(NUM_SVC_THREADS);
      }

      return -1; // Returning non-zero from init() will immediately unload the service
    }

    int TexasService::fini(void)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::fini()\n"), TexasService::svc_ident()));

      //------ Clean up the Mongoose Event Manager ------

      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::fini() - free mongoose event manager t\n"), TexasService::
        svc_ident()));

      mg_mgr_free(&mgr_);

      //------ Tell thread pool to close ------

      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::fini() - ask thread pool to close\n"), TexasService::svc_ident(
      )));

      this->module_closed();

      return 0;
    }

    int
      TexasService::info(ACE_TCHAR** info_string, size_t length) const
    {
      static const char* info_desc =
      {
        "Texas Service"
      };

      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::info(ACE_TCHAR **info_string, size_t length=%d)\n")
        ACE_TEXT("\t returns \"%s\".\n"), TexasService::svc_ident(), length, info_desc));

      return (info_string ? (*info_string = ACE::strnnew(info_desc, length), 0) : -1);
    }

    void TexasService::init_publish_connection()
    {
      // Set up the publisher.
      publisher_ = get_connector();

      if(publisher_ != nullptr)
      {
        // Declare the exchanges.
        declare_exchange(1, "texas.tracks", "fanout");
        declare_exchange(1, "texas.alerts", "fanout");
        declare_exchange(1, "texas.control", "topic");
        declare_exchange(1, "texas.replay", "fanout");

        // We're now connected.
        this->publisher_connected_ = true;

        nlohmann::json report;
        report["msgType"] = MSG_TYPE_REPORT;
        report["message"] = "Connected to Texas publisher exchange";
        this->handle_ws_send(report);
      }
    }

    void TexasService::init_consumer_connection()
    {
      consumer_ = get_connector();

      if (consumer_ != nullptr)
      {
        // Set up the consumers.
        this->rmq_setup_consumer_alerts(consumer_.get());
        this->rmq_setup_consumer_tracks(consumer_.get());
        this->rmq_setup_consumer_control(consumer_.get());
		this->rmq_setup_consumer_replay(consumer_.get());

        // We're now connected.
        this->consumer_connected_ = true;

        nlohmann::json report;
        report["msgType"] = MSG_TYPE_REPORT;
        report["message"] = "Connected to Texas consumer exchange";
        this->handle_ws_send(report);
      }
    }


    int TexasService::svc(void)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::svc()\n"), TexasService::svc_ident()));

      if (this->isAvailable())
      {
        if (this->svc_lock_.acquire() == 0)
        {
          const int index = this->svc_index_++;

          switch (index)
          {
          case 0: // Event manager polling

            this->svc_lock_.release(); // Let other svc routines go

            ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::svc() - start event manager polling\n"),
              TexasService::svc_ident()));

            while (this->isAvailable())
            {
              if (!suspended_)
              {
                mg_mgr_poll(&mgr_, poll_timeout_);

                if (!this->publisher_connected_)
                {
                  sleep(1);
                  init_publish_connection();
                }
              }
            }

            // Close the publisher
            publisher_->close();

            ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::svc() - end event manager polling \n"),
              TexasService::svc_ident()));

            break;

          case 1: // Consumers
          {
            this->svc_lock_.release(); // Let other svc routines go

            // TODO only wait here if NOT in browser mode. This blocking business needs some work, but for experiment
            // two this fix is sufficient enough to ensure that browsers in passive mode do not get blocked here (since the track
            // messages will not be received).
            if (!browser_mode_)
            {
              ownship_monitor_.wait();
            }

            ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::svc() - start consume alerts\n"), TexasService
              ::svc_ident()));

            init_consumer_connection();

            //------- Handle incoming messages ------

            timeval timeout{ 0, this->rmq_consume_timeout_ };
            while (isAvailable())
            {
              if(!this->consumer_connected_ || consumer_ == nullptr)
              {
                sleep(1);
                init_consumer_connection();
              }
              else if (consumer_ != nullptr)
              {
                amqp_envelope_t envelope;

                amqp_maybe_release_buffers(consumer_->state());

                // Block for 'timeout' waiting for messages.
                const auto reply = amqp_consume_message(consumer_->state(), &envelope, &timeout, 0);

                // AMQP_RESPONSE_NORMAL means we received a message.
                if (reply.reply_type == AMQP_RESPONSE_NORMAL)
                {
                  const std::vector<uint8_t> bytes(reinterpret_cast<char const*>(envelope.message.body.bytes),
                    reinterpret_cast<char const*>(envelope.message.body.bytes) + envelope.message.body.len);

                  nlohmann::json message = nlohmann::json::from_msgpack(bytes);

                  // Get a string representation of the message
                  std::string s(reinterpret_cast<char const*>(envelope.message.body.bytes),
                    envelope.message.body.len);

                  //ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_setup_consumer_default(...) - consumed message:\n"
                  //    // TODO print extra information?
                  //    //"\t\tchannel       : %s\n"
                  //    //"\t\texchange name : %s\n"
                  //    //"\t\texchange type : %s\n"
                  //    //"\t\trouting key   : %s\n"
                  //    TexasService::svc_ident(), s.c_str())
                  //);


                  // Previously we copied the message into a new char array, we can simply pass the message on to send it over the web socket
                  // In future this may change if we need to define new messages that don't mirror their sent message

                  this->handle_ws_send(message);
                }
                else if(reply.library_error != AMQP_STATUS_TIMEOUT)
                {
                  consumer_connected_ = false;
                  consumer_->close();

                  nlohmann::json report;
                  report["msgType"] = MSG_TYPE_REPORT;
                  report["message"] = "Disconnected from Texas consumer exchange";
                  this->handle_ws_send(report);
                }

                // Free memory created via the amqp_consume_message call.
                // Note this is OK to do here without copying the envelope since handle_ws_send is synchronous
                amqp_destroy_envelope(&envelope);
              }
            }

            // Service is shutting down so close out the connection for this thread.
            consumer_->close();

            ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::svc() - end consume alerts\n"), TexasService::
              svc_ident()));
          }
          break;
          default:;
          }
        }
      }

      return 0;
    }

    void
      TexasService::handle_ws_receive(websocket_message* wm)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::handle_ws_frame(...)\n"), TexasService::svc_ident()));

      // Get a string representation of the message
      const std::string s(reinterpret_cast<char const*>(wm->data), wm->size);

      try
      {
        auto message = nlohmann::json::parse(s);

        if (message.find("msgType") != message.end())
        {
          const auto msg_type = message.find("msgType").value().get<int>();

          // Determine which handler to use based on the type
          switch (msg_type)
          {
          case MSG_TYPE_TRACK_UPDATE:
          {
            // TODO technically this is broken for browsers at the moment since more than one browser can connect.
            // Save the ownship.
            ownship_ = message;

            ownship_monitor_.broadcast();
            this->rmq_publish_track(message);
            break;
          }

          case MSG_TYPE_ALERT_UPDATE:
          {
            this->rmq_publish_alert(message);
            break;
          }
          case MSG_TYPE_CONTROL_UPDATE:
          {
            if (message.find("deviceId") != message.end())
            {
              auto device_id = message["deviceId"].get<std::string>();
              this->rmq_publish_control(message, device_id);
            }
            break;
          }

          default:
            ACE_DEBUG((LM_INFO, ACE_TEXT(
              "(%P | %t)\t%s::handle_ws_frame(...) - ignore message, unhandled message type %d\n"),
              TexasService::svc_ident(), msg_type));
            break;
          }
        }
        else
        {
          ACE_DEBUG((LM_INFO, ACE_TEXT(
            "(%P | %t)\t%s::handle_ws_frame(...) - ignore message, missing msg_type field\n"),
            TexasService
            ::svc_ident()));
        }
      }
      catch (const nlohmann::detail::parse_error& parse_error)
      {
        ACE_DEBUG((LM_INFO, ACE_TEXT(
          "(%P | %t)\t%s::handle_ws_frame(...) - ignore message, unable to parse json (%s)\n"), TexasService::
          svc_ident(), parse_error.what()));
      }
    }

    void TexasService::handle_ws_send(nlohmann::json& message)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::handle_ws_send(...)\n"), TexasService::svc_ident()));

      std::lock_guard<std::mutex> lock(ws_lock_);

      try
      {
        auto message_str = message.dump();

        // Get the address of the transmitter
        char addr_tx[32];
        mg_sock_addr_to_str(&this->nc_->sa, addr_tx, sizeof(addr_tx),
          MG_SOCK_STRINGIFY_IP | MG_SOCK_STRINGIFY_PORT);

        for (auto c = mg_next(this->nc_->mgr, NULL); c != NULL; c = mg_next(nc_->mgr, c))
        {
          if (c == this->nc_.get())
            continue;
          if (c)
          {
            //// Get the address of the receiver
            char addr_rx[32];
            mg_sock_addr_to_str(&c->sa, addr_rx, sizeof(addr_rx), MG_SOCK_STRINGIFY_IP | MG_SOCK_STRINGIFY_PORT);

            ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::handle_ws_send(...) - sent websocket frame\n"
              "\t\tfrom     : %s\n"
              "\t\tto       : %s\n"
              "\t\tcontents : %s\n"),
              TexasService::svc_ident(), addr_tx, addr_rx, message_str.c_str())
            );

              mg_send_websocket_frame(c, WEBSOCKET_OP_TEXT, message_str.c_str(), message_str.length());
          }
        }
      }
      catch (const nlohmann::detail::type_error& ex)
      {
        ACE_DEBUG((LM_ERROR, ACE_TEXT("(%P | %t)\t%s::handle_ws_send(...) - error serialising json (s)\n"),
          TexasService::svc_ident(), ex.what()));
      }
    }

    void TexasService::handle_http_request(struct mg_connection* nc, http_message* http_message) const
    {
      const std::string uri(http_message->uri.p, http_message->uri.len);
      if (uri == "/healthz")
      {
        if (is_service_ready())
          mg_http_send_error(nc, 200, nullptr); // "OK"
        else
          mg_http_send_error(nc, 503, nullptr); // "Service Unavailable"
      }
    }

    bool TexasService::is_service_ready() const
    {
      return publisher_connected_ && consumer_connected_;
    }

    void TexasService::handle_publish_disconnection()
    {
      publisher_connected_ = false;
      publisher_->close();

      nlohmann::json report;
      report["msgType"] = MSG_TYPE_REPORT;
      report["message"] = "Disconnected from Texas publisher exchange";
      this->handle_ws_send(report);
    }

    void
      TexasService::rmq_publish_alert(nlohmann::json& message)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::handle_publish_alert(...)\n"), TexasService::svc_ident()));

      try
      {
        rmq_publish_default(
          message,        // json to send
          1,              // channel
          "texas.alerts", // exchange name
          "fanout",       // exchange type
          ""              // routing key
        );
      }
      catch (const AmqpException&)
      {
        handle_publish_disconnection();
      }
    }

    void TexasService::rmq_publish_track(nlohmann::json& message)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_publish_track(...)\n"), TexasService::svc_ident()));

      try
      {
        rmq_publish_default(
          message,        // json to send
          1,              // channel
          "texas.tracks", // exchange name
          "fanout",       // exchange type
          ""              // routing key
        );
      }
      catch(const AmqpException&)
      {
        handle_publish_disconnection();
      }
    }

    void TexasService::rmq_publish_replay(nlohmann::json& message)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_publish_replay(...)\n"), TexasService::svc_ident()));

      try
      {
        rmq_publish_default(
          message,        // json to send
          1,              // channel
          "texas.replay", // exchange name
          "fanout",       // exchange type
          ""              // routing key
        );
      }
      catch(const AmqpException&)
      {
        handle_publish_disconnection();
      }
    }

    void TexasService::rmq_publish_control(nlohmann::json& message, std::string& device_id)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_publish_track(...)\n"), TexasService::svc_ident()));
      try
      {
        rmq_publish_default(
          message,          // json to send
          1,                // channel
          "texas.control",  // exchange name
          "topic",         // exchange type
          device_id.c_str() // routing key
        );
      }
      catch (const AmqpException&)
      {
        handle_publish_disconnection();
      }
    }


    void TexasService::declare_exchange(int channel, const char* exchange_name, const char* exchange_type) const
    {
      /// Declare exchange (will not replace it if it already exists)
      amqp_exchange_declare(
        publisher_->state(), // connection state
        channel, // channel to do RPC on
        amqp_cstring_bytes(exchange_name), // exchange
        amqp_cstring_bytes(exchange_type), // type
        0, // 0     (off)
        1, // durable     (on)
        0, // auto delete (off)
        0, // internal    (off)
        amqp_empty_table // arguments
      );
    }

    void TexasService::rmq_publish_default(nlohmann::json& message, int channel, const char* exchange_name,
        const char* exchange_type, const char* routing_key) const
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_publish_default(...)\n"), TexasService::svc_ident()));

      auto packed = nlohmann::json::to_msgpack(message);
      const amqp_bytes_t_ bytes{ packed.size(), packed.data() };

      if (publisher_ != nullptr)
      {
        // Create properties
        amqp_basic_properties_t props;
        props._flags = AMQP_BASIC_CONTENT_TYPE_FLAG | AMQP_BASIC_DELIVERY_MODE_FLAG;
        props.content_type = amqp_cstring_bytes("text/plain");
        props.delivery_mode = 2; // Persistent delivery mode

		// TODO handle exceptions for incoming messages that are packed incorrectly
        // Publish message to exchange
        const auto result = amqp_basic_publish(
          publisher_->state(), // state
          channel, // channel
          amqp_cstring_bytes(exchange_name), // exchange
          amqp_cstring_bytes(routing_key), // routing key
          0, // mandatory    (off)
          0, // immediate    (off)
          &props, // properties
          bytes // body
        );

        if(result != 0)
        {
          throw AmqpException(result);
        }

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_publish_default(...) PUBLISH RESULT = %i\n"), TexasService::svc_ident(), result));

        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_publish_default(...) - published message:\n"
          "\t\tchannel       : %d\n"
          "\t\texchange name : %s\n"
          "\t\texchange type : %s\n"
          "\t\trouting key   : %s\n"
          "\t\tcontents      : %s\n"),
          TexasService::svc_ident(), channel, exchange_name, exchange_type, routing_key, message.dump().c_str())
        );
      }
    }

    void TexasService::rmq_setup_consumer_alerts(taf::rabbit_mq::RabbitMQConnector* consumer) const
    {
        ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_setup_consumer_alerts()\n"), TexasService::svc_ident()));

        rmq_setup_consumer_default(
        1,              // channel
        "texas.alerts", // exchange name
        "fanout",       // exchange type
        "",             // routing key
        consumer
      );
    }

    void TexasService::rmq_setup_consumer_tracks(taf::rabbit_mq::RabbitMQConnector* consumer) const
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_setup_consumer_tracks()\n"), TexasService::svc_ident()));

      rmq_setup_consumer_default(
        1, // channel
        "texas.tracks", // exchange name
        "fanout", // exchange type
        "", // routing key
        consumer
      );
    }

    void TexasService::rmq_setup_consumer_control(taf::rabbit_mq::RabbitMQConnector* consumer)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_consume_control()\n"), TexasService::svc_ident()));

      if (this->ownship_.find("deviceId") != ownship_.end())
      {
        auto device_id = ownship_["deviceId"].get<std::string>();

        std::stringstream queue_name;
        queue_name << device_id << "-control-queue";

        rmq_setup_consumer_default(
          1, // channel
          "texas.control", // exchange name
          "topic", // exchange type
          device_id.c_str(), // routing key
          consumer,
          false,
          amqp_cstring_bytes(queue_name.str().c_str())
        );
      }
    }

    void
      TexasService::rmq_setup_consumer_replay(taf::rabbit_mq::RabbitMQConnector* consumer)
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_setup_consumer_replay()\n"), TexasService::svc_ident()));

      rmq_setup_consumer_default(
        1, // channel
        "texas.replay", // exchange name
        "fanout", // exchange type
        "", // routing key
        consumer
      );
    }

    void TexasService::rmq_setup_consumer_default(int channel, const char* exchange_name, const char* exchange_type,
        const char* routing_key, taf::rabbit_mq::RabbitMQConnector* consumer,
        bool auto_delete_queue, amqp_bytes_t queue_name) const
    {
      ACE_DEBUG((LM_INFO, ACE_TEXT("(%P | %t)\t%s::rmq_setup_consumer_default(...)\n"), TexasService::svc_ident())
      );

      if (consumer != nullptr)
      {
        //------- Declare Exchange, queue, and then bind to queue ------

        amqp_exchange_declare(
          consumer->state(), // connection state
          channel, // channel to do RPC on
          amqp_cstring_bytes(exchange_name), // exchange
          amqp_cstring_bytes(exchange_type), // type
          0, // passive     (off)
          1, // durable     (on)
          0, // auto delete (off)
          0, // internal    (off)
          amqp_empty_table // arguments
        );

        const auto ret_queue = amqp_queue_declare(
          consumer->state(), // connection state
          channel, // channel to do RPC on
          queue_name, // queue
          0, // passive     (off)
          0, // durable     (off)
          0, // exclusive   (off)
          auto_delete_queue, // auto delete (on)
          amqp_empty_table // arguments
        );

        amqp_queue_bind(
          consumer->state(), // connection state
          channel, // channel to do RPC on
          ret_queue->queue, // queue
          amqp_cstring_bytes(exchange_name), // exchange
          amqp_cstring_bytes(routing_key), // routing key
          amqp_empty_table // arguments
        );

        amqp_basic_consume(
          consumer->state(), // connection state
          channel, // channel to do RPC on
          ret_queue->queue, // queue
          amqp_empty_bytes, // consumer tag
          0, // no local tag  (off)
          1, // no ack        (on)
          0, // exclusive     (off)
          amqp_empty_table // arguments
        );
      }
    }

    /*
    * If connection open and connected with credentials, returns a unique pointer to a non thread safe RabbitMQ Connector,
    * Otherwise returns a unique pointer to a nullptr which can be used by the caller to check the result
    * TODO throw exceptions instead or build exceptions into the connector project?
    */
    std::unique_ptr<taf::rabbit_mq::RabbitMQConnector> TexasService::get_connector(void) const
    {
      // The RabbitMQ connector object. The RabbitMQ C client is not thread safe.
      std::unique_ptr<taf::rabbit_mq::RabbitMQConnector> connector(new taf::rabbit_mq::RabbitMQConnector());

      // Open a connection to the RabbitMQ server
      const auto open = connector->open(this->rmq_server_address_.c_str(), this->rmq_server_port_, this->rmq_ssl_, rmq_verify_peer_ssl_, rmq_rabbit_init_ssl_);
      if (!open)
      {
        ACE_DEBUG((LM_ERROR, ACE_TEXT(
          "(%P | %t)\t%s::get_connector(...) - Error: Cannot open connection to RabbitMQ server\n"),
          TexasService::svc_ident()));
        return std::unique_ptr<taf::rabbit_mq::RabbitMQConnector>(nullptr);
      }

      // Login with a 10 second heartbeat.
      const auto result = amqp_login(connector->state(), "/", 0, 131072, 10, AMQP_SASL_METHOD_PLAIN, this->rmq_username_.c_str(), this->rmq_password_.c_str());
      if (result.reply_type == AMQP_RESPONSE_NORMAL)
      {
        amqp_channel_open(connector->state(), 1);
      }
      else
      {
        connector->close();
        ACE_DEBUG((LM_ERROR, ACE_TEXT(
          "(%P | %t)\t%s::get_connector(...) - Error: Cannot open connect to RabbitMQ with provided credentials\n"
        ), TexasService::svc_ident()));
        return std::unique_ptr<taf::rabbit_mq::RabbitMQConnector>(nullptr);
      }

      // Return the connected connector
      return connector;
    }
  } // namespace texas
} // namespace lasagne
