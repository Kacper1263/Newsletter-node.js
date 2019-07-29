/*
*MIT License
*
*Copyright (c) 2019 Kacper Marcinkiewicz
*
*Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
*
*The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*
*THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


const db = require('quick.db');
const Discord = require("discord.js");
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'email',
        pass: 'password'
    }
});

const client = new Discord.Client();


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
            var list = db.get("emailList");
            if(list != null){
                list.forEach(_mail => {
                    if(_mail == email){
                        msg.channel.send({embed: {
                            color: 0xffdd00,
                            description: "**" + email + "** exists in the database!"
                        }});
                        
                        exist = true;
                        return;
                    }
                });
            }            
            
            if(exist){
                return;
            }

            var rand1 = Math.floor(Math.random() * 10).toString();
            var rand2 = Math.floor(Math.random() * 10).toString();
            var rand3 = Math.floor(Math.random() * 10).toString();
            var rand4 = Math.floor(Math.random() * 10).toString();
            var random = (rand1 + rand2 + rand3 + rand4).toString();
            
            db.set("Temp."+email+"."+"verificationCode", random);

            const mailOptions = {
                from: 'marcinkiewicz.kacper@gmail.com', // sender address
                to: email, // list of receivers
                subject: 'Newsletter confirm', // Subject line
                html: '<p>This is your verification code: <b>'+ random +'</b></p>'// plain text body
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

                    var splitedEmail = email.split("."); //Arguments in DB are separated by "."" so if I need to delete everything before first dot
                    db.delete("Temp."+splitedEmail[0]);
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
            var list = db.get("emailList");
            if(list != null){
                list.forEach(_mail => {
                    if(_mail == email){
                        msg.channel.send({embed: {
                            color: 0xffdd00,
                            description: "**" + email + "** exists in the database!"
                        }});
                        exist = true;
                        return;
                    }
                });
            }            
            
            if(exist){
                return;
            }

            
            //Check code
            if(db.get("Temp."+email+"."+"verificationCode") == code){
                db.push("emailList", email)
                msg.channel.send({embed: {
                    color: 0x04ff00,
                    description: "An email (**" + email + "**) has been successfully added to the database"
                }});

                var splitedEmail = email.split("."); //Arguments in DB are separated by "."" so if I need to delete everything before first dot
                db.delete("Temp."+splitedEmail[0]);
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
        if(!msg.member.roles.find(r=> r.name == "Admin")){
            msg.channel.send({embed:{
                color: 0xff0000,
                description: "Permission denied!"
            }});
            return;
        }

        var list = db.get("emailList");
        if(list != null){
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
                    html: '<p>This is newsletter</p>'// plain text body
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
        if(msg.member.roles.find(r=> r.name == "Admin")){
            msg.channel.send("```json\n"+JSON.stringify(db.all(), null, "\t")+ "```");
        }
        else{
            msg.channel.send({embed:{
                color: 0xff0000,
                description: "Permission denied!"
            }});
        }
    }

    if(command == "help"){
        msg.reply("To add your email to the newsletter enter **>register <your email>**. After receiving the verification code, enter **>confirmEmail <your email> <received code>**. \n\nExamples: \n>register myMail@gmail.com \n>confirmEmail myMail@gmail.com 1234 \n\n**>send** - will send email to all registered users \n**>all** - will show all database");
    }

});

client.login("TOKEN");
