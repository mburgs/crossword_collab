package main

import (
	"fmt"
	"github.com/gorilla/websocket"
	"net/http"
	"strconv"
	"strings"
)

type connection struct {
	// The websocket connection.
	ws *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte

	//hub - the room this connection belongs to
	h *hub
}

func (c *connection) reader() {
	for {
		_, message, err := c.ws.ReadMessage()
		if err != nil {
			break
		}
		c.h.broadcast <- message
	}
	c.ws.Close()
}

func (c *connection) writer() {
	for message := range c.send {
		err := c.ws.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			break
		}
	}
	c.ws.Close()
}

var upgrader = &websocket.Upgrader{ReadBufferSize: 1024, WriteBufferSize: 1024}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println(err)
		return
	}

	parts := strings.Split(r.URL.Path, "/")
	id, err := strconv.ParseInt(parts[len(parts)-1], 0, 0)

	if err != nil {
		fmt.Println(err)
		return
	}

	c := &connection{
		send: make(chan []byte, 256),
		ws:   ws,
		h:    hm.get(int(id)),
	}

	c.h.register <- c
	defer func() { c.h.unregister <- c }()
	go c.writer()
	c.reader()
}
