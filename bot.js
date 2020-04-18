const Discord = require("discord.js");
const client = new Discord.Client();
const YTDL = require("ytdl-core");
const fs = require("fs");
const config = require("./config.json");
const prefix = config.prefix;
var apiai = require('apiai');
var app = apiai(config.Dialogflow);
var servers = {};
client.on("ready", () => {
  	console.log("ready");
});
function remove(username, text){
    return text.replace("@" + username + " ", "");
}
function play(connection,message){
  	try {
    	var server = servers[message.guild.id];
    	var songInfo = YTDL.getInfo(server.queue[0]);
		var song = {
		    title: songInfo.title,
		    url: songInfo.video_url,
		};
		console.log(songInfo)
    	server.dispatcher = connection.playStream(YTDL(server.queue[0],{filter:"audioonly"}));
    	server.queue.shift();
    	server.dispatcher.on("end", function(){
    		if(server.queue[0]) play(connection,message);else{
    			connection.disconnect();
    			message.channel.send("song ended");
    		}
    	});
  	}
  	catch (err){
    	message.channel.send("Make sure you are using a youtube url and the correct format. Try again.");
    	var server = servers[message.guild.id];
    	if(message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
    	message.channel.send("stopping music...");
    	server.queue=[];
  	}
}
client.on("ready", () => {``
    client.user.setActivity(` on ${client.guilds.size} servers. (prefix:"`+config.prefix+`")`);
    console.log(`Ready to serve on ${client.guilds.size} servers, for ${client.users.size} users.`);
});
client.on("guildMemberAdd", (member) => {
	try{
    	console.log(`New User "${member.user.username}" has joined "${member.guild.name}"` );
		member.guild.channels.find(c => c.name === "welcome").send(`"${member.user.username}" has joined this server`);
	}
	catch(err){
		console.log("missing welcome chat")
	}
});
client.on("message", (message) => {
	if((message.cleanContent.startsWith("@" + client.user.username) || message.channel.type == 'dm') && client.user.id != message.author.id){
        var mess = remove(client.user.username, message.cleanContent);
        const user = message.author.id;
        var promise = new Promise(function(resolve, reject) {
            var request = app.textRequest(mess, {
                sessionId: user
            });
            request.on('response', function(response) {
                console.log(response);
                var rep = response.result.fulfillment.speech;
                resolve(rep);
            });

            request.on('error', function(error) {
                resolve(null);
            });
            request.end();	
        });

        (async function(){
            var result = await promise;
            if(result){
                message.reply(result);
            } else{
                message.reply("nothing here");
            }
        }());
    }
	if (!message.content.startsWith(config.prefix) || message.author.bot) return;
	const args = message.content.slice(prefix.length).trim().split(/ +/g);
  	const command = args.shift().toLowerCase();
  	switch(command){
  		case "kick" :
  			let member = message.mentions.members.first();
  			let reason = args.slice(1).join(" ");
  			member.kick(reason);
  			break;
  		case "say":
  			let text = args.join(" ");
  			message.channel.send(text);
  			break;
  		case "crash":
  			if(message.author.id === config.botAdminID[0]){
	      		crash();
	    	}else{
	    		message.reply("you cant because you are not an owner");
	    	}
	    	break;
  		case "play":
  			try{
				if(!args[0]){
					message.channel.send("Please specify what you want played.");
				}else{
					if(!message.member.voiceChannel){
						message.channel.send("Please join a voice channel for music to play");
					}else{
						if(!servers[message.guild.id]) servers[message.guild.id]={
							queue :[]
						};
						var server = servers[message.guild.id];
						server.queue.push(args[0]);
						if(!message.guild.voiceConnection) message.member.voiceChannel.join().then(function(connection){
							message.channel.send("Playing...");
							play(connection,message)
						});
					}
				}
			}
			catch(err){
				message.reply("failed to play video. make sure your using the correct stuff");
			}
			break;
		case "skip":
			var server = servers[message.guild.id];		  	
			message.channel.send("Skipping...");
		  	if(server.dispatcher) server.dispatcher.end();
		  	break;
		case "stop":
			var server = servers[message.guild.id];
		  	if(message.guild.voiceConnection) message.guild.voiceConnection.disconnect();
		  	message.channel.send("music stopping...");
		  	break;
		case "purge":
		case "clear":
		case "clearChannel":
			try{
		      	if(message.author.id === config.ownerID || message.channel.permissionsFor(message.author).has("MANAGE_MESSAGES")){
		        	if(args[0]==="all"){
						for(var i = 0;i<5;i++){
							message.channel.bulkDelete(99)
						}
		        	}else if(args[0]<100){
		          		message.channel.bulkDelete(args[0])
		            	.then(messages => message.channel.send(`Deleted ${messages.size} messages`))
		            	.catch( error => message.channel.send("cannot delete message over 14 days old.(or i dont have the perms)"))
		        	}else{
		           		message.channel.sendMessage("specify how much deleted and it must be less than 100 messages at a time");
		        	}
		        }
		    }
		    catch(err){
		      	message.channel.sendMessage("likely missing permissions");
		    }
		   	break;
  	}
});
client.login(config.token);