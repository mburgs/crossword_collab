package main

import (
	"flag"
	"fmt"
	"github.com/jmoiron/sqlx"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
)

var (
	addr      = flag.String("addr", ":8086", "http service address")
	assets    = flag.String("assets", defaultAssetPath(), "path to assets")
	homeTempl *template.Template
	db        *sqlx.DB
)

func defaultAssetPath() string {
	return "../src/bitbucket.org/mburgs/crossword_collab"
}

/** Utils **/
func getNum(value string) int {
	num, err := strconv.ParseInt(value, 0, 0)

	if err != nil {
		log.Fatal(err)
		num = 0
	}

	return int(num)
}

func homeHandler(c http.ResponseWriter, req *http.Request) {
	//todo read on server load and save in memory
	dat, err := ioutil.ReadFile(filepath.Join(*assets, "main.html"))

	if err != nil {
		fmt.Fprintln(c, err)
	} else {
		fmt.Fprintln(c, string(dat))
	}
}

func main() {
	flag.Parse()

	db = db_init()

	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/ws/", wsHandler)
	http.HandleFunc("/api/", apiHandler)

	if err := http.ListenAndServe(*addr, nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
