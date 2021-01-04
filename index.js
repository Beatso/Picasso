const express = require("express")
const dotenv = require("dotenv")
const Discord = require("discord.js")
const scalePixelArt = require("scale-pixel-art")
const request = require("request").defaults({ encoding: null })

dotenv.config()

const client = new Discord.Client()

client.once("ready", ()=>{
	console.log("bot running")
	client.user.setActivity("beatso.tk/project/picasso", {type:"WATCHING"})
})
client.login(process.env.bottoken)

client.on("message", message => {
	
	if (
		!message.content.startsWith(`<@${client.user.id}>`) &&
		!message.content.startsWith(`<@!${client.user.id}>`)
	) return

	if (message.author.bot) return
	
	if (message.reference) scaleAndSend ( message.referencedMessage.attachments.first(), message.channel )
	else inputAttachment = scaleAndSend (message.attachments.first(), message.channel )
	

})

const scaleAndSend = (inputAttachment, channel) => {

	if (inputAttachment==undefined) {
		
		channel.send("There was no attachment on that message.\nPing me in a message with an image, or ping the bot in a reply to an image to scale it.")
		return
	}

	const inputAttachmentURL = inputAttachment.url

	request.get(inputAttachmentURL, (err, res, inputBuffer) => {
		
		scalePixelArt(inputBuffer, 20)
			.then(outputBuffer => {
				const outputAttachment = new Discord.MessageAttachment(outputBuffer, "response.png")
				if (Buffer.byteLength(outputBuffer) <= 8000000) {
					channel.send(outputAttachment)
						.catch(error => channel.send(`Sending the scaled image failed for the following reason:\n\`${error}\``))
				} else channel.send("Could not send the scaled image because the file size was too big.")
			})
			.catch(error => channel.send(`Scaling the image failed for the following reason:\n\`${error}\``))
		
	})
	
}

// webserver to keep alive
const server = express()
server.all("/keepalive", (req,res) => res.send("Bot woken"))
server.listen(1193, ()=>console.log("server running"))
