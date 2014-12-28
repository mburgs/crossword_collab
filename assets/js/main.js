var TYPE_PLAIN = 0,
    TYPE_ACROSS = 1,
    TYPE_DOWN = 2,
    TYPE_BOTH = 3, // TYPE_ACROSS & TYPE_DOWN
    TYPE_BLOCK = -1; //numbering will be ignored

var conn, appModel;

ko.bindingHandlers.selectOnFocus = {
    'init': function(element) {
        $(element).on('focus', function() {
            $(this).select();
        });
    }
};

$(document).on('keydown', function(e) {
    if (e.which >=37 && e.which <= 40) {
        appModel.direction(e.which % 2 ? 'across' : 'down');
        appModel[(e.which <= 38 ? 'prev' : 'next')  +'Letter']();

        e.preventDefault();
    } else if (e.which == 32) {
        //sapcebar
        appModel.direction(appModel.direction() == 'across' ? 'down' : 'across');
        e.preventDefault();
        return false;
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

        appModel.squareMap[index].setValue(val);
    }
}

function Square(id) {
    var self = this;

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

            if (value) {
                appModel.nextLetter();
            }
        }
    }

    function focusListener(focused) {
        if (focused) {
            var clue = appModel.direction() == 'down' ? this.downNumber : this.acrossNumber;

            appModel.currentSquare(this);
        }
    }


    this.setValue = function(val) {
        this.settingFromMessage = true;
        this.value(val);
        this.settingFromMessage = false;
    }
}

Square.prototype.partOf = function(clue) {
    if (clue.direction == 'across') {
        return clue.number == this.acrossNumber;
    } else {
        return clue.number == this.downNumber;
    }
};

function Clue(number, clue, direction, startSquare) {
    var self = this;
    this.number = number;
    this.clue = clue;
    this.direction = direction;
    this.startSquare = startSquare;

    this.classes = ko.pureComputed(function() {
        if (
            appModel.currentClue() == self.number &&
            appModel.direction() == self.direction
            ) {
            return 'current highlight';
        } else if (appModel.currentSquare() && 
            appModel.currentSquare().partOf(self)) {
            return 'highlight';
        }
    }, appModel);

    this.clickListener = (function(e) {
        appModel.direction(this.direction);
        this.startSquare.focus(true);
    }).bind(this);
}

function AppModel(puzzle) {
    this.currentClue = ko.pureComputed(function() {
        if (!this.currentSquare()) {
            return;
        }

        if (this.direction() == 'across') {
            return this.currentSquare().acrossNumber;
        } else {
            return this.currentSquare().downNumber;
        }
    }, this);

    this.direction = ko.observable('across');
    this.currentSquare = ko.observable(null);

    this.perSide = puzzle.Width;

    this.clues = {
        'Across': [],
        'Down': []
    };

    //setup formatting and clues

    var size = puzzle.Format.length,
        width = puzzle.Width,
        clueCounter = 1,
        currentDown, currentAcross,
        acrossCounter = downCounter = 0;

    this.squareMap = new Array(size)

    while(size--) this.squareMap[size] = new Square(size);

    for (var ind in puzzle.Format) {
        var i = +ind,
            c = puzzle.Format[i]; //ensure int

        if (c != '#') {
            if (i < width ) {
                this.squareMap[i].typeFlag |= TYPE_DOWN;
            }

            if (i % width == 0) {
                this.squareMap[i].typeFlag |= TYPE_ACROSS;
            }


            //save which numbers are which type
            if (this.squareMap[i].typeFlag & TYPE_ACROSS) {
                this.clues.Across.push(new Clue(
                    clueCounter,
                    puzzle.CluesAcross[acrossCounter++],
                    'across',
                    this.squareMap[i]
                ));
                currentAcross = clueCounter;
            }

            if (this.squareMap[i].typeFlag & TYPE_DOWN) {
                this.clues.Down.push(new Clue(
                    clueCounter,
                    puzzle.CluesDown[downCounter++],
                    'down',
                    this.squareMap[i]
                ));
                currentDown = clueCounter;
            } else {
                //special handling since horizontally adjacent squares dont share numbers
                currentDown = this.squareMap[i - width].downNumber;
            }

            //set which clues this square is a part of
            //keep this out of the above block for similarity to acrossNumber
            this.squareMap[i].downNumber = currentDown;
            this.squareMap[i].acrossNumber = currentAcross;

            //set the numbers to show which clue starts where
            if (this.squareMap[i].typeFlag != TYPE_PLAIN) {
                this.squareMap[i].cornerNumber = clueCounter++;
            }
        } else {
            this.squareMap[i].typeFlag = TYPE_BLOCK;

            if (i + 1 < this.squareMap.length
                && puzzle.Format[i+1] != '#') {

                this.squareMap[i+1].typeFlag |= TYPE_ACROSS;
            }

            if (i + width < this.squareMap.length
                && puzzle.Format[i+width] != '#') {
                this.squareMap[i+width].typeFlag |= TYPE_DOWN;
            }
        }
    }

    //put them into rows
    size = this.squareMap.length / width;
    this.Squares = new Array(size);
    var row;

    while (size--) this.Squares[size] = [];

    for (var i in this.squareMap) {
        row = Math.floor(i / width);

        this.Squares[row].push(this.squareMap[i]);
    }

    setupWebsocket();

    return this;
};

AppModel.prototype.nextLetter = function() {
    this.focusLetter(1);
};

AppModel.prototype.prevLetter = function() {
    this.focusLetter(-1);
};

AppModel.prototype.focusLetter = function(dir) {
    var next = this.getLetter(dir);

    while(next && next.typeFlag == TYPE_BLOCK) {
        next = this.getLetter(dir, next)
    }

    if (next) {
        next.focus(true);
    }
};

/**
Gets letter in sequence. Dir is either 1 (forward) or -1 (backward)
This function takes into account the current direction
**/
AppModel.prototype.getLetter = function(dir, base) {
    if (this.direction() == 'across') {
        return this.getOffsetSquare(1 * dir, base);
    } else {
        return this.getOffsetSquare(this.perSide * dir, base);
    }
}

/**
Facility for getting squares given an offset. Returns null for an
undefined square (out of bounds)
**/
AppModel.prototype.getOffsetSquare = function(offset, base) {
    if (!base) {
        base = this.currentSquare();
    }
    try {
        return this.squareMap[base.letterId + offset];
    } catch (e) {
        console.log(e);
        return null;
    }
};

$.getJSON('/api/puzzle', function(data) {
    appModel = new AppModel(data);
    ko.applyBindings(appModel);
});