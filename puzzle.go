package main

import (
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"
)

type puzzle struct {
	Width       int
	Height      int
	CluesAcross int
	CluesDown   int
	Format      string

	//coords of the blocks
	blocks []bool
}

func (p *puzzle) GetBlocks() []bool {
	return p.blocks
}

func getPuzzle() *puzzle {
	return &puzzle{
		Width:  15,
		Height: 15,
		blocks: []bool{
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
			false, false, false, false, false, true, false, false, false, false, true, false, false, false,
		},
	}
}

func NewPuzzle(metadata string) puzzle {
	const WIDTH = 8
	const HEIGHT = 10
	const CLUES_ACROSS = 12
	const CLUES_DOWN = 14
	const START_PUZZLE = 16

	const NO_MODE = 0
	const FORMAT_MODE = 1
	const CLUES_ACROSS_MODE = 2
	const CLUES_DOWN_MODE = 3

	p := puzzle{}

	lines := strings.Split(metadata, "\n")

	cluesAcross := []string{}
	cluesDown := []string{}

	var mode = NO_MODE
	p.Format = ""

	for key, value := range lines {

		if mode > 0 {

			value = strings.TrimSpace(value)

			if value != "" {
				switch mode {

				case FORMAT_MODE:
					p.Format += value
					break

				case CLUES_ACROSS_MODE:
					cluesAcross = append(cluesAcross, value)
					break

				case CLUES_DOWN_MODE:
					cluesDown = append(cluesDown, value)
					break

				}
			} else {
				mode += 1
			}

			continue
		}

		switch key {

		case WIDTH:
			p.Width = getNum(value)
			break

		case HEIGHT:
			p.Height = getNum(value)
			break

		case CLUES_ACROSS:
			p.CluesAcross = getNum(value)
			break

		case CLUES_DOWN:
			p.CluesDown = getNum(value)
			break

		case START_PUZZLE:
			mode = FORMAT_MODE
			break
		}
	}
	//@todo insert into puzzles table
	return p
}

func getNum(value string) int {
	num, err := strconv.ParseInt(value, 0, 0)

	if err != nil {
		log.Fatal(err)
	}

	return int(num)
}

func HttpLoadPuzzle(puzzle string) (puzzle, error) {
	response, err := http.Get("http://www.brainsonly.com/servlets-newsday-crossword/newsdaycrossword?date=" + puzzle)
	if err != nil {
		log.Fatal(err)
	}
	defer response.Body.Close()
	contents, err := ioutil.ReadAll(response.Body)
	if err != nil {
		log.Fatal(err)
	}
	return NewPuzzle(string(contents)), nil
}
