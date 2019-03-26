var SliderTop = (function () {

    var sliderTopElems = new DynElemCont();

    return {
        Init: function(loggedIn) {
            if(loggedIn) {

                //*======================== MOD CHAT WINDOW ========================*/

                ElemDyns.MakeTransitional(sliderTopElems, 'TopSlider', function(event, animPosAtEnd) {
                    
                });
            }
        },
        SlideToggle: function() {
            sliderTopElems.hash['TopSlider'].AnimationToggle();
        },
        TreeShowing: function(isShowing) {
            if(User.loggedIn) {
                if(!isShowing)
                    sliderTopElems.hash['TopSlider'].AnimateNeg();
            }
        },
        TreeUpdate: function() {
            
        },
        CheckSlidePanelClosed: function(clickedElem) {
            if(User.loggedIn) {
                if(Utility.html.CheckClass(clickedElem, 'sliderTopException'))
                    return;
                if(!sliderTopElems.hash['TopSlider'].elem.contains(clickedElem))
                    sliderTopElems.hash['TopSlider'].AnimateNeg();
            }
        }
    };
})();