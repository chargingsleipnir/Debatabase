(function(exports){

    exports.treeTypes = { CTRL: 0, OPEN: 1, ARCH: 2 };
    exports.searchTypes = { TEXT: 0, TAG: 1, USER: 2 };
    exports.inviteResps = { REJECT: 0, NONE: 1, ACCEPT: 2 };

    //* This order is actually fairly specific - don't mess with it.
    exports.argTypes = { CORROB: 0, REFUTE: 1, EXT_CONTRIB: 2 };
    exports.argNames = [ 'corroboration', 'refutation', 'external contributor' ];

    exports.permTypes = { NONE: 5, ADMIN: 4, MOD: 3, GUEST: 2, LOGGEDIN: 1, ANYONE: 0 }

    exports.treeRemoveTypes = { ARCHIVE: 0, DELETE: 1 };

    exports.REC_TREE_VIS_QTY = 5;
    exports.LOGIN_GET_DATA_CHECKS = 5;
    exports.LOGIN_GET_HTML_CHECKS = 9;
    exports.SUBM_BATCH_SIZE = 25;
    exports.TIMELINE_BATCH_SIZE = 25;
    exports.SEARCH_BATCH_SIZE = 25;
    exports.SLICE_SIZE = 100000;
    exports.IMG_LOAD_MAX = 100;
    exports.SALT_ROUNDS = 10;

})(typeof exports === 'undefined' ? this['Consts'] = {} : exports);