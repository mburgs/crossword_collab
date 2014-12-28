var TYPE_PLAIN = 0,
    TYPE_ACROSS = 1,
    TYPE_DOWN = 2,
    TYPE_BOTH = 3, // TYPE_ACROSS & TYPE_DOWN
    TYPE_BLOCK = -1; //numbering will be ignored

var conn, appModel, letterMap = {};

$(document).on('keyup', function(e) {
    if (e.which == 37) {
        console.log('left');
        appModel.direction('across');
    } else if (e.which == 38) {
        console.log('up');
        appModel.direction('down');
    } else if (e.which == 39) {
        console.log('right');
        appModel.direction('across');
    } else if(e.which == 40) {
        console.log('down');
        appModel.direction('down');
    }
});

function setupWebsocket() {
    if (window["WebSocket"]) {
        conn = new WebSocket("ws://" + window.location.host + "/ws/" + location.href.split('/').pop());
        conn.onclose = function(evt) {
            console.log("Connection closed.");
        }
        conn.onmessage = messageListener;
    } else {
        alert("Your browser does not support WebSockets.");
    }
}

function messageListener(evt) {
    var data = evt.data;

    if (data[0] != '@') {
        data = [data];
    } else {
        data = data.substr(1).split(',');
    }

    for (var i=0; i < data.length; i++) {
        var parts = data[i].split(':'),
            index = parts[0],
            val = parts[1];

        letterMap[index].setValue(val);
    }
}

function Square(id) {
    var self = this;

    letterMap[id] = this;

    this.letterId = id;
    this.typeFlag = 0;
    this.value = ko.observable('');
    this.focus = ko.observable(false);

    this.value.subscribe(valueListener.bind(this));
    this.focus.subscribe(focusListener.bind(this));

    this.classes = ko.pureComputed(function() {
        if (
            (appModel.direction() == 'across' && appModel.currentClue() == self.acrossNumber) ||
            (appModel.direction() == 'down' && appModel.currentClue() == self.downNumber)
        ) {
            return 'highlight';
        }
    }, appModel);

    function valueListener(value) {
        if (!this.settingFromMessage) {
            conn.send(this.letterId + ':' + value);
        }
    }

    function focusListener(focused) {
        if (focused) {
            var clue = appModel.direction() == 'down' ? this.downNumber : this.acrossNumber;
        }

        appModel.currentClue(clue);
    }


    this.setValue = function(val) {
        this.settingFromMessage = true;
        this.value(val);
        this.settingFromMessage = false;
    }
}

function Clue(number, clue, direction, startSquare) {
    var self = this;
    this.number = number;
    this.clue = clue;
    this.direction = direction;
    this.startSquare = startSquare;

    this.highlight = ko.pureComputed(function() {
        if (appModel.currentClue() == self.number &&
            appModel.direction() == self.direction) {
            return true;
        }
    }, appModel);

    this.clickListener = (function(e) {
        appModel.direction(this.direction);
        appModel.currentClue(this.number);
        this.startSquare.focus(true);
    }).bind(this);
}

function AppModel(puzzle) {
    this.currentClue = ko.observable(1);
    this.direction = ko.observable('across');

    this.clues = {
        'Across': [],
        'Down': []
    };

    //setup formatting and clues

    var size = puzzle.Format.length,
        formatted = new Array(size),
        width = puzzle.Width,
        clueCounter = 1,
        currentDown, currentAcross,
        acrossCounter = downCounter = 0;

    //initialize
    while(size--) formatted[size] = new Square(size);

    for (var ind in puzzle.Format) {
        var i = +ind,
            c = puzzle.Format[i]; //ensure int

        if (c != '#') {
            if (i < width ) {
                formatted[i].typeFlag |= TYPE_DOWN;
            }

            if (i % width == 0) {
                formatted[i].typeFlag |= TYPE_ACROSS;
            }


            //save which numbers are which type
            if (formatted[i].typeFlag & TYPE_ACROSS) {
                this.clues.Across.push(new Clue(
                    clueCounter,
                    puzzle.CluesAcross[acrossCounter++],
                    'across',
                    formatted[i]
                ));
                currentAcross = clueCounter;
            }

            if (formatted[i].typeFlag & TYPE_DOWN) {
                this.clues.Down.push(new Clue(
                    clueCounter,
                    puzzle.CluesDown[downCounter++],
                    'down',
                    formatted[i]
                ));
                currentDown = clueCounter;
            } else {
                //special handling since horizontally adjacent squares dont share numbers
                currentDown = formatted[i - width].downNumber;
            }

            //set which clues this square is a part of
            //keep this out of the above block for similarity to acrossNumber
            formatted[i].downNumber = currentDown;
            formatted[i].acrossNumber = currentAcross;

            //set the numbers to show which clue starts where
            if (formatted[i].typeFlag != TYPE_PLAIN) {
                formatted[i].cornerNumber = clueCounter++;
            }
        } else {
            formatted[i].typeFlag = TYPE_BLOCK;

            if (i + 1 < formatted.length
                && puzzle.Format[i+1] != '#') {

                formatted[i+1].typeFlag |= TYPE_ACROSS;
            }

            if (i + width < formatted.length
                && puzzle.Format[i+width] != '#') {
                formatted[i+width].typeFlag |= TYPE_DOWN;
            }
        }
    }

    //put them into rows
    size = formatted.length / width;
    this.Squares = new Array(size);
    var row;

    while (size--) this.Squares[size] = [];

    for (var i in formatted) {
        row = Math.floor(i / width);

        this.Squares[row].push(formatted[i]);
    }

    setupWebsocket();

    return this;
};

$.getJSON('/api/puzzle', function(data) {
    appModel = new AppModel(data);
    ko.applyBindings(appModel);
});