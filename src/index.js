/**
 * Lambda function for handling Alexa Skill requests that uses Urbandictionary.com REST api to define a term.
 * Examples:
 * One-shot model:
 *  User: "Alexa, ask Urban Dictionary what is the meaning of Boston Pancake?"
 *  Alexa: "(queries Urbandictionary.com REST api and finds the term)"
 */

'use strict';

var AlexaSkill = require('./AlexaSkill');

var config = require('./config');

var _ = require('./lodash');

var request = require('request');

var appId = config.appId;

var UrbanAlexa = function () {
    AlexaSkill.call(this, appId);
};

UrbanAlexa.prototype = Object.create(AlexaSkill.prototype);
UrbanAlexa.prototype.constructor = UrbanAlexa;

UrbanAlexa.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    var repromptOutput, speechOutput;

    speechOutput = {
        speech: "Welcome to the Urban Alexa. You can ask a question like, what's the meaning of cleveland steamer? ... Now, what can I help you with.",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    repromptOutput = {
        speech: "For instructions on what you can say, please say help me.",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.ask(speechOutput, repromptOutput);
};

UrbanAlexa.prototype.intentHandlers = {
    "DefineTerm": function (intent, session, alexaResponse) {
        var termSlot = intent.slots.Term;
        var speech, speechOutput, repromptOutput;
        var pointer = 0;

        var hasTerm = termSlot && termSlot.value;

        if (hasTerm) {
            session.attributes.term = termSlot.value;
        } else {
            speechOutput = {
                speech: "<speak>" + "I'm sorry, I couldn't find the term you were looking for." + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            alexaResponse.tell(speechOutput);
        }

        console.log(termSlot.value);

        request({
            url: config.endpoint,
            method: "GET",
            json: true,
            qs: {
                term: termSlot.value
            },
            headers: {
                "Accept": "application/json"
            }
        }, function (error, response, body) {
            if (error) {
                console.log(error);
                speechOutput = {
                    speech: "<speak>" + "I'm sorry, I couldn't find the term: " + termSlot.value + "</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.tell(speechOutput);
            } else {
                console.log(response.statusCode, body);
                if (body.result_type === 'no_results') {
                    speechOutput = {
                        speech: "<speak>" + "I'm sorry, I couldn't find the term: " + termSlot.value + "</speak>",
                        type: AlexaSkill.speechOutputType.SSML
                    };
                    alexaResponse.tell(speechOutput);
                } else {
                    var cleanResponse = body.list[pointer].definition.replace(/\n/g, '').replace(/\r/g, '');
                    speech = "<speak>" + termSlot.value + ":" + "<break time='0.5s'/>" + cleanResponse + "</speak>";
                    session.attributes.definitions = body.list;
                    session.attributes.similarTerms = _.uniq(body.tags);
                    session.attributes.pointer = pointer;
                }
                speechOutput = {
                    speech: speech,
                    type: AlexaSkill.speechOutputType.SSML
                };
                repromptOutput = {
                    speech: "<speak>" + "Would you like to hear another definition?" + "</speak>",
                    type: AlexaSkill.speechOutputType.SSML
                };
                alexaResponse.ask(speechOutput, repromptOutput);
            }
        });
    },
    "AMAZON.StopIntent": function (intent, session, response) {
        var similarTerms = session.attributes.similarTerms;
        if (Array.isArray(similarTerms) && similarTerms.size > 0) {
            speechOutput = {
                speech: "<speak>Here is a list of terms that you might be interested in: " + similarTerms.join(',') + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            response.tell(speechOutput);
        } else {
            var speechOutput = "Goodbye";
            response.tell(speechOutput);
        }
    },
    "AMAZON.CancelIntent": function (intent, session, response) {
        var similarTerms = session.attributes.similarTerms;
        if (Array.isArray(similarTerms) && similarTerms.size > 0) {
            speechOutput = {
                speech: "<speak>Here is a list of terms that you might be interested in: " + similarTerms.join(',') + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            response.tell(speechOutput);
        } else {
            var speechOutput = "Goodbye";
            response.tell(speechOutput);
        }
        ;
    },
    "AMAZON.NoIntent": function (intent, session, response) {
        var similarTerms = session.attributes.similarTerms;
        if (Array.isArray(similarTerms) && similarTerms.size > 0) {
            speechOutput = {
                speech: "<speak>Here is a list of terms that you might be interested in: " + similarTerms.join(',') + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            response.tell(speechOutput);
        } else {
            var speechOutput = "Goodbye";
            response.tell(speechOutput);
        }
    },
    "AMAZON.YesIntent": function (intent, session, response) {
        var speechOutput, repromptOutput;
        var sessionDefinitions = session.attributes.definitions;
        var sessionPointer = session.attributes.pointer;
        var sessionTerm = session.attributes.term;

        console.log(sessionDefinitions);

        if (Array.isArray(sessionDefinitions) && sessionDefinitions.size > 0) {
            var cleanResponse = sessionDefinitions[sessionPointer++].definition.replace(/\n/g, '').replace(/\r/g, '');
            speechOutput = {
                speech: "<speak>" + sessionTerm + ":" + "<break time='0.5s'/>" + cleanResponse + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            repromptOutput = {
                speech: "<speak>" + "Would you like to hear another definition?" + "</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            session.attributes.pointer = sessionPointer;
            response.ask(speechOutput, repromptOutput);
        } else {
            speechOutput = {
                speech: "<speak>I gave you all the definitions that I have. I can't believe the term is still not clear for you!</speak>",
                type: AlexaSkill.speechOutputType.SSML
            };
            response.tell(speechOutput);
        }
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
    }
};

exports.handler = function (event, context) {
    var urbanAlexa = new UrbanAlexa();
    urbanAlexa.execute(event, context);
};
