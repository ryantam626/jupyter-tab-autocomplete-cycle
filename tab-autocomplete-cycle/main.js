define([
    'base/js/keyboard',
    'notebook/js/completer',
    'notebook/js/codecell',
], function(
    keyboard,
    completer,
    codecell
) {
    "use strict";

    var mod_name = 'Tab-Autocomplete-Cycle';
    var log_prefix = '[' + mod_name + ']';

    var CodeCell = codecell.CodeCell;
    var Completer = completer.Completer

    function patch_Completer_keydown () {
        console.log(log_prefix, 'patching Completer.prototype.keydown');
        var old_keydown = Completer.prototype.keydown;

        Completer.prototype.keydown = function (event) {
            if (event.keyCode == keyboard.keycodes.tab) {
                var options;
                var index;
                event.codemirrorIgnore = true;
                event._ipkmIgnore = true;
                event.preventDefault();

                options = this.sel.find('option');
                index = this.sel[0].selectedIndex;

                if (event.shiftKey) {
                    index--;
                } else {
                    index++;
                }

                if (index < 0) {
                    index = options.length - 1;
                } else if (index > options.length - 1) {
                    index = 0
                }
                this.sel[0].selectedIndex = index;
            } else {
                old_keydown.apply(this, arguments);
            }
        }
    }

    function patch_CodeCell_handle_codemirror_keyevent () {
        console.log(log_prefix, 'patching CodeCell.prototype.handle_codemirror_keyevent');
        var old_handle_codemirror_keyevent = CodeCell.prototype.handle_codemirror_keyevent;

        CodeCell.prototype.handle_codemirror_keyevent = function (editor, event) {
            var cur = editor.getCursor();
             if (event.keyCode === keyboard.keycodes.tab && event.type === 'keydown') {
                if (event.shiftKey) {
                    // Do nothing if completer is working. Show tooltip if it's not
                    if (this.completer.done) {
                        return old_handle_codemirror_keyevent.apply(this, arguments);
                    } else{
                        return true;
                    }
                } else {
                    // Tab completion.
                    this.tooltip.remove_and_cancel_tooltip(true);

                    // completion does not work on multicursor, it might be possible though in some cases
                    if (editor.somethingSelected() || editor.getSelections().length > 1) {
                        return false;
                    }
                    var pre_cursor = editor.getRange({line:cur.line,ch:0},cur);
                    if (pre_cursor.trim() === "") {
                        // Don't autocomplete if the part of the line before the cursor
                        // is empty.  In this case, let CodeMirror handle indentation.
                        return false;
                    } else {
                        event.codemirrorIgnore = true;
                        event.preventDefault();
                        // Only start completer if it's not already started
                        if (this.completer.done) {
                            this.completer.startCompletion();
                        }
                        return true;
                    }
                }
            }
            // If it's not handled, let the original handler handle it
            return old_handle_codemirror_keyevent.apply(this, arguments);
        }
    }

    var load_ipython_extension = function() {
        patch_Completer_keydown();
        patch_CodeCell_handle_codemirror_keyevent();
        return true;
    };

    return {
        load_ipython_extension : load_ipython_extension
    };
});
