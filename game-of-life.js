/*
Copyright (c) 2009 Pedro Verruma, http://pmav.eu

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

/**
 * Game of Life
 * by Pedro Verruma, pmav.eu, 04/Sep/2010
 * Russian translation and further development by Andrey Zabolotskiy, 2012-2016
 */

// Enable global access to functions that load a state
var GOLloadState, GOLrandom;

(function () {

  var GOL = {

    columns : 0,
    rows : 0,
    torus : false,
  
    waitTime: 0,
    generation : 0,

    running : false,
    autoplay : false,


    // Clear state
    clear : {
      schedule : false
    },


    // Average execution times
    times : {
      algorithm : 0,
      gui : 0
    },


    // DOM elements
    element : {
      generation : null,
      steptime : null,
      livecells : null,
      messages : {
        layout : null
      }
    },

    // Initial state
    initialState : '[{"39":[110]},{"40":[112]},{"41":[109,110,113,114,115]}]',
    
    // Rules of survival and birth
    rule : {
      s : null,
      b : null
    },

    // Trail state
    trail : {
      current: false,
      schedule : false
    },


    // Grid style
    grid : {
      current : 0,

      schemes : [
      {
        color : '#F3F3F3'
      },

      {
        color : '#FFFFFF'
      },

      {
        color : '#666666'
      },

      {
        color : '' // Special case: 0px grid
      }
      ]
    },


    // Zoom level
    zoom : {
      current : 0,
      schedule : false,

      schemes : [
      // { columns : 100, rows : 48, cellSize : 8 },
      {
        columns : 150,
        rows : 86,
        cellSize : 4
      },

      {
        columns : 300,
        rows : 144,
        cellSize : 2
      },

      {
        columns : 450,
        rows : 216,
        cellSize : 1
      }
      ]
    },


    // Cell colors
    colors : {
      current : 0,
      schedule : false,

      schemes : [
      {
        dead : '#FFFFFF',
        trail : ['#B5ECA2'],
        alive : ['#9898FF', '#8585FF', '#7272FF', '#5F5FFF', '#4C4CFF', '#3939FF', '#2626FF', '#1313FF', '#0000FF', '#1313FF', '#2626FF', '#3939FF', '#4C4CFF', '#5F5FFF', '#7272FF', '#8585FF']
      },

      {
        dead : '#FFFFFF',
        trail : ['#EE82EE', '#FF0000', '#FF7F00', '#FFFF00', '#008000 ', '#0000FF', '#4B0082'],
        alive : ['#FF0000', '#FF7F00', '#FFFF00', '#008000 ', '#0000FF', '#4B0082', '#EE82EE']
      },

      {
        dead : '#FFFFFF',
        trail : ['#9898FF', '#8585FF', '#7272FF', '#5F5FFF', '#4C4CFF', '#3939FF', '#2626FF', '#1313FF', '#0000FF', '#1313FF', '#2626FF', '#3939FF', '#4C4CFF', '#5F5FFF', '#7272FF', '#8585FF'],
        alive : ['#000000']
      }

      ]
    },


    // Texts for messages and buttons
    str : null,
    
    language : {
      ru : {
        error    : 'Ошибка: ',
        warning  : 'Предупреждение: ',
        stop     : ' Стоп ',
        run      : ' Пуск ',
        trailoff : 'След выключен',
        trailon  : 'След включён',
        colors   : 'Цветовая схема №',
        grids    : 'Способ отображения сетки №',
        unknown  : 'неизвестные символы в строке: ',
        badhead  : 'плохой заголовок RLE: ',
        atline   : 'на строке ',
        ncols    : ' число столбцов в коде RLE ',
        toomany  : ' больше указанного в строке формата ',
        nlines   : 'число строк в коде RLE ',
        notmatch : ' не совпадает с указанным в строке формата '
      },
      
      en : {
        error    : 'Error: ',
        warning  : 'Warning: ',
        stop     : ' Stop ',
        run      : ' Run ',
        trailoff : 'Trail is Off',
        trailon  : 'Trail is On',
        colors   : 'Color Scheme #',
        grids    : 'Grid Scheme #',
        unknown  : 'unknown symbols in the line: ',
        badhead  : 'bad RLE header: ',
        atline   : 'at line ',
        ncols    : ' the number of columns in the RLE code ',
        toomany  : ' exceeds the y-number from the format string ',
        nlines   : 'the number of lines in the RLE code ',
        notmatch : ' does not match the x-number from the format string '
      }
    },


    /**
      * On Load Event
      */
    init : function() {
      this.str = this.language.ru; // Set language of messages and buttons
      try {
        this.writeRule();
        this.listLife.init();   // Reset/init algorithm
        this.loadConfig();      // Load config from URL (autoplay, colors, zoom, ...)
        this.loadState();       // Load state from URL
        this.keepDOMElements(); // Keep DOM References (getElementsById)
        this.canvas.init();     // Init canvas GUI
        this.registerEvents();  // Register event handlers
    
        this.prepare();
      } catch (e) {
        this.helpers.error(this.str.error+e);
      }
    },
    
    
    /**
      * Set rules of birth and survival from the two strings
      */
    setRule : function(ss, bs) {
      var i, s = [], b = [], el;
      for (i = 0; i <= 8; i++) {
        el = document.getElementById('rus' + i);
        el.className = 'ruleoff';
        if (ss.indexOf('' + i) > -1) {
          s.push(i);
          el.className = 'ruleon';
        }
        if (i > 0) {
          el = document.getElementById('rub' + i);
          el.className = 'ruleoff';
          if(bs.indexOf('' + i) > -1) {
            b.push(i);
            el.className = 'ruleon';
          }
        }
      }
      this.rule.s = s;
      this.rule.b = b;
    },
    
    
    /**
      * Display the digits which represent the rules
      */
    writeRule : function() {
      var i, s;
      s = 'B';
      for (i = 1; i <= 8; i++) {
        s += '<span id="rub' + i + '" class = "ruleoff">' + i + '</span>';
      }
      s += '/S';
      for (i = 0; i <= 8; i++) {
        s += '<span id="rus' + i + '" class = "ruleoff">' + i + '</span>';
      }
      document.getElementById('rule').innerHTML = s;
    },


    /**
     * Load config from URL
     */
    loadConfig : function() {
      var colors, grid, zoom, rule;

      this.autoplay = this.helpers.getUrlParameter('autoplay') === '1' ? true : this.autoplay;
      this.trail.current = this.helpers.getUrlParameter('trail') === '1' ? true : this.trail.current;

      // Initial color config
      colors = parseInt(this.helpers.getUrlParameter('colors'), 10);
      if (isNaN(colors) || colors < 1 || colors > this.colors.schemes.length) {
        colors = 1;
      }

      // Initial grid config
      grid = parseInt(this.helpers.getUrlParameter('grid'), 10);
      if (isNaN(grid) || grid < 1 || grid > this.grid.schemes.length) {
        grid = 1;
      }

      // Initial zoom config
      zoom = parseInt(this.helpers.getUrlParameter('zoom'), 10);
      if (isNaN(zoom) || zoom < 1 || zoom > this.zoom.schemes.length) {
        zoom = 1;
      }
      
      // Initial rule
      rule = this.helpers.getUrlParameter('rule');
      if (rule !== undefined) {
        rule = rule.split(',', 2);
        if (rule.length < 2) {
          rule = ['23', '3']; // Conway's Life
        }
      } else {
        rule = ['23', '3'];
      }
      
      this.setRule(rule[0], rule[1]);

      this.colors.current = colors - 1;
      this.grid.current = grid - 1;
      this.zoom.current = zoom - 1;

      this.rows = this.zoom.schemes[this.zoom.current].rows;
      this.columns = this.zoom.schemes[this.zoom.current].columns;
    },


    /**
     * Load world state from URL parameter
     */
    loadState : function() {
      var state, s = this.helpers.getUrlParameter('s');

      if (s === 'random') {
        this.randomState();
      } else {
        if (s === undefined) {
          s = this.initialState;
        }

        state = JSON.parse(decodeURI(s));
          
        this.loadStateDirectly(state);
      }
    },


    /**
     * Load world state from a given object
     */
    loadStateDirectly : function(state) {
      var i, j, y;

      for (i = 0; i < state.length; i++) {
        for (y in state[i]) {
          for (j = 0; j < state[i][y].length; j++) {
            this.listLife.addCell(state[i][y][j], parseInt(y, 10), this.listLife.actualState);
          }
        }
      }
    },


    /**
     * Create a random pattern
     */
    randomState : function() {
      var i, liveCells = (this.rows * this.columns) * 0.12;
      
      for (i = 0; i < liveCells; i++) {
        this.listLife.addCell(this.helpers.random(0, this.columns - 1), this.helpers.random(0, this.rows - 1), this.listLife.actualState);
      }
    },


    /**
     * Clean up actual state and prepare a new run
     */
    cleanUp : function() {
      this.listLife.init(); // Reset/init algorithm
      this.prepare();
    },


    /**
     * Prepare DOM elements and Canvas for a new run
     */
    prepare : function() {
      this.generation = this.times.algorithm = this.times.gui = 0;
      this.mouseDown = this.clear.schedule = false;

      this.element.generation.innerHTML = '0';
      this.element.livecells.innerHTML = '.';
      this.element.steptime.innerHTML = '0 / 0 (0 / 0)';

      this.canvas.clearWorld(); // Reset GUI
      this.canvas.drawWorld(); // Draw State

      if (this.autoplay) { // Next Flow
        this.autoplay = false;
        this.handlers.buttons.run();
      }
    },


    /**
     * keepDOMElements
     * Save DOM references for this session (one time execution)
     */
    keepDOMElements : function() {
      this.element.generation = document.getElementById('generation');
      this.element.steptime = document.getElementById('steptime');
      this.element.livecells = document.getElementById('livecells');
      this.element.messages.layout = document.getElementById('layoutMessages');
    },
    
    
    /**
     *
     */
    mousePosition : function(e) {
      var cellSize = this.zoom.schemes[this.zoom.current].cellSize + 1,
      position = this.helpers.mousePosition(e);
      return [Math.ceil(position[0]/cellSize - 1),
              Math.ceil(position[1]/cellSize - 1)];
   },


    /**
     * registerEvents
     * Register event handlers for this session (one time execution)
     */
    registerEvents : function() {

      // Keyboard Events
      this.helpers.registerEvent(document.body, 'keyup', this.handlers.keyboard);

      // Controls
      this.helpers.registerEvent(document.getElementById('buttonRun'), 'click', this.handlers.buttons.run);
      this.helpers.registerEvent(document.getElementById('buttonStep'), 'click', this.handlers.buttons.step);
      this.helpers.registerEvent(document.getElementById('buttonClear'), 'click', this.handlers.buttons.clear);

      // Layout
      this.helpers.registerEvent(document.getElementById('buttonTrail'), 'click', this.handlers.buttons.trail);
      this.helpers.registerEvent(document.getElementById('buttonGrid'), 'click', this.handlers.buttons.grid);
      this.helpers.registerEvent(document.getElementById('buttonColors'), 'click', this.handlers.buttons.colors);

      // Save / Load
      this.helpers.registerEvent(document.getElementById('buttonLoad'), 'click', this.handlers.buttons.load);
      this.helpers.registerEvent(document.getElementById('buttonSavePlaintext'), 'click', this.handlers.buttons.savePlaintext);
      this.helpers.registerEvent(document.getElementById('buttonSaveRLE'), 'click', this.handlers.buttons.saveRLE);
      this.helpers.registerEvent(document.getElementById('buttonExport'), 'click', this.handlers.buttons.export_);
    },


    /**
     * Run Next Step
     */
    nextStep : function() {
      var i, x, y, r, liveCellNumber, algorithmTime, guiTime;

      // Algorithm run
    
      if (!this.torus && document.getElementById('torus').checked) {
          this.listLife.actualState = this.listLife.withoutOuterCells();
      }
      this.torus = document.getElementById('torus').checked;

      algorithmTime = (new Date());

      liveCellNumber = this.listLife.nextGeneration();

      algorithmTime = (new Date()) - algorithmTime;


      // Canvas run

      guiTime = (new Date());

      for (i = 0; i < this.listLife.redrawList.length; i++) {
        x = this.listLife.redrawList[i][0];
        y = this.listLife.redrawList[i][1];

        if (this.listLife.redrawList[i][2] === 1) {
          this.canvas.changeCelltoAlive(x, y);
        } else if (this.listLife.redrawList[i][2] === 2) {
          this.canvas.keepCellAlive(x, y);
        } else {
          this.canvas.changeCelltoDead(x, y);
        }
      }

      guiTime = (new Date()) - guiTime;

      // Pos-run updates

      // Clear Trail
      if (this.trail.schedule) {
        this.trail.schedule = false;
        this.canvas.drawWorld();
      }

      // Change Grid
      if (this.grid.schedule) {
        this.grid.schedule = false;
        this.canvas.drawWorld();
      }

      // Change Colors
      if (this.colors.schedule) {
        this.colors.schedule = false;
        this.canvas.drawWorld();
      }

      // Running Information
      this.generation++;
      this.element.generation.innerHTML = this.generation;
      this.element.livecells.innerHTML = liveCellNumber;

      r = 1.0/this.generation;
      this.times.algorithm = (this.times.algorithm * (1 - r)) + (algorithmTime * r);
      this.times.gui = (this.times.gui * (1 - r)) + (guiTime * r);
      this.element.steptime.innerHTML = algorithmTime + ' / ' + guiTime + ' (' + Math.round(this.times.algorithm) + ' / ' + Math.round(this.times.gui) + ')';

      // Flow Control
      if (this.running) {
        setTimeout(function() {
          GOL.nextStep();
        }, this.waitTime);
      } else {
        if (this.clear.schedule) {
          this.cleanUp();
        }
      }
    },


    /** ****************************************************************************************************************************
     * Event Handlers
     */
    handlers : {

      mouseDown : false,
      lastX : 0,
      lastY : 0,


      /**
       *
       */
      canvasMouseDown : function(event) {
        var position = GOL.mousePosition(event);
        GOL.canvas.switchCell(position[0], position[1]);
        GOL.handlers.lastX = position[0];
        GOL.handlers.lastY = position[1];
        GOL.handlers.mouseDown = true;
      },


      /**
       *
       */
      canvasMouseUp : function() {
        GOL.handlers.mouseDown = false;
      },


      /**
       *
       */
      canvasMouseMove : function(event) {
        if (GOL.handlers.mouseDown) {
          var position = GOL.mousePosition(event);
          if ((position[0] !== GOL.handlers.lastX) || (position[1] !== GOL.handlers.lastY)) {
            GOL.canvas.switchCell(position[0], position[1]);
            GOL.handlers.lastX = position[0];
            GOL.handlers.lastY = position[1];
          }
        }
      },


      /**
       *
       */
      keyboard : function(e) {
        var event = e;
        if (!event) {
          event = window.event;
        }
      
        if (!event.ctrlKey) {
          if (event.keyCode === 67) { // Key: C
            GOL.handlers.buttons.clear();
          } else if (event.keyCode === 82 ) { // Key: R
            GOL.handlers.buttons.run();
          } else if (event.keyCode === 83 ) { // Key: S
            GOL.handlers.buttons.step();
          }
        }
        
        if (event.ctrlKey && event.keyCode === 13) { // Ctrl + Enter
          GOL.handlers.buttons.load();
        }
      },


      buttons : {
      
        /**
         * Button Handler - Run
         */
        run : function() {
          GOL.running = !GOL.running;
          if (GOL.running) {
            GOL.nextStep();
            document.getElementById('buttonRun').value = GOL.str.stop;
            document.getElementById('torus').disabled = true;
            document.getElementById('buttonLoad').disabled = true;
            document.getElementById('buttonSavePlaintext').disabled = true;
            document.getElementById('buttonSaveRLE').disabled = true;
          } else {
            document.getElementById('buttonRun').value = GOL.str.run;
            document.getElementById('torus').disabled = false;
            document.getElementById('buttonLoad').disabled = false;
            document.getElementById('buttonSavePlaintext').disabled = false;
            document.getElementById('buttonSaveRLE').disabled = false;
          }
        },


        /**
         * Button Handler - Next Step - One Step only
         */
        step : function() {
          if (!GOL.running) {
            GOL.nextStep();
          }
        },


        /**
         * Button Handler - Clear World
         */
        clear : function() {
          if (GOL.running) {
            GOL.clear.schedule = true;
            GOL.running = false;
            document.getElementById('buttonRun').value = GOL.str.run;
          } else {
            GOL.cleanUp();
          }
        },


        /**
         * Button Handler - Remove/Add Trail
         */
        trail : function() {
          GOL.element.messages.layout.innerHTML = GOL.trail.current ? GOL.str.trailoff : GOL.str.trailon;
          GOL.trail.current = !GOL.trail.current;
          if (GOL.running) {
            GOL.trail.schedule = true;
          } else {
            GOL.canvas.drawWorld();
          }
        },


        /**
         *
         */
        colors : function() {
          GOL.colors.current = (GOL.colors.current + 1) % GOL.colors.schemes.length;
          GOL.element.messages.layout.innerHTML = GOL.str.colors + (GOL.colors.current + 1);
          if (GOL.running) {
            GOL.colors.schedule = true; // Delay redraw
          } else {
            GOL.canvas.drawWorld(); // Force complete redraw
          }
        },


        /**
         *
         */
        grid : function() {
          GOL.grid.current = (GOL.grid.current + 1) % GOL.grid.schemes.length;
          GOL.element.messages.layout.innerHTML = GOL.str.grids + (GOL.grid.current + 1);
          if (GOL.running) {
            GOL.grid.schedule = true; // Delay redraw
          } else {
            GOL.canvas.drawWorld(); // Force complete redraw
          }
        },


        /**
         * Button Handler - export state as a link
         */
        export_ : function() {
          var i, j, url = '', cellState = '', params = '';

          for (i = 0; i < GOL.listLife.actualState.length; i++) {
            cellState += '{"'+GOL.listLife.actualState[i][0]+'":[';
            for (j = 1; j < GOL.listLife.actualState[i].length; j++) {
              cellState += GOL.listLife.actualState[i][j]+',';
            }
            cellState = cellState.substring(0, cellState.length - 1) + ']},';
          }

          cellState = cellState.substring(0, cellState.length - 1);

          if (cellState.length !== 0) {
            url = (window.location.href.indexOf('?') === -1) ? window.location.href : window.location.href.slice(0, window.location.href.indexOf('?'));

            params = '?autoplay=0' +
            '&trail=' + (GOL.trail.current ? '1' : '0') +
            '&grid=' + (GOL.grid.current + 1) +
            '&colors=' + (GOL.colors.current + 1) +
            '&zoom=' + (GOL.zoom.current + 1) +
            '&rule=' + GOL.rule.s.join('') + ',' + GOL.rule.b.join('') +
            '&s=['+ cellState +']';

            document.getElementById('exportUrlLink').href = params;
            document.getElementById('exportUrl').style.display = 'inline';
          }
        },

        /**
         * Button Handler - load state from text format
         */
        load : function() {
          var text, i, j, hsize = 0, vsize, header, bhmsg, ph, block, n, tlx, tly, state, rule = null, lifeh = false;

          text = document.getElementById('textArea').value.split('\n');
          if (text.length === 0) {
            return;
          }
          state = [];

          if (text[0].trim().match(/^[!.O]./)) { // plaintext according to http://www.conwaylife.com/wiki/Plaintext
            while (text.length > 0 && (text[0].trim().length === 0 || text[0].trim()[0] === '!')) {
              if (text[0].trim().slice(0, 7) === '!Rule: ') {
                rule = text[0].trim().slice(7).split('/', 2);
                if (rule.length !== 2) {
                  rule = null;
                }
              }
              text.shift();
            }
            vsize = text.length;
            for (i = 0; i < vsize; i++) {
              text[i] = text[i].trim().toUpperCase();
              if (!text[i].match(/^[.O]*$/)) {
                GOL.helpers.error(GOL.str.error + GOL.str.unknown + text[i]);
                return;
              }
              if (text[i].length > hsize) {
                hsize = text[i].length;
              }
            }

            tlx = Math.floor((GOL.columns - hsize) / 2);
            tly = Math.floor((GOL.rows - vsize) / 2);
            for (j = 0; j < vsize; j++) {
              for (i = 0; i < text[j].length; i++) {
                if (text[j][i] === 'O') {
                  GOL.listLife.addCell(tlx + i, tly + j, state);
                }
              }
            }

          } else { // RLE almost according to http://www.conwaylife.com/wiki/RLE (ignoring instructions about rules and so on)

            while (text.length > 0 && (text[0].trim().length === 0 || text[0].trim()[0] === '#')) {
              text.shift();
            }
            if (text.length === 0) {
              return;
            }

            header = text[0].split(',');
            bhmsg = GOL.str.error + GOL.str.badhead + text[0];
            if (header.length < 2) {
              GOL.helpers.error(bhmsg);
              return;
            }
            ph = header[0].split('=');
            if (ph.length !== 2 || ph[0].trim() !== 'x') {
              GOL.helpers.error(bhmsg);
              return;
            }
            hsize = parseInt(ph[1]);
            if (isNaN(hsize)) {
              GOL.helpers.error(bhmsg);
              return;
            }
            ph = header[1].split('=');
            if (ph.length !== 2 || ph[0].trim() !== 'y') {
              GOL.helpers.error(bhmsg);
              return;
            }
            vsize = parseInt(ph[1]);
            if (isNaN(vsize)) {
              GOL.helpers.error(bhmsg);
              return;
            }
            if (header.length >= 3) {
              ph = header[2].split('=');
              if (ph.length !== 2 || ph[0].trim() !== 'rule') {
                GOL.helpers.error(bhmsg);
                return;
              }
              rule = ph[1].trim().split('/', 2);
              if (rule.length === 1) {
                if (rule[0] === 'LifeHistory' || rule[0] === 'HistoricalLife') {
                  lifeh = true;
                }
                rule = null;
              } else {
                if (rule[0].length > 0 && (rule[0][0] === 'B' || rule[0][0] === 'b') && rule[1].length > 0 && (rule[1][0] === 'S' || rule[1][0] === 's')) {
                  rule = [rule[1].slice(1), rule[0].slice(1)];
                } else if (rule[0].length > 0 && (rule[0][0] === 'S' || rule[0][0] === 's') && rule[1].length > 0 && (rule[1][0] === 'B' || rule[1][0] === 'b')) {
                  rule = [rule[0].slice(1), rule[1].slice(1)];
                }
                if (!rule[0].match(/^[0-8]*$/) || !rule[1].match(/^[1-8]*$/)) {
                  GOL.helpers.error(bhmsg);
                  return;
                }
              }
            }
            text.shift();

            text = text.join('').split('!', 1)[0].replace(/\s/g, '') + '$';
            if (lifeh) {
              text = text.replace(/[.BDF]/g, 'b');
            }
            text = text.replace(/[^$0-9b]/g, 'o');

            tlx = Math.floor((GOL.columns - hsize) / 2);
            tly = Math.floor((GOL.rows - vsize) / 2);
            j = 0;
            i = 0;
            while (text !== '') {
              block = text.match(/^\d*[ob$]/)[0];
              text = text.slice(block.length);
              if (block.length === 1) {
                n = 1;
              } else {
                n = parseInt(block.slice(0, -1));
                block = block.slice(-1);
              }
              if (block === '$') {
                if (i > hsize) {
                  GOL.helpers.warning(GOL.str.warning + GOL.str.atline + (j+1) + GOL.str.ncols + '(' + i + ')' + GOL.str.toomany + '(' + hsize + ')');
                }
                j += n;
                i = 0;
              } else if (block === 'b') {
                i += n;
              } else if (block === 'o') {
                while (n > 0) {
                  GOL.listLife.addCell(tlx + i, tly + j, state);
                  i++;
                  n--;
                }
              }
            }
            if (j !== vsize) {
              GOL.helpers.warning(GOL.str.warning + GOL.str.nlines + '(' + j + ')' + GOL.str.notmatch + '(' + vsize + ')');
            }
          }

          GOL.cleanUp();
          GOL.listLife.actualState = state;
          if (rule) {
            GOL.setRule(rule[0], rule[1]);
          } else {
            GOL.setRule('23', '3');
          }
          GOL.canvas.drawWorld();
        },

        /**
         * Button Handler - save state in plaintext format (visible part only)
         */
        savePlaintext : function() {
          var state, minx, i, j, x, text, rule;

          state = GOL.listLife.withoutOuterCells();

          if (state.length === 0) {
            return;
          }

          minx = state[0][1];
          for (j = 1; j < state.length; j++) {
            if (state[j][1] < minx) {
              minx = state[j][1];
            }
          }
          
          rule = GOL.rule;

          text = '';

          if (rule.s.length !== 2 || rule.s[0] !== 2 || rule.s[1] !== 3 || rule.b.length !== 1 || rule.b[0] !== 3) {
            text += '!Rule: ' + rule.s.join('') + '/' + rule.b.join('') + '\n';
          }

          for (j = 0; j < state.length; j++) {
            if (j > 0) {
              text += new Array(state[j][0] - state[j-1][0] + 1).join('\n');
            }
            x = minx - 1;
            for (i = 1; i < state[j].length; i++) {
              text += (new Array(state[j][i] - x).join('.')) + 'O';
              x = state[j][i];
            }
          }

          document.getElementById('textArea').value = text;
        },

        /**
         * Button Handler - save state in RLE format
         */
        saveRLE : function() {
          var state, minx, maxx, i, j, x, header, text, block, no, lim = 69;

          state = GOL.listLife.actualState;

          if (state.length === 0) {
            return;
          }

          minx = state[0][1];
          maxx = state[0][state[0].length - 1];
          for (j = 1; j < state.length; j++) {
            if (state[j][1] < minx) {
              minx = state[j][1];
            }
            if (state[j][state[j].length - 1] > maxx) {
              maxx = state[j][state[j].length - 1];
            }
          }

          text = '';
          for (j = 0; j < state.length; j++) {
            if (j > 0) {
              no = state[j][0] - state[j - 1][0];
              block = '';
              if (no !== 1) {
                block += no;
              }
              block += '$';
              if (text.length + block.length - text.lastIndexOf('\n') > lim) {
                text += '\n';
              }
              text += block;
            }
            x = minx - 1;
            no = 0;
            for (i = 1; i < state[j].length; i++) {
              if (state[j][i] - x > 1) {
                if (no > 0) {
                  block = '';
                  if (no !== 1) {
                    block += no;
                  }
                  block += 'o';
                  if (text.length + block.length - text.lastIndexOf('\n') > lim) {
                    text += '\n';
                  }
                  text += block;
                }
                block = '';
                if (state[j][i] - x - 1 !== 1) {
                  block = block + (state[j][i] - x - 1);
                }
                block += 'b';
                if (text.length + block.length - text.lastIndexOf('\n') > lim) {
                  text += '\n';
                }
                text += block;
                no = 1;
              } else {
                no += 1;
              }
              x = state[j][i];
            }
            block = '';
            if (no !== 1) {
              block += no;
            }
            block += 'o';
            if (text.length + block.length - text.lastIndexOf('\n') > lim) {
              text += '\n';
            }
            text += block;
          }
          text += '!';

          header = 'x = ' + (maxx - minx + 1) + ', y = ' + (state[state.length - 1][0] - state[0][0] + 1);
          header += ', rule = B' + GOL.rule.b.join('') + '/S' + GOL.rule.s.join('');

          document.getElementById('textArea').value = header + '\n' + text;
        }

      }
    
    },


    /** ****************************************************************************************************************************
     *
     */
    canvas : {

      context : null,
      width : null,
      height : null,
      age : null,
      cellSize : null,
      cellSpace : null,


      /**
       * init
       */
      init : function() {

        this.canvas = document.getElementById('canvas');
        this.context = this.canvas.getContext('2d');

        this.cellSize = GOL.zoom.schemes[GOL.zoom.current].cellSize;
        this.cellSpace = 1;

        GOL.helpers.registerEvent(this.canvas, 'mousedown', GOL.handlers.canvasMouseDown, false);
        GOL.helpers.registerEvent(document, 'mouseup', GOL.handlers.canvasMouseUp, false);
        GOL.helpers.registerEvent(this.canvas, 'mousemove', GOL.handlers.canvasMouseMove, false);

        this.clearWorld();
      },


      /**
       * clearWorld
       */
      clearWorld : function () {
        var i, j;

        // Init ages (Canvas reference)
        this.age = [];
        for (i = 0; i < GOL.columns; i++) {
          this.age[i] = [];
          for (j = 0; j < GOL.rows; j++) {
            this.age[i][j] = 0; // Dead
          }
        }
      },


      /**
       * drawWorld
       */
      drawWorld : function() {
        var i, j;

        // Special no grid case
        if (GOL.grid.schemes[GOL.grid.current].color === '') {
          this.setNoGridOn();
          this.width = this.height = 0;
        } else {
          this.setNoGridOff();
          this.width = this.height = 1;
        }

        // Dynamic canvas size
        this.width = this.width + (this.cellSpace * GOL.columns) + (this.cellSize * GOL.columns);
        this.canvas.setAttribute('width', this.width);

        this.height = this.height + (this.cellSpace * GOL.rows) + (this.cellSize * GOL.rows);
        this.canvas.setAttribute('height', this.height);

        // Fill background
        this.context.fillStyle = GOL.grid.schemes[GOL.grid.current].color;
        this.context.fillRect(0, 0, this.width, this.height);

        for (i = 0; i < GOL.columns; i++) {
          for (j = 0; j < GOL.rows; j++) {
            if (GOL.listLife.isAlive(i, j)) {
              this.drawCell(i, j, true);
            } else {
              this.drawCell(i, j, false);
            }
          }
        }
      },


      /**
       * setNoGridOn
       */
      setNoGridOn : function() {
        this.cellSize = GOL.zoom.schemes[GOL.zoom.current].cellSize + 1;
        this.cellSpace = 0;
      },


      /**
       * setNoGridOff
       */
      setNoGridOff : function() {
        this.cellSize = GOL.zoom.schemes[GOL.zoom.current].cellSize;
        this.cellSpace = 1;
      },


      /**
       * drawCell
       */
      drawCell : function (i, j, alive) {
                
        if (alive) {

          if (this.age[i][j] > -1) {
            this.context.fillStyle = GOL.colors.schemes[GOL.colors.current].alive[this.age[i][j] % GOL.colors.schemes[GOL.colors.current].alive.length];
          }

        } else {
          if (GOL.trail.current && this.age[i][j] < 0) {
            this.context.fillStyle = GOL.colors.schemes[GOL.colors.current].trail[(this.age[i][j] * -1) % GOL.colors.schemes[GOL.colors.current].trail.length];
          } else {
            this.context.fillStyle = GOL.colors.schemes[GOL.colors.current].dead;
          }
        }

        this.context.fillRect(this.cellSpace + (this.cellSpace * i) + (this.cellSize * i), this.cellSpace + (this.cellSpace * j) + (this.cellSize * j), this.cellSize, this.cellSize);
                
      },


      /**
       * switchCell
       */
      switchCell : function(i, j) {
        if (GOL.listLife.isAlive(i, j)) {
          this.changeCelltoDead(i, j);
          GOL.listLife.removeCell(i, j, GOL.listLife.actualState);
        } else {
          this.changeCelltoAlive(i, j);
          GOL.listLife.addCell(i, j, GOL.listLife.actualState);
        }
      },


      /**
       * keepCellAlive
       */
      keepCellAlive : function(i, j) {
        if (i >= 0 && i < GOL.columns && j >=0 && j < GOL.rows) {
          this.age[i][j]++;
          this.drawCell(i, j, true);
        }
      },


      /**
       * changeCelltoAlive
       */
      changeCelltoAlive : function(i, j) {
        if (i >= 0 && i < GOL.columns && j >=0 && j < GOL.rows) {
          this.age[i][j] = 1;
          this.drawCell(i, j, true);
        }
      },


      /**
       * changeCelltoDead
       */
      changeCelltoDead : function(i, j) {
        if (i >= 0 && i < GOL.columns && j >=0 && j < GOL.rows) {
          this.age[i][j] = -this.age[i][j]; // Keep trail
          this.drawCell(i, j, false);
        }
      }

    },


    /** ****************************************************************************************************************************
     *
     */
    listLife : {

      actualState : [],
      redrawList : [],


      /**
       *
       */
      init : function () {
        this.actualState = [];
      },


      nextGeneration : function() {
        var x, y, xp1, xm1, yp1, ym1,
        i, j, m, key, t1, t2, alive = 0,
        neighbours, deadNeighbours, allDeadNeighbours = {}, newState = [];
        this.redrawList = [];

        for (i = 0; i < this.actualState.length; i++) {
          this.topPointer = 1;
          this.bottomPointer = 1;
                    
          for (j = 1; j < this.actualState[i].length; j++) {
            x = this.actualState[i][j];
            y = this.actualState[i][0];
            xp1 = x + 1;
            xm1 = x - 1;
            yp1 = y + 1;
            ym1 = y - 1;
            if (GOL.torus)
            {
              xp1 = (xp1 + GOL.columns) % GOL.columns;
              xm1 = (xm1 + GOL.columns) % GOL.columns;
              yp1 = (yp1 + GOL.rows) % GOL.rows;
              ym1 = (ym1 + GOL.rows) % GOL.rows;
            }

            // Possible dead neighbours
            deadNeighbours = [[xm1, ym1, 1], [x, ym1, 1], [xp1, ym1, 1], [xm1, y, 1], [xp1, y, 1], [xm1, yp1, 1], [x, yp1, 1], [xp1, yp1, 1]];

            // Get number of live neighbours and remove alive neighbours from deadNeighbours
            neighbours = this.getNeighboursFromAlive(x, y, i, deadNeighbours);

            // Join dead neighbours to check list
            for (m = 0; m < 8; m++) {
              if (deadNeighbours[m] !== undefined) {
                key = deadNeighbours[m][0] + ',' + deadNeighbours[m][1]; // Create hashtable key
                
                if (allDeadNeighbours[key] === undefined) {
                  allDeadNeighbours[key] = 1;
                } else {
                  allDeadNeighbours[key]++;
                }
              }
            }

            if (GOL.rule.s.indexOf(neighbours) > -1) {
              this.addCell(x, y, newState);
              alive++;
              this.redrawList.push([x, y, 2]); // Keep alive
            } else {
              this.redrawList.push([x, y, 0]); // Kill cell
            }
          }
        }

        // Process dead neighbours
        for (key in allDeadNeighbours) {
          if (GOL.rule.b.indexOf(allDeadNeighbours[key]) > -1) { // Add new Cell
            key = key.split(',');
            t1 = parseInt(key[0], 10);
            t2 = parseInt(key[1], 10);

            this.addCell(t1, t2, newState);
            alive++;
            this.redrawList.push([t1, t2, 1]);
          }
        }

        this.actualState = newState;

        return alive;
      },


      topPointer : 1,
      middlePointer : 1,
      bottomPointer : 1,

      getNeighboursFromAlive : function (x, y, i, possibleNeighboursList) {
        var neighbours = 0, k, xp1, yp1, xm1, ym1, pn;
        if (GOL.torus) {
          for (pn = 0; pn < 8; pn++) {
            if (this.isAlive(possibleNeighboursList[pn][0], possibleNeighboursList[pn][1])) {
              possibleNeighboursList[pn] = undefined;
              neighbours++;
            }
          }
        } else {
        // Top
          if (this.actualState[i-1] !== undefined) {
            if (this.actualState[i-1][0] === (y - 1)) {
              for (k = this.topPointer; k < this.actualState[i-1].length; k++) {


                if (this.actualState[i-1][k] >= (x-1) ) {


                  if (this.actualState[i-1][k] === (x - 1)) {
                    possibleNeighboursList[0] = undefined;
                    this.topPointer = k + 1;
                    neighbours++;
                  }


                  if (this.actualState[i-1][k] === x) {
                    possibleNeighboursList[1] = undefined;
                    this.topPointer = k;
                    neighbours++;
                  }


                  if (this.actualState[i-1][k] === (x + 1)) {
                    possibleNeighboursList[2] = undefined;


                    if (k === 1) {
                      this.topPointer = 1;
                    } else {
                      this.topPointer = k - 1;
                    }
                                      
                    neighbours++;
                  }


                  if (this.actualState[i-1][k] > (x + 1)) {
                    break;
                  }
                }
              }
            }
          }
          
          // Middle
          for (k = 1; k < this.actualState[i].length; k++) {
            if (this.actualState[i][k] >= (x - 1)) {


              if (this.actualState[i][k] === (x - 1)) {
                possibleNeighboursList[3] = undefined;
                neighbours++;
              }


              if (this.actualState[i][k] === (x + 1)) {
                possibleNeighboursList[4] = undefined;
                neighbours++;
              }


              if (this.actualState[i][k] > (x + 1)) {
                break;
              }
            }
          }


          // Bottom
          if (this.actualState[i+1] !== undefined) {
            if (this.actualState[i+1][0] === (y + 1)) {
              for (k = this.bottomPointer; k < this.actualState[i+1].length; k++) {
                if (this.actualState[i+1][k] >= (x - 1)) {


                  if (this.actualState[i+1][k] === (x - 1)) {
                    possibleNeighboursList[5] = undefined;
                    this.bottomPointer = k + 1;
                    neighbours++;
                  }


                  if (this.actualState[i+1][k] === x) {
                    possibleNeighboursList[6] = undefined;
                    this.bottomPointer = k;
                    neighbours++;
                  }


                  if (this.actualState[i+1][k] === (x + 1)) {
                    possibleNeighboursList[7] = undefined;
                                      
                    if (k === 1) {
                      this.bottomPointer = 1;
                    } else {
                      this.bottomPointer = k - 1;
                    }


                    neighbours++;
                  }


                  if (this.actualState[i+1][k] > (x + 1)) {
                    break;
                  }
                }
              }
            }
          }
        }
        return neighbours;
      },


      /**
       *
       */
      isAlive : function(x, y) {
        var i, j;
      
        for (i = 0; i < this.actualState.length; i++) {
          if (this.actualState[i][0] === y) {
            for (j = 1; j < this.actualState[i].length; j++) {
              if (this.actualState[i][j] === x) {
                return true;
              }
            }
          }
        }
        return false;
      },


      /**
       *
       */
      removeCell : function(x, y, state) {
        var i, j;
      
        for (i = 0; i < state.length; i++) {
          if (state[i][0] === y) {

            if (state[i].length === 2) { // Remove all Row
              state.splice(i, 1);
            } else { // Remove Element
              for (j = 1; j < state[i].length; j++) {
                if (state[i][j] === x) {
                  state[i].splice(j, 1);
                }
              }
            }
          }
        }
      },


      /**
       *
       */
      withoutOuterCells : function() {
        var i, j, x, y, oldState = this.actualState, newState;
        newState = [];
        for (i = 0; i < oldState.length; i++) {
          y = oldState[i][0];
          if (y >= 0 && y < GOL.rows) {
            for (j = 1; j < oldState[i].length; j++) {
              x = oldState[i][j];
              if (x >= 0 && x < GOL.columns) {
                this.addCell(x, y, newState);
              }
            }
          }
        }
        return newState;
      },


      /**
       *
       */
      addCell : function(x, y, state) {
        if (state.length === 0) {
          state.push([y, x]);
          return;
        }

        var k, n, m, tempRow, newState = [], added;

        if (y < state[0][0]) { // Add to Head
          newState = [[y,x]];
          for (k = 0; k < state.length; k++) {
            newState[k+1] = state[k];
          }

          for (k = 0; k < newState.length; k++) {
            state[k] = newState[k];
          }

        } else if (y > state[state.length - 1][0]) { // Add to Tail
          state[state.length] = [y, x];

        } else { // Add to Middle

          for (n = 0; n < state.length; n++) {
            if (state[n][0] === y) { // Level Exists
              tempRow = [];
              added = false;
              for (m = 1; m < state[n].length; m++) {
                if ((!added) && (x <= state[n][m])) {
                  if (x !== state[n][m]) {
                    tempRow.push(x);
                  }
                  added = true;
                }
                tempRow.push(state[n][m]);
              }
              tempRow.unshift(y);
              if (!added) {
                tempRow.push(x);
              }
              state[n] = tempRow;
              return;
            }

            if (y < state[n][0]) { // Create Level
              newState = [];
              for (k = 0; k < state.length; k++) {
                if (k === n) {
                  newState[k] = [y,x];
                  newState[k+1] = state[k];
                } else if (k < n) {
                  newState[k] = state[k];
                } else if (k > n) {
                  newState[k+1] = state[k];
                }
              }

              for (k = 0; k < newState.length; k++) {
                state[k] = newState[k];
              }

              return;
            }
          }
        }
      }

    },


    /** ****************************************************************************************************************************
     *
     */
    helpers : {
      urlParameters : null, // Cache


      /**
       * Get URL Parameters
       */
      getUrlParameter : function(name) {
        if (this.urlParameters === null) { // Cache miss
          var hash, hashes, i;
        
          this.urlParameters = [];
          hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');

          for (i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            this.urlParameters.push(hash[0]);
            this.urlParameters[hash[0]] = hash[1];
          }
        }

        return this.urlParameters[name];
      },


      /**
       * Return a random integer from [min, max]
       */
      random : function(min, max) {
        return min <= max ? min + Math.round(Math.random() * (max - min)) : null;
      },
      
      
      /**
       *
       */
      warning : function(s) {
        this.error(s);
      },


      /**
       *
       */
      error : function(s) {
        if (s.length > 500) {
          s = s.slice(0, 480) + '...';
        }
        alert(s);
      },


      /**
       * Register Event
       */
      registerEvent : function (element, event, handler, capture) {
        // simple cross-browser event adding
        capture = (capture !== undefined ? capture : false);
        if (element.addEventListener) {
          element.addEventListener(event, handler, capture);
        } else if (element.attachEvent) {
          element.attachEvent('on' + event, handler);
        } else {
          element['on' + event] = handler;
        }
      },


      /**
       *
       */
      mousePosition : function (e) {
        // http://learn.javascript.ru/coordinates
        // http://www.quirksmode.org/js/events_properties.html#position
        var event, domObject, posx = 0, posy = 0, top, left, box;

        event = e;
        if (!event) {
          event = window.event;
        }
      
        if (event.pageX || event.pageY) {
          posx = event.pageX;
          posy = event.pageY;
        } else if (event.clientX || event.clientY) {
          posx = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
          posy = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        }

        domObject = event.target || event.srcElement;

        box = domObject.getBoundingClientRect();

        top = box.top + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop)
        - (document.documentElement.clientTop || document.body.clientTop || 0);
        left= box.left+ (window.pageXOffset || document.documentElement.scrollLeft|| document.body.scrollLeft)
        - (document.documentElement.clientLeft|| document.body.clientLeft|| 0);

        return [posx - left, posy - top];
      }
    }

  };


  /**
   * Init on 'load' event
   */
  GOL.helpers.registerEvent(window, 'load', function () {
    GOL.init();
  }, false);


  GOLloadState = function(s) {
    GOL.cleanUp();
    GOL.loadStateDirectly(s);
    GOL.prepare();
  };

  GOLrandom = function() {
    GOL.cleanUp();
    GOL.randomState();
    GOL.prepare();
  };

}());
