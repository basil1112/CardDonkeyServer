var io;

// devices which are currently connected to the server
var devices = {};
var numUsers = 0;

var tool = require('./tools.js');
var translator = require('./translators/translation_interface');
var meetingAction = require('./controllers/meetingcontroller');
var live_conference = require('./assistant/live_conference_interface');
var connection = require('./dbconfig');
const fs = require('fs');
var dateFormat = require('dateformat');
var ProgressMessage = require('./model/ProgressMessage');
var FinalMessage = require('./model/FinalMessage');
var LiveMessage = require('./model/LiveMessage');
var MeetingLanguage = require('./model/MeetingLanguage');

var protocol = {
    register_protocol: function (server) {

        io = require('socket.io')(server);
        /// Dictionary containing language codes for each groups being handled by the socket server.
        io.messageGroups = {};
        io.languageGroups = {};

        io.on('connection', function (socket) {
            var addedUser = false;
            console.log(socket.deviceId + ' client device connected');
            console.log(' zoi_meeting_protocol client connection received..................');

            io.to(socket).emit('on_connection', {
                action: 'on_connection',
                status: true,
                data: 'connected'
            });

            // when the client emits 'start meeting', this listens and executes
            socket.on('start_live_meeting', function (data) {
                console.log('start live zoom meeting: ' + data);
                try {
                    data = JSON.parse(data);

                    var meetingObj = new Object();
                    meetingObj.userid = data.userid;
                    meetingObj.deviceId = data.deviceId;
                    meetingObj.admin = data.admin;
                    meetingObj.lang = data.lang;
                    meetingObj.name = data.name;
                    meetingObj.meeting_name = data.meeting_name;
                    var now = new Date();
                    var time_UTC = dateFormat(now.toUTCString(), 'yyyy-mm-dd HH:MM:ss', true);
                    meetingObj.hostingTime = time_UTC;
                    meetingObj.languages = data.offeredLanguages;
                    meetingObj.conferencePin = data.conferencePin;
                    meetingObj.conferencePassword = data.conferencePassword;

                    var onPinGenerationSuccess = function proceed(mpin) {

                        if (typeof mpin !== 'undefined') {
                            meetingObj.group = mpin;
                            meetingObj.mpin = mpin;
                            meetingObj.message = meetingObj.name + ' started meeting. Session pin: ' + meetingObj.mpin;

                            // 3. create group 
                            socket.deviceId = data.deviceId;
                            socket.name = meetingObj.name;
                            socket.group = mpin;
                            socket.lang = meetingObj.lang;

                            // 4. join to group
                            socket.join(socket.group);

                            // add the client's device id to the global list
                            devices[meetingObj.deviceId] = meetingObj.deviceId;
                            ++numUsers;
                            addedUser = true;


                            /*
                            /// Dictionary entry for languages for this group.
                            var globalLangDict = {};
                            var userLangArray = [];
                            userLangArray.push(meetingObj.lang);
                            globalLangDict[meetingObj.deviceId] = userLangArray;
                            var langObjJSONString = JSON.stringify(globalLangDict);
                            console.log('ON START_MEETING ::: language list for this group : ' + langObjJSONString);
                            /// Make an entry for this group in io.messageGroups
                            io.messageGroups[meetingObj.mpin] = langObjJSONString;
                            */
                            let meet_lang = new MeetingLanguage(meetingObj.mpin);
                            meet_lang.setSingleLanguageForUser(meetingObj.deviceId, meetingObj.lang);
                            io.languageGroups[meetingObj.mpin] = meet_lang;


                            io.in(socket.group).emit('new_message', {
                                action: 'start_live_meeting',
                                status: 1,
                                data: JSON.stringify(meetingObj)
                            });
                        }
                        else {
                            console.log("Unable to create live meeting.....");
                            socket.leave(meetingObj.mpin);
                        }

                    }

                    live_conference.start_live_conference(meetingObj, this, onPinGenerationSuccess);

                } catch (ex) {
                    console.log('CATCH start_meeting Exception: ' + ex.message);
                }
            });

            // when the client emits 'start meeting', this listens and executes
            socket.on('start_meeting', function (data) {
                console.log('start meeting: ' + data);
                try {
                    data = JSON.parse(data);

                    var deviceId = data.deviceId;
                    var name = data.name;
                    var lang = data.lang;
                    var admin = data.admin;
                    var langStr = data.offeredLanguages;
                    console.log("offeredLanguages : " + langStr);

                    var onPinGenerationSuccess = function proceed(mpin) {

                        // 2. Save meeting details in db
                        /* var now = new Date();
                        console.log("Time : " + now);
                        var time_UTC = dateFormat(now.toUTCString(), 'yyyy-mm-dd HH:MM:ss');
                        console.log("Time in UTC : " + time_UTC); */

                        var now = new Date();
                        console.log("Time : " + now);
                        console.log("Time UTC : " + now.toUTCString());
                        var time_UTC = dateFormat(now.toUTCString(), 'yyyy-mm-dd HH:MM:ss', true);
                        console.log("Time in UTC : " + time_UTC);

                        var status = 0;
                        var values = {
                            admin: admin,
                            pin: mpin,
                            meeting_name: "meeting-" + mpin,
                            created_time: time_UTC,
                            languages: langStr,
                            maxNoOfGuests: 0,
                            meeting_type: require('./configs/constants').MeetingTypeEnum.in_house
                        };
                        var qry = connection.query('insert into tbl_meeting set ?', values, function (err, result) {
                            console.log(qry.sql);
                            if (err) {
                                console.log('Insert error: ' + err);
                                throw err;
                            } else {
                                console.log('Insert result: ' + result);
                                status = 1;
                            }
                        });

                        //console.log('Generated pin: ' + mpin);
                        console.log('deviceId: ' + deviceId + ', name: ' + name + ', language: ' + lang + ', Generated pin: ' + mpin + ', created time: ' + time_UTC);

                        // 3. create group 
                        socket.deviceId = deviceId;
                        socket.name = name;
                        socket.group = mpin;
                        socket.lang = lang;

                        // 4. join to group
                        socket.join(socket.group);

                        // add the client's device id to the global list
                        devices[deviceId] = deviceId;
                        ++numUsers;
                        addedUser = true;

                        //var msg = socket.name + ' started meeting. Session pin: ' + socket.group;
                        var obj = new Object();
                        obj.deviceId = socket.deviceId;
                        obj.group = socket.group;
                        obj.mpin = socket.group;
                        obj.lang = socket.lang;
                        obj.name = socket.name;
                        obj.message = socket.name + ' started meeting. Session pin: ' + socket.group;
                        obj.hostingTime = time_UTC;

                        /// Dictionary entry for languages for this group.
                        var globalLangDict = {};
                        var userLangArray = [];
                        userLangArray.push(obj.lang);
                        globalLangDict[obj.deviceId] = userLangArray;
                        var langObjJSONString = JSON.stringify(globalLangDict);
                        console.log('ON START_MEETING ::: language list for this group : ' + langObjJSONString);
                        /// Make an entry for this group in io.messageGroups
                        io.messageGroups[obj.mpin] = langObjJSONString;


                        io.in(socket.group).emit('new_message', {
                            action: 'start_meeting',
                            status: status,
                            data: JSON.stringify(obj)
                        });

                        // Map user meeting in tbl_user_meeting
                        meetingAction.mapUserMeeting(socket.deviceId, mpin, values.meeting_name);
                    }
                    // 1. generate pin (should be unique)
                    tool.getNewPin(connection, onPinGenerationSuccess);


                    //TODO
                    /*
                        5. save to db (pin, group, devices)
                    */
                } catch (ex) {
                    console.log('CATCH start_meeting Exception: ' + ex.message);
                }
            });

            socket.on('join_live_meeting', function (data) {
                console.log('join live meeting -------------------' + data);
                try {

                    data = JSON.parse(data);
                    var meetingObj = new Object();
                    meetingObj.userid = data.userid;
                    meetingObj.deviceId = data.deviceId;
                    meetingObj.mpin = data.mpin;
                    meetingObj.group = data.mpin;
                    meetingObj.name = data.name;
                    meetingObj.lang = data.lang;
                    meetingObj.useraction = data.useraction;
                    meetingObj.message = meetingObj.name + ' joined meeting';

                    console.log('name: ' + meetingObj.name + ', group: ' + meetingObj.mpin + ', language: ' + meetingObj.lang + ', action: ' + meetingObj.useraction);

                    var status = 0;

                    socket.deviceId = meetingObj.deviceId;
                    socket.name = meetingObj.name;
                    socket.group = meetingObj.mpin;
                    socket.lang = meetingObj.lang;
                    socket.useraction = meetingObj.useraction;

                    socket.join(meetingObj.mpin);
                    // add the client's device id to the global list
                    devices[meetingObj.deviceId] = meetingObj.deviceId;
                    ++numUsers;
                    addedUser = true;

                    /*
                    /// Edit language list entry for this group.
                    var langObjJSONString = io.messageGroups[meetingObj.mpin];
                    if (typeof langObjJSONString !== "undefined") {
                        console.log('langObjJSONString : ' + langObjJSONString);
                        var globalLangDict = JSON.parse(langObjJSONString);
                        var userLangArray = [];
                        userLangArray.push(meetingObj.lang);
                        globalLangDict[meetingObj.deviceId] = userLangArray;
                        var langObjJSONString = JSON.stringify(globalLangDict);
                        console.log('ON JOIN_MEETING ::: language list for this group : ' + langObjJSONString);
                        /// Make an entry for this group in io.messageGroups
                        io.messageGroups[meetingObj.mpin] = langObjJSONString;
                    }
                    */
                    let meet_lang = io.languageGroups[meetingObj.mpin];
                    if (typeof meet_lang !== "undefined" && meet_lang.constructor.name === 'MeetingLanguage') {
                        meet_lang.setSingleLanguageForUser(meetingObj.deviceId, meetingObj.lang);
                    }
                    else {
                        let meet_lang = new MeetingLanguage(meetingObj.mpin);
                        meet_lang.setSingleLanguageForUser(meetingObj.deviceId, meetingObj.lang);
                        io.languageGroups[meetingObj.mpin] = meet_lang;
                    }

                    var sendJoinMessage = function (the_obj) {
                        if (the_obj) {
                            console.log("Sending joined meeting message");
                            io.in(socket.group).emit('new_message', {
                                action: 'join_live_meeting',
                                status: status,
                                data: JSON.stringify(the_obj)
                            });
                        }
                        else {
                            console.log('Something failed while trying to join live meeting');
                            socket.leave(meetingObj.mpin);
                        }

                    }

                    meetingAction.join_live_meeting(meetingObj, sendJoinMessage);

                } catch (ex) {
                    console.log('CATCH join_meeting Exception: ' + ex.message);
                    socket.leave(meetingObj.mpin);
                }
            });

            // when the client emits 'join', this listens and executes
            socket.on('join_meeting', function (data) {
                console.log('join meeting -------------------' + data);
                try {
                    //console.log('Join Meeting:  ' + data);
                    data = JSON.parse(data);

                    var deviceId = data.deviceId;
                    var mpin = data.mpin;
                    var name = data.name;
                    var lang = data.lang;
                    var useraction = data.useraction;

                    console.log('name: ' + name + ', group: ' + mpin + ', language: ' + lang + ', action: ' + useraction);

                    var status = 0;

                    socket.deviceId = deviceId;
                    socket.name = name;
                    socket.group = mpin;
                    socket.lang = lang;
                    socket.useraction = useraction;

                    socket.join(mpin);
                    // add the client's device id to the global list
                    devices[deviceId] = deviceId;
                    ++numUsers;
                    addedUser = true;

                    var obj = new Object();
                    obj.deviceId = socket.deviceId;
                    obj.group = socket.group;
                    obj.mpin = socket.group;
                    obj.name = socket.name;
                    obj.lang = socket.lang;
                    obj.useraction = socket.useraction;
                    obj.message = socket.name + ' joined meeting';

                    /// Edit language list entry for this group.
                    var langObjJSONString = io.messageGroups[obj.mpin];
                    if (typeof langObjJSONString !== "undefined") {
                        console.log('langObjJSONString : ' + langObjJSONString);
                        var globalLangDict = JSON.parse(langObjJSONString);
                        var userLangArray = [];
                        userLangArray.push(obj.lang);
                        globalLangDict[obj.deviceId] = userLangArray;
                        var langObjJSONString = JSON.stringify(globalLangDict);
                        console.log('ON JOIN_MEETING ::: language list for this group : ' + langObjJSONString);
                        /// Make an entry for this group in io.messageGroups
                        io.messageGroups[obj.mpin] = langObjJSONString;
                    }

                    var sendJoinMessage = function (the_obj) {
                        console.log("Sending joined meeting message");
                        io.in(socket.group).emit('new_message', {
                            action: 'join_meeting',
                            status: status,
                            data: JSON.stringify(the_obj)
                        });
                    }

                    var qry = connection.query('select maxNoOfGuests as mcount, admin, created_time as hostingTime from tbl_meeting where pin = ' + mpin + ' and active = 1', function (err, result) {
                        console.log(qry.sql);
                        if (err) {
                            console.log('join_meeting error: ' + err);
                            throw err;
                        } else {

                            if (result.length > 0) { /// There is an active meeting going on with this pin...
                                console.log("There is an active meeting going on with this pin...");

                                var count = result[0].mcount + 1;
                                obj.admin = result[0].admin;        // Return admin of the meeting as well
                                obj.hostingTime = dateFormat(obj.hostingTime, 'yyyy-mm-dd HH:MM:ss', false);

                                if (socket.deviceId.startsWith("guest_")) { /// Guest user
                                    console.log("THis is a guest uesr");

                                    if (!name || 0 === name.length) { /// If no display name is provided, assign him a guest name

                                        console.log("The user has no name - give him a name");

                                        var count = result[0].mcount + 1;
                                        name = 'guest' + count;
                                        socket.name = name;
                                        obj.message = socket.name + ' joined meeting';
                                        sendJoinMessage(obj);

                                    }
                                    else { /// Guest user has a name. Announce him joining in the group.

                                        console.log("Guest user has a name. Announce him joining in the group.");
                                        socket.name = name;
                                        obj.message = socket.name + ' joined meeting';
                                        sendJoinMessage(obj);

                                    }

                                    /// Update maxNoOfGuests value in dB
                                    var updateqry = connection.query('update tbl_meeting set maxNoOfGuests = maxNoOfGuests + 1 where pin = ' + mpin, function (err, result) {
                                        console.log(updateqry.sql);
                                        if (err) {
                                            console.log('Update maxNoOfGuests error: ' + err);
                                            throw err;
                                        }
                                    });

                                }
                                else {

                                    /// User is not guest. User has an account and is logged in.
                                    console.log("User is not guest. User has an account and is logged in.");
                                    socket.name = name;
                                    obj.message = socket.name + ' joined meeting';
                                    sendJoinMessage(obj);
                                    const mname = "meeting-" + mpin;
                                    meetingAction.mapUserMeeting(socket.deviceId, mpin, mname);
                                }
                            }
                        }
                    });

                } catch (ex) {
                    console.log('CATCH join_meeting Exception: ' + ex.message);
                }
            });

            // when the client emits 'new message', this listens and executes
            socket.on('new_message', function (data) {
                console.log('new message!');
                try {
                    console.log(">> group " + socket.group + " / device: " + socket.deviceId + ", name: " + socket.name);

                    data = JSON.parse(data);
                    console.log(' :: message: ' + data.message);

                    var obj = new Object();
                    obj.deviceId = socket.deviceId;
                    obj.group = socket.group;
                    obj.name = socket.name;
                    obj.message = data.message;
                    obj.id = data.id;

                    /// Get timestamp of message
                    var time_UTC = new Date().toUTCString()
                    console.log("Time in UTC : " + time_UTC);
                    /// Set timestamp to messages
                    obj.timestamp = dateFormat(time_UTC, 'yyyy-mm-dd HH:MM:ss', true);

                    /// Retrieve language list for this group.
                    var langObjJSONString = io.messageGroups[obj.group];

                    // To fix the exception/error:     "Exception : Unexpected token u in JSON at position 0"
                    if (typeof langObjJSONString == 'undefined') {
                        // Dictionary entry for languages for this group.
                        var globalLangDict1 = {};
                        var userLangArray = [];
                        userLangArray.push(data.lang);
                        globalLangDict1[obj.deviceId] = userLangArray;
                        langObjJSONString = JSON.stringify(globalLangDict1);
                        console.log('ON NEW_MESSAGE ::: language list for this group : ' + langObjJSONString);
                        // Make an entry for this group in io.messageGroups
                        io.messageGroups[obj.group] = langObjJSONString;
                    }

                    const globalLangDict = JSON.parse(langObjJSONString);
                    var langCodeArray = [];
                    /// Iterate the whole dictonary and contruct a language array. This will have duplicate languages which we remove later in the workflow
                    for (var user_id in globalLangDict) {
                        var lang_arr = globalLangDict[user_id];
                        /// Get all languages for this user.
                        lang_arr.forEach(lang_code => {
                            langCodeArray.push(lang_code);
                        });
                    }
                    /// Remove any duplicate entries
                    langCodeArray = Array.from(new Set(langCodeArray));
                    languages = langCodeArray;

                    obj.lang = data.lang;
                    var source = data.lang;     // TODO Handle for 'en' and 'en-us'

                    obj.startTime = data.startTime;
                    obj.endTime = data.endTime;

                    var sendTranscript = function translate(originalMessageId) {

                        console.log('original message id: ' + originalMessageId);
                        obj.messageId = originalMessageId;          //Can be used for editing the original message

                        for (var i = 0; i < languages.length; i++) {
                            console.log("selected lang: " + languages[i]);
                            var target = languages[i];

                            if (typeof target != 'undefined' && null != target) {

                                if (source != target) {

                                    console.log("basil >>>> " + data.message);

                                    try {

                                        translator.translate(source, target, data.message, function (targetLangCode, translatedText, errorMsg) {
                                            //translator.translate("ja","en","おはよう今日はどうですか ？",function(translatedText,errorMsg){
                                            if (translatedText === undefined) {

                                                console.log("*********** Translation failed with error message : " + errorMsg);
                                                //TODO: Handle translation failure.

                                                // Send original message if translation fails
                                                obj.lang_t = targetLangCode;
                                                io.in(socket.group).emit('new_message', {
                                                    action: 'new_message',
                                                    data: JSON.stringify(obj)
                                                });

                                            } else {

                                                console.log("************ Translated text is : " + translatedText + ", in lang_code: " + targetLangCode);

                                                response = translatedText;
                                                obj.message_t = response;
                                                obj.lang_t = targetLangCode;
                                                // Send new message to everyone including sender (to exclude sender use socket.to)
                                                io.in(socket.group).emit('new_message', {
                                                    action: 'new_message',
                                                    data: JSON.stringify(obj)
                                                });

                                                /* ********************************************************************************************************************** */
                                                // Save output transcript to database -- START //

                                                var saveOutput = new Object();
                                                saveOutput.messageId = originalMessageId;
                                                saveOutput.languageCode = targetLangCode;
                                                saveOutput.text = response;

                                                meetingAction.saveOutputTranscript(saveOutput);

                                                // Save output transcript to database -- END //
                                                /* ********************************************************************************************************************** */
                                            }
                                        });
                                        /*
                                        tool.getHttpRespose(https, source, target, data.message, function (target, response) {
                                            
            
                                        });
                                        */
                                    } catch (e) {
                                        console.log('CATCH Translation message save/emit error: ' + e.message);

                                        // Send original message if translation fails
                                        // Send new message to everyone including sender (to exclude sender use socket.to)
                                        obj.lang_t = target;
                                        io.in(socket.group).emit('new_message', {
                                            action: 'new_message',
                                            data: JSON.stringify(obj)
                                        });
                                    }
                                } else {

                                    console.log('Source and target languages are same "' + target + '". So no need to translate');
                                    obj.message_t = data.message;
                                    obj.lang_t = target;
                                    // Send new message to everyone including sender (to exclude sender use socket.to)
                                    io.in(socket.group).emit('new_message', {
                                        action: 'new_message',
                                        data: JSON.stringify(obj)
                                    });

                                    /* ********************************************************************************************************************** */
                                    // Save output transcript to database -- START //

                                    var saveOutput = new Object();
                                    saveOutput.messageId = originalMessageId;
                                    saveOutput.languageCode = target;
                                    saveOutput.text = data.message;

                                    meetingAction.saveOutputTranscript(saveOutput);

                                    // Save output transcript to database -- END //
                                    /* ********************************************************************************************************************** */

                                }
                            } else {
                                console.log('NEW_MESSAGE ::::: Target lang undefined/null. So no need to emit this. No other users exist for this meeting');

                                /* ********************************************************************************************************************** */
                                // Save output transcript to database -- START //

                                var saveOutput = new Object();
                                saveOutput.messageId = originalMessageId;
                                saveOutput.languageCode = source;
                                saveOutput.text = data.message;

                                meetingAction.saveOutputTranscript(saveOutput);

                                // Save output transcript to database -- END //
                                /* ********************************************************************************************************************** */

                            }
                        }

                        try {

                            var toUpdate = new Object();
                            toUpdate.messageId = originalMessageId;
                            // toUpdate.audio = (typeof data.audio != 'undefined' ? data.audio : null);           // Save audio data directly in DB

                            //Working. This will write the audio data to a file
                            var buf = Buffer.from(data.audio, 'utf-8');
                            let fileName = obj.group + '_' + obj.deviceId + '_' + dateFormat(new Date().toUTCString(), 'yyyy-mm-dd_HHMMss', true) + '.zmt';
                            let uploadPath = __dirname + require('./configs/constants').uploadLocation + fileName;
                            fs.writeFile(uploadPath, buf, er => {
                                if (er) {
                                    console.log('Error saving audio to text file');
                                    console.log(er.message);

                                    toUpdate.audio = (typeof data.audio != 'undefined' ? data.audio : null);        // If there is no file created, atleast keep the content in DB
                                } else {
                                    toUpdate.audioUrl = '/uploads/' + fileName;           // Save audio data file url in DB
                                    console.log('Saved audio to text file for messageId: ' + originalMessageId + ', with url: ' + toUpdate.audioUrl);
                                }

                                meetingAction.updateAudio(toUpdate);
                            });
                        } catch (error) {
                            console.log('CATCH save audio Exception ::: ' + error.message);
                        }
                    }
                    /* ********************************************************************************************************************** */
                    // Save original transcript to database -- START //
                    var toSave = new Object();
                    toSave.meetingId = obj.group;
                    toSave.userId = obj.deviceId; // deviceId is set as the email id of the user
                    toSave.languageCode = source;
                    toSave.text = obj.message;
                    toSave.timestamp = obj.timestamp;
                    /* toSave.startTime = obj.startTime;
                    toSave.endTime = obj.endTime; */
                    toSave.startTime = (typeof obj.startTime != 'undefined' ? obj.startTime : null);
                    toSave.endTime = (typeof obj.endTime != 'undefined' ? obj.endTime : null);
                    // toSave.audio = (typeof data.audio != 'undefined' ? data.audio : null);           // Save audio data directly in DB


                    meetingAction.saveOriginalTranscript(toSave, sendTranscript);

                    // Save original transcript to database -- END //
                    /* ********************************************************************************************************************** */

                } catch (ex) {
                    console.log('CATCH new_message Exception : ' + ex.message);
                }
            });

            /// Event fired when the language list of any client changes.
            socket.on('on_language_change', function (data) {

                console.log('new on_language_change');

                try {

                    console.log(">> group " + socket.group + " / device: " + socket.deviceId + ", name: " + socket.name + " :: data: " + data);

                    var userLangArray = JSON.parse(data); /// This should return an array of language codes.

                    if (userLangArray.length > 0) {

                        let meet_lang = io.languageGroups[socket.group];
                        if (typeof meet_lang !== "undefined" && meet_lang.constructor.name === 'MeetingLanguage') {
                            meet_lang.setLanguagesForUser(socket.deviceId, data);
                        }

                        /*

                        /// Edit language list entry for this group.
                        var langObjJSONString = io.messageGroups[socket.group];

                        if (typeof langObjJSONString !== "undefined") {

                            console.log('langObjJSONString : ' + langObjJSONString);

                            var globalLangDict = JSON.parse(langObjJSONString);

                            globalLangDict[socket.deviceId] = userLangArray;

                            langObjJSONString = JSON.stringify(globalLangDict);

                            console.log('on_language_change event ; language list for this group : ' + langObjJSONString);

                            /// Make an entry for this group in io.messageGroups
                            io.messageGroups[socket.group] = langObjJSONString;

                        }
                        */

                    }

                } catch (ex) {
                    console.log('CATCH on_language_change Exception : ' + ex.message);
                }
            });

            /**
             * when the client emits 'zoi_final', this listens and executes.
             * This is a new event created on the Enterprise version. The mobile apps should subscribe to this event.
             * */
            socket.on('zoi_final', function (data) {
                console.log('zoi_final!');
                try {
                    console.log(">> group " + socket.group + " / device: " + socket.deviceId + ", name: " + socket.name);
                    //console.log('zoi_final :: json: ', data);
                    data = JSON.parse(data);
                    var finalMsg = new FinalMessage(data, socket);

                    //console.log("Finale message object : ",finalMsg);
                    // Send new message to everyone excluding the sender (to include sender use socket.to)
                    /*socket.to(socket.group).emit('zoi_final', {
                        action: 'zoi_final',
                        data: JSON.stringify(finalMsg)
                    });*/

                    // Send new message to everyone excluding the sender (to include sender use socket.to)
                    socket.to(socket.group).emit('new_message', {
                        action: 'new_message',
                        data: JSON.stringify(finalMsg)
                    });

                    /* ********************************************************************************************************************** */
                    // Save original transcript to database -- START //
                    var toSave = new Object();
                    toSave.meetingId = finalMsg.group;
                    toSave.userId = finalMsg.deviceId; // deviceId is set as the email id of the user
                    toSave.languageCode = finalMsg.lang;
                    toSave.text = finalMsg.message;
                    toSave.timestamp = finalMsg.timestamp;
                    toSave.startTime = (typeof finalMsg.startTime != 'undefined' ? finalMsg.startTime : null);
                    toSave.endTime = (typeof finalMsg.endTime != 'undefined' ? finalMsg.endTime : null);
                    toSave.tempAudioId = finalMsg.tempAudioId;

                    meetingAction.saveOriginalTranscript(toSave);

                    // Save original transcript to database -- END //
                    /* ********************************************************************************************************************** */

                } catch (ex) {
                    console.log('CATCH zoi_final Exception : ' + ex.message);
                }
            });

            /**
             * when the client emits 'zoi_progress', this listens and executes.
             * This is a new event created on the Enterprise version. The mobile apps should not subscribe this event.
             * */
            socket.on('zoi_progress', function (data) {

                console.log('zoi_progress!');
                try {
                    console.log(">> group " + socket.group + " / device: " + socket.deviceId + ", name: " + socket.name + " :: data: " + data);

                    data = JSON.parse(data);

                    /// Create progress message from data.
                    var progressMsg = new ProgressMessage(data, socket);

                    // Send new message to everyone excluding sender (to include sender use socket.to)
                    socket.to(socket.group).emit('zoi_progress', {
                        action: 'zoi_progress',
                        data: JSON.stringify(progressMsg)
                    });

                } catch (ex) {
                    console.log('CATCH progress Exception : ' + ex.message);
                }
            });

            /**
             * when the client emits 'zoi_audio', this listens and executes.
             * This is a new event created on the Enterprise version. The mobile apps should not subscribe this event.
             * */
            socket.on('zoi_audio', function (data) {

                console.log('zoi_audio!');
                try {
                    console.log(">> group " + socket.group + " / device: " + socket.deviceId + ", name: " + socket.name);
                    data = JSON.parse(data);
                    meetingAction.updateAudioFromNewProtocol(data);
                } catch (ex) {
                    console.log('CATCH zoi_audio Exception : ' + ex.message);
                }
            });

            // when the client emits 'progress', this listens and executes
            socket.on('progress', function (data) {

                console.log('progress!');
                try {
                    console.log(">> group " + socket.group + " / device: " + socket.deviceId + ", name: " + socket.name + " :: data: " + data);

                    data = JSON.parse(data);

                    var obj = new Object();
                    obj.deviceId = socket.deviceId;
                    obj.group = socket.group;
                    obj.name = socket.name;
                    obj.message = data.message;
                    obj.id = data.id;

                    /// Get timestamp of message
                    var time_UTC = new Date().toUTCString()
                    console.log("Time in UTC : " + time_UTC);
                    /// Set timestamp to messages
                    // obj.timestamp = time_UTC;
                    obj.timestamp = dateFormat(time_UTC, 'yyyy-mm-dd HH:MM:ss', true);

                    /// Retrieve language list for this group.
                    var langObjJSONString = io.messageGroups[obj.group];

                    // To fix the exception/error:     "Exception : Unexpected token u in JSON at position 0"
                    if (typeof langObjJSONString == 'undefined') {
                        // Dictionary entry for languages for this group.
                        var globalLangDict1 = {};
                        var userLangArray = [];
                        userLangArray.push(data.lang);
                        globalLangDict1[obj.deviceId] = userLangArray;
                        langObjJSONString = JSON.stringify(globalLangDict1);
                        console.log('ON PROGRESS ::: language list for this group : ' + langObjJSONString);
                        // Make an entry for this group in io.messageGroups
                        io.messageGroups[obj.group] = langObjJSONString;
                    }

                    const globalLangDict = JSON.parse(langObjJSONString);
                    var langCodeArray = [];
                    /// Iterate the whole dictonary and contruct a language array. This will have duplicate languages which we remove later in the workflow
                    for (var user_id in globalLangDict) {
                        var lang_arr = globalLangDict[user_id];
                        /// Get all languages for this user.
                        lang_arr.forEach(lang_code => {
                            langCodeArray.push(lang_code);
                        });
                    }
                    /// Remove any duplicate entries
                    langCodeArray = Array.from(new Set(langCodeArray));
                    languages = langCodeArray;

                    obj.lang = data.lang;
                    var source = data.lang;     // TODO Handle for 'en' and 'en-us'

                    for (var i = 0; i < languages.length; i++) {
                        console.log("selected lang: " + languages[i]);
                        var target = languages[i];

                        if (typeof target != 'undefined' && null != target) {
                            if (source != target) {

                                console.log("progress >>>> " + data.message);

                                translator.translate(source, target, data.message, function (targetLangCode, translatedText, errorMsg) {
                                    //translator.translate("ja","en","おはよう今日はどうですか ？",function(translatedText,errorMsg){
                                    if (translatedText === undefined) {

                                        console.log("*********** Translation failed with error message : " + errorMsg);
                                        // Handle translation failure.

                                        // Send original message if translation fails
                                        obj.lang_t = targetLangCode;

                                        /*io.in(socket.group).emit('new_message', {
                                            action: 'progress',
                                            data: JSON.stringify(obj)
                                        });*/
                                        /// New message to send progress event.
                                        io.in(socket.group).emit('zoi_progress', {
                                            action: 'progress',
                                            data: JSON.stringify(obj)
                                        });
                                    }
                                    else {

                                        console.log("************ Translated text is : " + translatedText);

                                        response = translatedText;

                                        obj.message_t = response;
                                        obj.lang_t = targetLangCode;
                                        // Send new message to everyone including sender (to exclude sender use socket.to)
                                        /*io.in(socket.group).emit('new_message', {
                                            action: 'progress',
                                            data: JSON.stringify(obj)
                                        });*/
                                        io.in(socket.group).emit('zoi_progress', {
                                            action: 'progress',
                                            data: JSON.stringify(obj)
                                        });
                                    }
                                });

                            } else {

                                console.log('Source and target languages are same "' + target + '". So no need to translate');
                                obj.message_t = data.message;
                                obj.lang_t = target;
                                // Send new message to everyone including sender (to exclude sender use socket.to)
                                io.in(socket.group).emit('new_message', {
                                    action: 'progress',
                                    data: JSON.stringify(obj)
                                });
                            }
                        } else {
                            console.log('PROGRESS ::::: Target lang undefined/null');
                        }

                    }

                } catch (ex) {
                    console.log('CATCH progress Exception : ' + ex.message);
                }

            });

            // when the user disconnects.. perform this
            socket.on('exit', function () {
                // remove the username from global devices list
                if (addedUser) {
                    delete devices[socket.deviceId];
                    --numUsers;

                    console.log(socket.deviceId + ' is exiting');

                    if (typeof socket.deviceId !== "undefined") {

                        /// Remove him from language list.

                        var langObjJSONString = io.messageGroups[socket.group];

                        if (typeof langObjJSONString !== "undefined") {

                            var globalLangDict = JSON.parse(langObjJSONString);

                            delete globalLangDict[socket.deviceId];

                            langObjJSONString = JSON.stringify(globalLangDict);

                            console.log('Removing language preference of exiting client named ' + socket.name);

                            /// Make an entry for this group in io.messageGroups
                            io.messageGroups[socket.group] = langObjJSONString;
                        }

                        /// Remove languages for this socket
                        let meet_lang = io.languageGroups[socket.group];
                        if (typeof meet_lang !== "undefined" && meet_lang.constructor.name === 'MeetingLanguage') {
                            meet_lang.removeUser(socket.deviceId);
                        }

                    }

                    var obj = new Object();
                    obj.username = socket.name;
                    obj.numUsers = numUsers;

                    io.in(socket.group).emit('exit', {
                        action: 'exit',
                        data: JSON.stringify(obj)
                    });

                    socket.leave(socket.group); /// Remove this socket from group...

                    /// If this was the last user in the group, start timer for 10 mins. After 10 mins nobody joins the meeting, end the meeting.


                }
            });

            /**
             * When the client emits 'stop_meeting', this listens and executes
             * This event is intended to be fired by the admin user of the meeting
             */
            socket.on('stop_meeting', function () {
                console.log('stop meeting');

                var stopResult = (resObj) => {
                    var obj = new Object();
                    if (resObj.status == true) {
                        try {
                            delete devices[socket.deviceId];
                            --numUsers;
                            console.log('Removed user from devices');
                        } catch (ex) {
                            console.log('CATCH stop_meeting - delete devices Exception: ' + ex.message);
                        }

                        try {

                            obj.mpin = socket.group;
                            obj.message = socket.name + ' stopped meeting';
                            console.log(obj.message);

                            io.in(socket.group).emit('stop_meeting', {
                                action: 'stop_meeting',
                                data: JSON.stringify(obj)
                            });

                            delete io.messageGroups[socket.group];
                            console.log('Removed meeting with pin: ' + socket.group + ' from io message groups');

                        } catch (ex) {
                            console.log('CATCH stop_meeting - delete from messageGroupsException: ' + ex.message);
                        }
                    } else {
                        console.log('Meeting not stopped');
                        obj.mpin = socket.group;
                        obj.message = 'Meeting couldn\'t be stopped. Please try again later';
                        io.to(socket).emit('stop_error', {
                            action: 'stop_error',
                            data: JSON.stringify(obj)
                        });
                    }
                }

                var data = new Object();
                data.mpin = socket.group;
                data.user = socket.deviceId;
                meetingAction.stopMeeting(data, stopResult);

            });

            /**
             * When the client emits 'leave', this listens and executes
             * This event is intended to be fired by the users of a particular meeting whose admin calls stop_meeting
             */
            socket.on('leave', function () {
                console.log('Leave');

                try {
                    console.log(socket.deviceId + ' is leaving the meeting');
                    socket.leave(socket.group);

                } catch (ex) {
                    console.log('CATCH leave Exception: ' + ex.message);
                }
            });

            // when disconnected (eg: when browser closed or reloaded)
            socket.on('disconnect', function () {

                // remove the username from global devices list
                if (addedUser) {
                    delete devices[socket.deviceId];
                    --numUsers;

                    console.log(socket.deviceId + ' disconnected');

                    if (typeof socket.deviceId !== "undefined") {

                        /// Remove him from language list.

                        var langObjJSONString = io.messageGroups[socket.group];

                        if (typeof langObjJSONString !== "undefined") {

                            var globalLangDict = JSON.parse(langObjJSONString);

                            delete globalLangDict[socket.deviceId];

                            langObjJSONString = JSON.stringify(globalLangDict);

                            console.log('Removing language preference of disconnected client named ' + socket.name);

                            /// Make an entry for this group in io.messageGroups
                            io.messageGroups[socket.group] = langObjJSONString;
                        }

                        /// Remove languages for this socket
                        let meet_lang = io.languageGroups[socket.group];
                        if (typeof meet_lang !== "undefined" && meet_lang.constructor.name === 'MeetingLanguage') {
                            meet_lang.removeUser(socket.deviceId);
                        }
                    }

                    console.log('Broadcasting disconnect');

                    var obj = new Object();
                    obj.username = socket.name;
                    obj.numUsers = numUsers;

                    const room = socket.group;

                    socket.leave(socket.group);

                    io.sockets.in(room).emit('disconnect', {
                        action: 'disconnect',
                        data: JSON.stringify(obj)
                    });
                }
            });


        });

        /**
         * EVENT EMOTTER METHODS
         */

        const emitter = require('./assistant/zoiEmitter');

        emitter.on('liveTranscripts_progress', function (data) {

            //console.log(data);

            try {
                //console.log(">>EVENT EMITTER METHODS  group " + socket.group + " / device: " + socket.deviceId + ", name: " + socket.name + " :: data: " + data);

                /// Create progress message from data.
                var live_progress_msg = new LiveMessage(data);
                translateAndForwardLiveMessage(live_progress_msg, 'zoi_progress', 'zoi_progress');

            } catch (ex) {
                console.log(' EVENT EMITTER METHODS CATCH progress Exception : ' + ex.message);
            }
        });


        emitter.on('liveTranscripts_final', function (data) {

            try {

                var live_progress_msg = new LiveMessage(data);
                translateAndForwardLiveMessage(live_progress_msg, 'new_message', 'new_message');

            } catch (ex) {
                console.log(' EVENT EMITTER METHODS CATCH final Exception : ' + ex.message);
            }


        });

        emitter.on('zoi_alerts', function (the_mpin, alert_action) {
            //console.log("Going to forward zoi_alerts : pin : " + the_mpin + " action : " + alert_action);
            try {
                if (the_mpin && alert_action) {
                    console.log("Forwarding zoi_alerts : pin : " + the_mpin + " action : " + alert_action);
                    io.in(the_mpin).emit('zoi_alerts', {
                        action: alert_action,
                        data: the_mpin
                    });
                    if (alert_action === 'live_meeting_COMPLETED') {
                        //stop_live_conference_call(the_mpin);
                        removeLanguagesForMeeting(the_mpin);
                    }
                }
            } catch (ex) {
                console.log(' EVENT EMITTER METHODS CATCH progress Exception : ' + ex.message);
            }
        });

        var translateAndForwardLiveMessage = function (live_progress_msg, event, action, callback) {
            try {

                let sendProgressToClients = function (live_msg) {
                    io.in(live_msg.group).emit(event, {
                        action: action,
                        data: JSON.stringify(live_msg)
                    });
                    if (callback) {
                        callback();
                    }
                }

                let meet_lang = io.languageGroups[live_progress_msg.zoiPin];
                if (typeof meet_lang !== "undefined" && meet_lang.constructor.name === 'MeetingLanguage') {
                    let mLanguages = meet_lang.uniqueLanguages();
                    mLanguages.forEach(lang_code => {
                        let source = live_progress_msg.lang;
                        let target = lang_code;
                        if (source === target) {
                            console.log('Source same as target language');
                            /// If source and target are the same don't delay. Send msg straight away.
                            sendProgressToClients(live_progress_msg);
                        } else {
                            console.log('Tranlating from ' + source + ' to ' + target);
                            translator.translate(source, target, live_progress_msg.message, function (targetLangCode, translatedText, errorMsg) {

                                if (translatedText === undefined) {

                                    console.log("*********** Translation failed with error message : " + errorMsg);
                                    // Handle translation failure.

                                    // Send original message if translation fails
                                    live_progress_msg.lang_t = targetLangCode;
                                    sendProgressToClients(live_progress_msg);

                                }
                                else {

                                    console.log("************ Translated text is : " + translatedText);

                                    live_progress_msg.message_t = translatedText;
                                    live_progress_msg.lang_t = targetLangCode;

                                    sendProgressToClients(live_progress_msg);
                                }
                            });
                        }
                    });
                }
                else {
                    /// In case languages for the meeting is not retrievable, forward msg in original language at-least
                    console.log('languages for the meeting is not retrievable, forward msg in original language at-least');
                    sendProgressToClients(live_progress_msg);
                }
            } catch (ex) {
                console.log(' EVENT EMITTER METHODS CATCH progress Exception : ' + ex.message);
            }
        }

        var removeLanguagesForMeeting = function (the_mpin) {
            try {
                delete io.languageGroups[the_mpin];
                console.log('Removed meeting with pin: ' + the_mpin + ' from io language groups');
            } catch (ex) {
                console.log('CATCH stop_meeting - delete from messageGroupsException: ' + ex.message);
            }
        }

    }

};

module.exports = protocol;