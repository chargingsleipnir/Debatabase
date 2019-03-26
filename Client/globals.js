// GLOBALS

// As this is the first file loaded///
"use strict"

var stateTypes = {
    page: 0,
    tree: 1,
};

var pageStates = {
    LANDING: 0,
    TREE: 1,
    SEARCH: 2,
    ACTIVITY: 3,
    CONNS: 4,
    PROFILE: 5,
    SETTINGS: 6
}

var TREE_TRANS_INCR = 0.05;

var CursorTypes = { none: "none", normal: "auto", crosshair: "crosshair", hand: 'pointer' };
var KeyMap = {
    Backspace: 8, Tab: 9, Enter: 13, Shift: 16, Ctrl: 17, Alt: 18, CapsLock: 20, Esc: 27,
    SpaceBar: 32, PgUp: 33, PgDown: 34, End: 35, Home: 36,
    ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
    Insert: 45, Delete: 46,
    Num0: 48, Num1: 49, Num2: 50, Num3: 51, Num4: 52, Num5: 53, Num6: 54, Num7: 55, Num8: 56, Num9: 57,
    A: 65, B: 66, C: 67, D: 68, E: 69, F: 70, G: 71, H: 72, I: 73,
    J: 74, K: 75, L: 76, M: 77, N: 78, O: 79, P: 80, Q: 81, R: 82,
    S: 83, T: 84, U: 85, V: 86, W: 87, X: 88, Y: 89, Z: 90,
    F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123,
    SemiColon: 59, EqualSign: 61, MinusSign: 173, Comma: 188, Dash: 189, Period: 190, SlashForward: 191, Tilda: 192,
    BracketOpen: 219, SlashBack: 220, BracketClose: 221, QuoteSingle: 222
};