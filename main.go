package main

import (
	"os"

	log "github.com/Sirupsen/logrus"
	"github.com/ninjasphere/go-openzwave"
	"github.com/ninjasphere/go-openzwave/LOG_LEVEL"
)

func main() {
	config := os.Getenv("OZW_CONFIG")
	if config == "" {
		log.Fatal("OZW_CONFIG variable not set")
	}

	ozw := openzwave.
		BuildAPI(config, "", "").
		AddIntOption("SaveLogLevel", LOG_LEVEL.NONE).
		AddIntOption("QueueLogLevel", LOG_LEVEL.NONE).
		AddIntOption("DumpTrigger", LOG_LEVEL.NONE).
		AddIntOption("PollInterval", 500).
		AddBoolOption("IntervalBetweenPolls", true).
		AddBoolOption("ValidateValueChanges", true).
		SetNotificationCallback(notificationCallback).
		SetEventsCallback(eventCallback).
		SetEventLoop(loop)

	ozw.Run()

}

func notificationCallback(api openzwave.API, notification openzwave.Notification) {
	log.Printf("New notification %s received for device %s", notification.GetNotificationType().String(), notification.GetNode().GetNodeName())
	log.Println("============= Notification")
	log.Printf("%#v", notification)
	log.Println("============= Node")
	log.Printf("%#v", notification.GetNode())
	log.Println("============= Device")
	log.Printf("%#v", notification.GetNode().GetDevice())
}

func eventCallback(api openzwave.API, event openzwave.Event) {
	log.Printf("New event received for device %s", event.GetNode().GetNodeName())
}

func loop(api openzwave.API) int {
	log.Info("Event loop starts")
	for {
		select {
		case <-api.QuitSignal():
			log.Info("event loop ended")
			return 0
		}
	}
}
