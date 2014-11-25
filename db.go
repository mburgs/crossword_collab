package main

import (
	// "database/sql"
	"fmt"
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
	"strconv"
	// "log"
)

type hubmodel struct {
	Id int

	Create_timestamp string
}

type lettermodel struct {
	Hub_id   int
	Position int
	Letter   string
}

func (l *lettermodel) toString() string {
	return strconv.Itoa(l.Position) + ":" + l.Letter
}

var schema = []string{`
CREATE TABLE letters (
    hub_id int,
    position int,
    letter char(1),
    CONSTRAINT pkey PRIMARY KEY (hub_id, position) ON CONFLICT REPLACE
)`,
	`CREATE TABLE hubs (
    id int PRIMARY KEY,
    puzzle_id int,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`,
	`CREATE TABLE puzzles (
	id int PRIMARY KEY,
	foreign_id VARCHAR
	rows int
	columns int
	format TEXT
	credit VARCHAR
	publish_date DATE
)`}

func db_init() *sqlx.DB {
	db, err := sqlx.Connect("sqlite3", ":memory:")

	if err != nil {
		fmt.Println(err)
	}

	for _, q := range schema {
		db.MustExec(q)
	}

	return db
}
