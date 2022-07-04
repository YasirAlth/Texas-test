# Texas Tasking
The purpose of this service is to provide an automatic tasking service for Contextual Alerts.

When a new task is created, if auto assign is enabled the closest available track is selected (if there is one). 
This service subscribes to tracks from the AMQP track exchange and uses a local PouchDB database to synchronise
tasking updates with the wider system.
