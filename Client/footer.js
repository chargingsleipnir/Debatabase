var Footer = (function () {

    var footContElem;

    return {
        Init: function() {
            footContElem = document.getElementById('FooterContCont');

            document.getElementById('HideFooterBtn').addEventListener('click', function(event) {
                if(Utility.html.CheckClass(footContElem, 'hiddenTrue'))
                    Utility.html.ChangeClass(footContElem, 'hiddenTrue', 'hiddenFalse');
                else
                    Utility.html.ChangeClass(footContElem, 'hiddenFalse', 'hiddenTrue');
            });

            document.getElementById('ContactAdminBtn').addEventListener('click', OverlapCont.SetContactWindow);
            document.getElementById('BetaInfoBtn').addEventListener('click', OverlapCont.SetBetaInfoWindow);
        }
    };
})();