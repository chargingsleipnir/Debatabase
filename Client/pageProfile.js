var ProfilePg = (function () {

    var avatarElemViewed;
    var avatarElemDB;

    var progElem;

    var bioObj = {};

    var avatarFile = null;

    var URL = window.URL || window.webkitURL;
    var fileReader;

    var extArr = ['jpg', 'jpeg', 'png', 'gif'];
    var ext;

    return {
        Init: function() {
            // Avatar ========================

            avatarElemViewed = document.getElementById('AvatarImgViewed');
            avatarElemDB = document.getElementById('AvatarImgDB');
            progElem = document.getElementById('AvatarUploadProg');

            // Get current avatar
            Main.GetImgSrc(User.accountData._id, avatarElemDB);

            document.AvatarForm.FileBrowseStandIn.addEventListener('click', function() {
                document.AvatarForm.FileBrowse.click();
            })
            document.AvatarForm.FileBrowse.addEventListener('change', function(event) {
                if(progElem.value == Consts.IMG_LOAD_MAX || progElem.value == 0) {
                    if(event.target.files.length == 1) {

                        progElem.value = 0;
                        var fname = event.target.value;

                        // Check for accepted image file
                        ext = fname.slice((fname.lastIndexOf(".") - 1 >>> 0) + 2);
                        if(extArr.indexOf(ext) == -1) {
                            PageHdlr.DisplayMsg('Image must have extension: jpg, png, or gif', 2);
                            return;
                        }

                        // TODO: Restrict by file size?

                        // Display browsed file text
                        document.AvatarForm.PathReplica.value = fname.split('fakepath\\').pop();
                        avatarFile = event.target.files[0];
                        //console.log(avatarFile);
                        
                        // Display img before upload
                        var img = new Image();
                        img.onload = function () {
                            //console.log("img width: " + this.width + ", height: " + this.height);
                        };
                        img.src = URL.createObjectURL(avatarFile);
                        avatarElemViewed.src = img.src;  
                        
                        // V+ Cropping
                    }
                    else if(event.target.files.length > 1)
                        PageHdlr.DisplayMsg('Only 1 image can be used', 2);
                }
            });
            if(!User.IsGuestAccount()) {
                document.AvatarForm.Upload.addEventListener('click', function() {
                    if(progElem.value == Consts.IMG_LOAD_MAX || progElem.value == 0) {
                        if(avatarFile) {
                            var slice = avatarFile.slice(0, Consts.SLICE_SIZE);

                            Main.Pause(true);

                            fileReader = new FileReader();
                            fileReader.readAsArrayBuffer(slice);
                            fileReader.onload = (evt) => {
                                var arrayBuffer = fileReader.result; 
                                Network.Emit('AvatarSliceUpload', {
                                    ext: ext,
                                    name: User.accountData._id, 
                                    type: avatarFile.type, 
                                    size: avatarFile.size, 
                                    data: arrayBuffer 
                                });
                            }
                        }
                    }
                });
                Network.CreateResponse('AvatarReqSlice', function(resObj) {
                    var place = resObj.currentSlice * Consts.SLICE_SIZE,
                    slice = avatarFile.slice(place, place + Math.min(Consts.SLICE_SIZE, avatarFile.size - place)); 

                    progElem.value = (place / avatarFile.size) * Consts.IMG_LOAD_MAX;

                    fileReader.readAsArrayBuffer(slice);
                });
                Network.CreateResponse('AvatarUploadError', function(resObj) {
                    PageHdlr.DisplayMsg('Could not upload image', 2);
                    avatarFile = null;
                    progElem.value = 0;
                });
                Network.CreateResponse('AvatarUploadEnd', function(resObj) {
                    fileReader.onload = (evt) => {
                        PageHdlr.DisplayMsg('Image upload successful', 2);
                        avatarElemDB.src = fileReader.result;
                        avatarFile = null;
                        progElem.value = Consts.IMG_LOAD_MAX;
                        Main.UnPause();
                    };
                    fileReader.readAsDataURL(avatarFile);
                });

                // Bio ========================
                document.BioForm.BioSaveBtn.addEventListener('click', function() {
                    bioObj = {
                        firstName: document.BioForm.FirstNameField.value,
                        lastName: document.BioForm.LastNameField.value,
                        profDesig: document.BioForm.ProfDesigField.value,
                        desc: document.BioForm.DescriptionField.value
                    };
                    Network.Emit('UpdateBio', { accountID: User.accountData._id, bioObj: bioObj });
                });
                Network.CreateResponse('UpdateBioResponse', function() {
                    User.accountData.bio = bioObj;
                    PageHdlr.DisplayMsg('Bio updated', 3);
                }); 
            } 
        }
    }
})();