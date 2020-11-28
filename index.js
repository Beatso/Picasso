const express = require("express")
const dotenv = require("dotenv")
const Discord = require("discord.js")
const scaleImage = require("./scale")
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
	

	// if (message.reference) console.log( message.referencedMessage.attachments.first().url)

	if (message.reference) scaleAndSend ( message.referencedMessage.attachments.first(), message.channel )
	else inputAttachment = scaleAndSend (message.attachments.first(), message.channel )
	

})

const scaleAndSend = (inputAttachment, channel) => {

	if (inputAttachment==undefined) {
		
		channel.send("There was no attachment on that message.\nPing me in a message with an image, or ping the bot in a reply to an image to scale it.")
		return
	}

	const inputAttachmentURL = inputAttachment.url

	request.get(inputAttachmentURL, (err, res, body) => {
		scaleImage(body)
			.then(buffer => {
				const outputAttachment = new Discord.MessageAttachment(buffer, "response.png")
				channel.send(outputAttachment)
			})
			.catch(error => {
				channel.send(`There was an error trying to do that:\n\`${error}\``)
				// console.error(error)
			})
	})

}

// webserver to keep alive
const server = express()
server.all("/keepalive", (req,res) => res.send("Bot woken"))
server.listen(3000, ()=>console.log("server running"))
