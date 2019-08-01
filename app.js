/*
* MIT License
*
* Copyright (c) 2019 Kacper Marcinkiewicz
*
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

//--------------------CONFIG--------------------//
//                                              //
    const newsletterHTML = '<div style="background-color: #303030;color: white;border-radius: 10px;padding: 15px;text-align: center;">This is newsletter</div>';
    const registerHTML = '<div style="background-color: #303030;color: white;border-radius: 10px;padding: 15px;text-align: center;">This is your verification code: <b style="background-color: white;border-radius: 10px;padding: 5px;color: black; margin-left: 5px;margin-right: 5px;"> %s </b><br/><br/><br/><div style="color: #a2a2a2;font-size: 10px;text-decoration: underline;font-weight: bold;">If you don\'t try to register/delete an account, please ignore this message</div></div>';
//                                              //
//----------------------------------------------//

const Discord = require("discord.js");
const config = require('./config.json');
var nodemailer = require('nodemailer');
const util = require('util');

//New DB
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
 
const adapter = new FileSync('db.json')
const db = low(adapter)
///NewDB

db.defaults({ Temp: [], emailList: [] }).write()

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.Gmail,
        pass: config.GmailPassword
    }
});

const client = new Discord.Client();

//#region Error catching
client.on("error", error => {
    console.log();
    console.log("Error: ");
    console.log(error);
    console.log();

    //Send error in PM to bot owner
    try{
        client.fetchUser("329706346826039297").then(user =>{    
            user.send("**Bot error: **\n" + error.message);
        });
    }
    catch(e){
        console.log("I cant send PM!");
    }
    
});
process.on('uncaughtException', function(err) {
    //Send error in PM to bot owner
    try{
        client.fetchUser("329706346826039297").then(user =>{    
            user.send('**Caught exception:** ' + err);
        });
    }
    catch(e){
        console.log("I cant send PM!");
    }
});
process.on('unhandledRejection', function(er) {
    //Send error in PM to bot owner
    try{
        client.fetchUser("329706346826039297").then(user =>{    
            user.send('**Unhandled rejection:** ' + er);
        });
    }
    catch(e){
        console.log("I cant send PM!");
    }
});
//#endregion

client.on("disconnect", ()=> console.log("\nDisconnected!"));
client.on("reconnecting", () => console.log("Reconnecting..."));
client.on("resume", () => console.log("Resumed\n"));

client.on("ready", () => {
    console.log("Ready");
    client.user.setActivity(`>help`);   
});

client.on("message", async msg => {
    if(msg.author.bot) return;
    if(msg.content.indexOf(">") !== 0) return;

    const args = msg.content.slice(1).trim().split(/ +/g);
    const command = args.shift();

    if(command == "register"){
        if(args[0] == null){
            msg.channel.send({embed: {
                color: 0xffdd00,
                description: "You didn't give enough arguments! Example: **>register my.mail@gmail.com**"
            }});

            return;
        }        
        else{            
            var email = args[0];
            if(!email.includes("@") || email.includes("<") || email.includes(">") || email.startsWith(".")){
                msg.channel.send({embed: {
                    color: 0xffdd00,
                    description: "**" + email + "** does not look like an email!"
                }});
                return;
            }

            var exist = false;
            var listLength = db.get("emailList").size().value();
            var list = db.get("emailList").value();
            
            list.forEach(_mail => {
                if(list != null && listLength != 0){
                    if(_mail == email){
                        msg.channel.send({embed: {
                            color: 0xffdd00,
                            description: "**" + email + "** exists in the database!"
                        }});
                        
                        exist = true;
                        return;
                    }
                }
            });                              
            
            if(exist){
                return;
            }

            var rand1 = Math.floor(Math.random() * 10).toString();
            var rand2 = Math.floor(Math.random() * 10).toString();
            var rand3 = Math.floor(Math.random() * 10).toString(); 
            var rand4 = Math.floor(Math.random() * 10).toString();
            var random = (rand1 + rand2 + rand3 + rand4).toString();
            
            if(db.get("Temp").find({"email": email}).value()){
                db.get("Temp").find({"email": email}).assign({"email": email, "code": random}).write();
            }else db.get("Temp").push({"email": email, "code": random}).write();

            const mailOptions = {
                from: 'marcinkiewicz.kacper@gmail.com', // sender address
                to: email, // list of receivers
                subject: 'Newsletter confirm', // Subject line
                html: util.format(registerHTML, random) // replace %s (from const) with random code
            };
            
            var m = msg.channel.send({embed: {
                color: 0xffdd00,
                description: "Sending email..."
            }});

            transporter.sendMail(mailOptions, function(err, info){
                if(err){
                    m.then(_m =>{
                        _m.edit({embed: {
                            color: 0xff0000,
                            description: "Error: \n**"+err+"**"
                        }});
                    });

                    db.get("Temp").remove({"email": email}).write();
                }
                else{
                    m.then(_m =>{
                        _m.edit({embed: {
                            color: 0x04ff00,
                            description: "The verification code has been sent. To confirm the email type (example): **>confirmEmail " + email + " YOUR_CODE_HERE**"
                        }});
                    });                    
                }
            });

        }
    }

    if(command == "confirmEmail"){
        if(args[0] == null || args[1] == null){
            msg.channel.send({embed: {
                color: 0xffdd00,
                description: "You didn't give enough arguments! Example: **>confirmEmail my.mail@gmail.com 1234**"
            }});
            return;
        }
        else{
            var email = args[0];
            if(!email.includes("@") || email.includes("<") || email.includes(">") || email.startsWith(".")){
                msg.channel.send({embed: {
                    color: 0xffdd00,
                    description: "**" + email + "** does not look like an email!"
                }});
                return;
            }

            var code = args[1];
            if(code.length != 4){
                msg.channel.send({embed: {
                    color: 0xff0000,
                    description: "Bad verification code!"
                }});
                return;
            }

            var exist = false;            
            var listLength = db.get("emailList").size().value();
            var list = db.get("emailList").value();
            
            list.forEach(_mail => {
                if(list != null && listLength != 0){
                    if(_mail == email){
                        msg.channel.send({embed: {
                            color: 0xffdd00,
                            description: "**" + email + "** exists in the database!"
                        }});
                        
                        exist = true;
                        return;
                    }
                }
            });      
            
            if(exist){
                return;
            }

            if(db.get("Temp").find({"email": email}).value() == null){
                msg.channel.send({embed: {
                    color: 0xff0000,
                    description: "Bad email!"
                }});
                return;
            }
            //Check code
            if(db.get("Temp").find({"email": email}).value().code == code){
                db.get("emailList").push(email).write();
                msg.channel.send({embed: {
                    color: 0x04ff00,
                    description: "An email (**" + email + "**) has been successfully added to the database"
                }});

                db.get("Temp").remove({"email": email}).write();
            }
            else{
                msg.channel.send({embed: {
                    color: 0xff0000,
                    description: "Bad verification code or email!"
                }});
                return;
            }

        }
    }

    if(command == "send"){
        if(msg.member == null){
            if(!msg.author.id == "329706346826039297"){ //Bot owner ID
                msg.channel.send({embed:{
                    color: 0xff0000,
                    description: "Permission denied!"
                }});
                return;
            }
        }
        else if(!msg.member.roles.find(r=> r.name == "Admin")){
            msg.channel.send({embed:{
                color: 0xff0000,
                description: "Permission denied!"
            }});
            return;
        }

        var listLength = db.get("emailList").size().value();
        var list = db.get("emailList").value();
        if(list != null && listLength != 0){
            var counterOK = 0;
            var counterAll = 0;
            counterAll = list.length;
            
            var clr;
            if(counterAll == counterOK) clr = 0x04ff00
            else clr = 0xffdd00;
            
            var m = msg.channel.send({embed: {
                color: clr,
                description: "**" + counterOK + "** messages of **" + counterAll + "** have been sent"
            }});

            list.forEach(_mail =>{
                const mailOptions = {
                    from: 'marcinkiewicz.kacper@gmail.com', // sender address
                    to: _mail, // list of receivers
                    subject: 'Newsletter', // Subject line
                    html: newsletterHTML// plain text body
                  };
    
                transporter.sendMail(mailOptions, function(err, info){
                    if(err){
                        msg.reply({embed: {
                            color: 0xff0000,
                            description: "Error: \n**"+err+"**"
                        }});
                    }
                    else{
                        counterOK++;
                        m.then(_m =>{
                            if(counterAll == counterOK) clr = 0x04ff00
                            else clr = 0xffdd00;
                            
                            _m.edit({embed: {
                                color: clr,
                                description: "**" + counterOK + "** messages of **" + counterAll + "** have been sent"
                            }});
                        });
                    }
                });
            });
        }
        else{
            msg.channel.send({embed: {
                color: 0xff0000,
                description: "Database is empty!"
            }});
        }
    }

    if(command == "all"){
        if(msg.member == null){
            if(!msg.author.id == "329706346826039297"){ //Bot owner ID
                msg.channel.send({embed:{
                    color: 0xff0000,
                    description: "Permission denied!"
                }});
                return;
            }
            else{
                msg.channel.send("```json\n"+JSON.stringify(db.value(), null, "\t")+ "```");
            }
        }
        else if(msg.member.roles.find(r=> r.name == "Admin")){
            msg.channel.send("```json\n"+JSON.stringify(db.value(), null, "\t")+ "```");
        }
        else{
            msg.channel.send({embed:{
                color: 0xff0000,
                description: "Permission denied!"
            }});
        }
    }

    if(command == "unregister" || command == "delete"){  
        if(args[0] != null){
            if(args[1] == "--force"){
                if(!msg.author.id == "329706346826039297"){ //Bot owner ID
                    msg.channel.send({embed:{
                        color: 0xff0000,
                        description: "Permission denied!"
                    }});
                    return;
                }
                else{
                    //delete from db
                    var indexToDelete = db.get("emailList").indexOf(args[0]).value();
                    if(indexToDelete != -1){
                        if(db.get("emailList").splice(indexToDelete, 1).write() != null){
                            msg.channel.send({embed:{
                                color: 0x04ff00,
                                description: "Successfully removed (**"+ args[0] + "**) from database!"
                            }});
                            db.get("Temp").remove({"email": args[0]}).write();
                        }
                        else{
                            msg.channel.send({embed:{
                                color: 0xff0000,
                                description: "The email could not be deleted!"
                            }});
                        }
                    }
                    else{
                        msg.channel.send({embed:{
                            color: 0xff0000,
                            description: "Email not found!"
                        }});
                    }
                }
            }
            else{                           
                var email = args[0];
                if(!email.includes("@") || email.includes("<") || email.includes(">") || email.startsWith(".")){
                    msg.channel.send({embed: {
                        color: 0xffdd00,
                        description: "**" + email + "** does not look like an email!"
                    }});
                    return;
                }
                                  
                //check is email in db
                var indexToDelete = db.get("emailList").indexOf(args[0]).value();
                if(indexToDelete != -1){
                    var rand1 = Math.floor(Math.random() * 10).toString();
                    var rand2 = Math.floor(Math.random() * 10).toString();
                    var rand3 = Math.floor(Math.random() * 10).toString(); 
                    var rand4 = Math.floor(Math.random() * 10).toString();
                    var random = (rand1 + rand2 + rand3 + rand4).toString();
                    
                    if(db.get("Temp").find({"email": email}).value()){
                        db.get("Temp").find({"email": email}).assign({"email": email, "delCode": random}).write();
                    }else db.get("Temp").push({"email": email, "delCode": random}).write();
        
                    const mailOptions = {
                        from: 'marcinkiewicz.kacper@gmail.com', // sender address
                        to: email, // list of receivers
                        subject: 'Newsletter unregister confirm', // Subject line
                        html: util.format(registerHTML, random) // replace %s (from const) with random code
                    };
                    
                    var m = msg.channel.send({embed: {
                        color: 0xffdd00,
                        description: "Sending email..."
                    }});
        
                    transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                            m.then(_m =>{
                                _m.edit({embed: {
                                    color: 0xff0000,
                                    description: "Error: \n**"+err+"**"
                                }});
                            });
        
                            db.get("Temp").remove({"email": email}).write();
                        }
                        else{
                            m.then(_m =>{
                                _m.edit({embed: {
                                    color: 0x04ff00,
                                    description: "The verification code has been sent. To unregister the email type (example): **>confirmUnregister " + email + " YOUR_CODE_HERE**"
                                }});
                            });                    
                        }
                    });
                }
                else{
                    msg.channel.send({embed:{
                        color: 0xff0000,
                        description: "Email not found!"
                    }});
                    return;
                }
                ///check is email in db
            }
        }
        else{
            msg.channel.send({embed:{
                color: 0xffdd00,
                description: "No email was provided!"
            }});
            return;
        }
    }

    if(command == "confirmUnregister" || command == "confirmDelete"){
        if(args[0] == null || args[1] == null){
            msg.channel.send({embed: {
                color: 0xffdd00,
                description: "You didn't give enough arguments! Example: **>confirmUnregister my.mail@gmail.com 1234**"
            }});
            return;
        }
        else{
            var email = args[0];
            if(!email.includes("@") || email.includes("<") || email.includes(">") || email.startsWith(".")){
                msg.channel.send({embed: {
                    color: 0xffdd00,
                    description: "**" + email + "** does not look like an email!"
                }});
                return;
            }

            var code = args[1];
            if(code.length != 4){
                msg.channel.send({embed: {
                    color: 0xff0000,
                    description: "Bad verification code!"
                }});
                return;
            }

            //Check is email in db
            var indexToDelete = db.get("emailList").indexOf(args[0]).value();
            if(indexToDelete != -1){
                //Check code
                if(db.get("Temp").find({"email": email}).value().delCode == code){
                    if(db.get("emailList").splice(indexToDelete, 1).write() != null){
                        msg.channel.send({embed:{
                            color: 0x04ff00,
                            description: "Successfully removed (**"+ args[0] + "**) from database!"
                        }});
                        db.get("Temp").remove({"email": email}).write();
                    }
                    else{
                        msg.channel.send({embed:{
                            color: 0xff0000,
                            description: "The email could not be deleted!"
                        }});
                    }
                }
                else{
                    msg.channel.send({embed: {
                        color: 0xff0000,
                        description: "Bad verification code or email!"
                    }});
                    return;
                }
            }
            else{
                msg.channel.send({embed:{
                    color: 0xff0000,
                    description: "Email not found!"
                }});
            }
        }
    }

    if(command == "help"){
        msg.channel.send({embed:{
            color: 0xd9d9d9,
            description: "\nTo add your email to the newsletter enter **>register <your email>**. After receiving the verification code, enter **>confirmEmail <your email> <received code>**. \n\nTo delete your email from database enter **>unregister <your email>.** After receiving the verification code, enter **>confirmUnregister <your email> <received code>**. \n\nExamples: \n>register myMail@gmail.com \n>confirmEmail myMail@gmail.com 1234 \n\n**>send** - will send email to all registered users \n**>all** - will show all database"
        }});
    }

});

client.login(config.Token);
