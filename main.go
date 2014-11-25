package main

import (
	"flag"
	"fmt"
	//	"go/build"
	"github.com/jmoiron/sqlx"
	"html/template"
	"log"
	"net/http"
	"path/filepath"
)

var (
	addr      = flag.String("addr", ":8086", "http service address")
	assets    = flag.String("assets", defaultAssetPath(), "path to assets")
	homeTempl *template.Template
	funcMap   template.FuncMap
	db        *sqlx.DB
)

func defaultAssetPath() string {
	return "."
}

func mod(a int, b int) int {
	return a % b
}

func homeHandler(c http.ResponseWriter, req *http.Request) {
	if err := homeTempl.Execute(c, req.Host); err != nil {
		fmt.Fprintln(c, err)
	}
}

func main() {
	flag.Parse()

	funcMap = make(template.FuncMap)
	funcMap["getPuzzle"] = getPuzzle
	funcMap["mod"] = mod

	homeTempl = template.Must(
		template.New("home.html").Funcs(funcMap).ParseFiles(filepath.Join(*assets, "home.html")))

	db = db_init()

	http.HandleFunc("/", homeHandler)
	http.HandleFunc("/ws/", wsHandler)
	if err := http.ListenAndServe(*addr, nil); err != nil {
		log.Fatal("ListenAndServe:", err)
	}
}
