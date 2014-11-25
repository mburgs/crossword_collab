package main

import (
	"fmt"
	"log"
	"strconv"
	"strings"
)

type hub struct {
	Id int

	// Registered connections.
	connections map[*connection]bool

	// Inbound messages from the connections.
	broadcast chan []byte

	// Register requests from the connections.
	register chan *connection

	// Unregister requests from connections.
	unregister chan *connection
}

func (h *hub) run() {
	for {
		select {
		case c := <-h.register:
			h.connections[c] = true
			if m, err := h.getLetters(); err == nil {
				c.send <- m
			}
		case c := <-h.unregister:
			delete(h.connections, c)
			close(c.send)
		case m := <-h.broadcast:
			parts := strings.Split(string(m), ":")
			pos, err := strconv.ParseInt(parts[0], 0, 0)

			if err != nil {
				fmt.Println(err)
				continue
			}

			h.insertLetter(parts[1], int(pos))
			for c := range h.connections {
				select {
				case c.send <- m:
				default:
					delete(h.connections, c)
					close(c.send)
				}
			}
		}
	}
}

func NewHub(id int) *hub {
	h := hub{
		Id:          id,
		broadcast:   make(chan []byte),
		register:    make(chan *connection),
		unregister:  make(chan *connection),
		connections: make(map[*connection]bool),
	}

	//@todo insert into hubs table

	return &h
}

func (h *hub) setPuzzle(puzzle_id int) {

}

var letterInsert = "INSERT into letters (hub_id, letter, position) VALUES (?, ?, ?)"

func (h *hub) insertLetter(letter string, position int) {
	db.MustExec(letterInsert, h.Id, letter, position)
}

func (h *hub) getLetters() ([]byte, error) {
	rows, err := db.Queryx("SELECT * FROM letters WHERE hub_id=?", h.Id)

	if err != nil {
		log.Fatal(err)
	}

	letter := lettermodel{}
	var ret []string

	for rows.Next() {
		err := rows.StructScan(&letter)
		if err != nil {
			fmt.Println(err)
			continue
		}
		ret = append(ret, letter.toString())
	}

	return []byte("@" + strings.Join(ret, ",")), err
}
